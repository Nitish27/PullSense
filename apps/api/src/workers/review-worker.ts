import {
	buildInlineReviewSignature,
	buildPullRequestReviewComments,
	fetchPullRequestFilesForInstallation,
	formatInlineReviewBodyWithSignature,
	type PullRequestFilesInput,
	type PullRequestFilesResult,
	postPullRequestCommentForInstallation,
	postPullRequestReviewForInstallation,
	readGitHubAppConfigFromEnv,
	updateCheckRunForInstallation,
} from "@ai-code-review/github";
import {
	createGeminiReviewGenerator,
	reviewPullRequest as generatePullRequestReview,
} from "@ai-code-review/reviewer";
import type {
	PullRequestReview,
	PullRequestReviewInput,
	PullReviewJob,
} from "@ai-code-review/shared";
import { Worker } from "bullmq";

import type { ReviewRunStore } from "../db/review-runs";
import { getApiEnv } from "../env";
import { createRedisConnection, reviewQueueName } from "../queue/review-queue";

type ReviewWorkerDependencies = {
	fetchPullRequestFilesForInstallation(
		input: PullRequestFilesInput & { installationId: number },
	): Promise<PullRequestFilesResult>;
	getReviewRunById(reviewRunId: number): Promise<{
		checkRunId: number | null;
	} | null>;
	markReviewRunCompleted(input: {
		commentId: number;
		commentUrl: string | null;
		completedAt: Date;
		inlineReviewId: number | null;
		inlineReviewUrl: string | null;
		overallSeverity: PullRequestReview["overallSeverity"];
		reviewRunId: number;
		summary: string;
	}): Promise<void>;
	markReviewRunFailed(input: {
		completedAt: Date;
		errorMessage: string;
		reviewRunId: number;
	}): Promise<void>;
	markReviewRunInProgress(input: { reviewRunId: number }): Promise<void>;
	postPullRequestComment(input: {
		body: string;
		installationId: number;
		owner: string;
		pullNumber: number;
		repository: string;
	}): Promise<{
		htmlUrl?: string;
		id: number;
	}>;
	postPullRequestReview(input: {
		body: string;
		comments: Array<{
			body: string;
			line: number;
			path: string;
			side: "RIGHT";
		}>;
		installationId: number;
		owner: string;
		pullNumber: number;
		repository: string;
	}): Promise<{
		htmlUrl?: string;
		id: number;
	}>;
	reviewPullRequest(input: PullRequestReviewInput): Promise<PullRequestReview>;
	logger: {
		info(payload: unknown, message?: string): void;
		warn(payload: unknown, message?: string): void;
	};
	updateCheckRun(input: {
		checkRunId: number;
		conclusion?: "success" | "failure" | "neutral" | "skipped";
		detailsUrl?: string;
		installationId: number;
		owner: string;
		repository: string;
		status: "queued" | "in_progress" | "completed";
		summary: string;
		title: string;
	}): Promise<void>;
};

type ReviewProcessingStage =
	| "fetch_pull_request_files"
	| "generate_review"
	| "post_summary_comment"
	| "post_inline_review";

type ReviewJobAttemptContext = {
	attemptNumber?: number;
	maxAttempts?: number;
};

const pullSenseSummaryMarker = "<!-- pullsense:summary -->";

export async function processReviewJob(
	job: PullReviewJob,
	dependencies: ReviewWorkerDependencies,
	attemptContext: ReviewJobAttemptContext = {},
) {
	const reviewRun = await dependencies.getReviewRunById(job.reviewRunId);
	const attemptNumber = attemptContext.attemptNumber ?? 1;
	const maxAttempts = attemptContext.maxAttempts ?? 1;
	const hasRemainingAttempts = attemptNumber < maxAttempts;

	await syncCheckRunSafely(
		reviewRun?.checkRunId ?? null,
		{
			installationId: job.installationId,
			owner: job.owner,
			repository: job.repository,
			status: "in_progress",
			summary: "PullSense is reviewing the latest pull request changes.",
			title: "Review in progress",
		},
		dependencies,
	);
	await dependencies.markReviewRunInProgress({
		reviewRunId: job.reviewRunId,
	});

	try {
		const files = await runReviewStep("fetch_pull_request_files", async () =>
			dependencies.fetchPullRequestFilesForInstallation({
				installationId: job.installationId,
				owner: job.owner,
				pullNumber: job.pullNumber,
				repository: job.repository,
			}),
		);
		const review = await runReviewStep("generate_review", async () =>
			dependencies.reviewPullRequest({
				files,
				headSha: job.headSha,
				owner: job.owner,
				pullNumber: job.pullNumber,
				repository: job.repository,
			}),
		);
		const comment = await runReviewStep("post_summary_comment", async () =>
			dependencies.postPullRequestComment({
				body: formatPullRequestReviewComment(review),
				installationId: job.installationId,
				owner: job.owner,
				pullNumber: job.pullNumber,
				repository: job.repository,
			}),
		);
		const inlineReviewComments = buildPullRequestReviewComments(
			files,
			review.inlineFindings.filter((finding) => finding.confidence === "high"),
		);
		const inlineReview =
			inlineReviewComments.length > 0
				? await runReviewStep("post_inline_review", async () =>
						dependencies.postPullRequestReview({
							body: formatInlineReviewBodyWithSignature(
								formatInlinePullRequestReviewBody(review),
								buildInlineReviewSignature(inlineReviewComments),
							),
							comments: inlineReviewComments,
							installationId: job.installationId,
							owner: job.owner,
							pullNumber: job.pullNumber,
							repository: job.repository,
						}),
					)
				: null;
		await syncCheckRunSafely(
			reviewRun?.checkRunId ?? null,
			{
				conclusion: "success",
				detailsUrl: comment.htmlUrl,
				installationId: job.installationId,
				owner: job.owner,
				repository: job.repository,
				status: "completed",
				summary: review.summary,
				title: "Review completed",
			},
			dependencies,
		);

		await dependencies.markReviewRunCompleted({
			commentId: comment.id,
			commentUrl: comment.htmlUrl ?? null,
			completedAt: new Date(),
			inlineReviewId: inlineReview?.id ?? null,
			inlineReviewUrl: inlineReview?.htmlUrl ?? null,
			overallSeverity: review.overallSeverity,
			reviewRunId: job.reviewRunId,
			summary: review.summary,
		});

		const result = {
			comment,
			fileCount: files.length,
			files,
			inlineReview,
			job,
			review,
		};

		dependencies.logger.info(
			{
				commentId: comment.id,
				fileCount: result.fileCount,
				installationId: job.installationId,
				inlineReviewId: inlineReview?.id,
				owner: job.owner,
				overallSeverity: review.overallSeverity,
				pullNumber: job.pullNumber,
				repository: job.repository,
				reviewRunId: job.reviewRunId,
			},
			"Posted pull request review summary",
		);

		return result;
	} catch (error) {
		const reviewFailure = normalizeReviewFailure(error);

		if (hasRemainingAttempts) {
			const retryMessage = formatRetryingFailureMessage(
				reviewFailure,
				attemptNumber,
				maxAttempts,
			);

			dependencies.logger.warn(
				{
					attemptNumber,
					error: reviewFailure.cause,
					errorMessage: reviewFailure.message,
					installationId: job.installationId,
					maxAttempts,
					owner: job.owner,
					pullNumber: job.pullNumber,
					repository: job.repository,
					reviewRunId: job.reviewRunId,
					stage: reviewFailure.stage,
				},
				"Review attempt failed and will retry",
			);
			await syncCheckRunSafely(
				reviewRun?.checkRunId ?? null,
				{
					installationId: job.installationId,
					owner: job.owner,
					repository: job.repository,
					status: "in_progress",
					summary: retryMessage,
					title: "Retry scheduled",
				},
				dependencies,
			);

			throw reviewFailure;
		}

		const finalFailureMessage = formatFinalFailureMessage(
			reviewFailure,
			attemptNumber,
			maxAttempts,
		);

		dependencies.logger.warn(
			{
				attemptNumber,
				error: reviewFailure.cause,
				errorMessage: reviewFailure.message,
				installationId: job.installationId,
				maxAttempts,
				owner: job.owner,
				pullNumber: job.pullNumber,
				repository: job.repository,
				reviewRunId: job.reviewRunId,
				stage: reviewFailure.stage,
			},
			"Review worker exhausted all retry attempts",
		);
		await syncCheckRunSafely(
			reviewRun?.checkRunId ?? null,
			{
				conclusion: "failure",
				installationId: job.installationId,
				owner: job.owner,
				repository: job.repository,
				status: "completed",
				summary: finalFailureMessage,
				title: "Review failed",
			},
			dependencies,
		);
		await dependencies.markReviewRunFailed({
			completedAt: new Date(),
			errorMessage: finalFailureMessage,
			reviewRunId: job.reviewRunId,
		});

		throw reviewFailure;
	}
}

export function createReviewWorker(options?: {
	reviewRunStore: ReviewRunStore;
}) {
	const env = getApiEnv();
	const geminiReviewConfig = readGeminiReviewConfigFromEnv(env);
	const githubAppConfig = readGitHubAppConfigFromEnv(env);
	const connection = createRedisConnection(env.REDIS_URL);
	const generateReview = createGeminiReviewGenerator({
		apiKey: geminiReviewConfig.apiKey,
	});

	return new Worker<PullReviewJob>(
		reviewQueueName,
		async (job) =>
			processReviewJob(
				job.data,
				{
					fetchPullRequestFilesForInstallation: (input) =>
						fetchPullRequestFilesForInstallation(githubAppConfig, input),
					getReviewRunById: (reviewRunId) =>
						options?.reviewRunStore.getReviewRunById(reviewRunId) ??
						Promise.resolve(null),
					markReviewRunCompleted: (input) =>
						options?.reviewRunStore.markReviewRunCompleted(input) ??
						Promise.resolve(),
					markReviewRunFailed: (input) =>
						options?.reviewRunStore.markReviewRunFailed(input) ??
						Promise.resolve(),
					markReviewRunInProgress: (input) =>
						options?.reviewRunStore.markReviewRunInProgress(input) ??
						Promise.resolve(),
					postPullRequestComment: (input) =>
						postPullRequestCommentForInstallation(githubAppConfig, input),
					postPullRequestReview: (input) =>
						postPullRequestReviewForInstallation(githubAppConfig, {
							commitId: job.data.headSha,
							event: "COMMENT",
							...input,
						}),
					reviewPullRequest: (input) =>
						generatePullRequestReview(input, {
							generateReview,
							model: geminiReviewConfig.model,
						}),
					logger: console,
					updateCheckRun: (input) =>
						updateCheckRunForInstallation(githubAppConfig, {
							...input,
							installationId: input.installationId,
						}).then(() => undefined),
				},
				{
					attemptNumber: job.attemptsMade + 1,
					maxAttempts: resolveReviewJobMaxAttempts(job.opts.attempts),
				},
			),
		{
			connection,
		},
	);
}

async function syncCheckRunSafely(
	checkRunId: number | null,
	input: {
		conclusion?: "success" | "failure" | "neutral" | "skipped";
		detailsUrl?: string;
		installationId: number;
		owner: string;
		repository: string;
		status: "queued" | "in_progress" | "completed";
		summary: string;
		title: string;
	},
	dependencies: ReviewWorkerDependencies,
) {
	if (!checkRunId) {
		return;
	}

	try {
		await dependencies.updateCheckRun({
			...input,
			checkRunId,
		});
	} catch (error) {
		dependencies.logger.warn(
			{
				checkRunId,
				error,
				installationId: input.installationId,
				owner: input.owner,
				repository: input.repository,
				status: input.status,
			},
			"Failed to update GitHub check run",
		);
	}
}

class ReviewProcessingError extends Error {
	constructor(
		readonly stage: ReviewProcessingStage,
		readonly cause: unknown,
		message: string,
	) {
		super(message);
		this.name = "ReviewProcessingError";
	}
}

async function runReviewStep<T>(
	stage: ReviewProcessingStage,
	callback: () => Promise<T>,
) {
	try {
		return await callback();
	} catch (error) {
		if (error instanceof ReviewProcessingError) {
			throw error;
		}

		const message = error instanceof Error ? error.message : String(error);

		throw new ReviewProcessingError(stage, error, message);
	}
}

function normalizeReviewFailure(error: unknown) {
	if (error instanceof ReviewProcessingError) {
		return error;
	}

	const message = error instanceof Error ? error.message : String(error);

	return new ReviewProcessingError("generate_review", error, message);
}

function formatRetryingFailureMessage(
	error: ReviewProcessingError,
	attemptNumber: number,
	maxAttempts: number,
) {
	return truncateCheckRunSummary(
		`Attempt ${attemptNumber} of ${maxAttempts} failed during ${formatReviewStage(error.stage)}: ${error.message}. PullSense will retry automatically.`,
	);
}

function formatFinalFailureMessage(
	error: ReviewProcessingError,
	attemptNumber: number,
	maxAttempts: number,
) {
	return truncateCheckRunSummary(
		`Review failed during ${formatReviewStage(error.stage)} after ${attemptNumber} of ${maxAttempts} attempts: ${error.message}`,
	);
}

function formatReviewStage(stage: ReviewProcessingStage) {
	return stage.replaceAll("_", " ");
}

function resolveReviewJobMaxAttempts(attempts: number | undefined) {
	return attempts && attempts > 0 ? attempts : 1;
}

function truncateCheckRunSummary(summary: string) {
	const maximumSummaryLength = 65_000;

	if (summary.length <= maximumSummaryLength) {
		return summary;
	}

	return `${summary.slice(0, maximumSummaryLength - 16)}...[truncated]`;
}

export function formatPullRequestReviewComment(review: PullRequestReview) {
	const findings =
		review.issues.length === 0
			? "- No actionable issues found in the changed files I reviewed."
			: review.issues
					.map((issue, index) => {
						const location = issue.file ? ` (${issue.file})` : "";

						return [
							`${index + 1}. **[${issue.severity.toUpperCase()}] ${issue.title}**${location}`,
							issue.body,
						].join("\n");
					})
					.join("\n\n");

	return [
		pullSenseSummaryMarker,
		"## PullSense review",
		"",
		`Overall severity: **${review.overallSeverity.toUpperCase()}**`,
		"",
		review.summary,
		"",
		"### Findings",
		findings,
	].join("\n");
}

export function formatInlinePullRequestReviewBody(review: PullRequestReview) {
	return [
		"## PullSense inline review",
		"",
		review.summary,
		"",
		"Only high-confidence findings with valid diff anchors are included below.",
	].join("\n");
}

function readGeminiReviewConfigFromEnv(env: {
	GEMINI_API_KEY?: string;
	GEMINI_MODEL: string;
}) {
	if (!env.GEMINI_API_KEY) {
		throw new Error("Missing Gemini API key");
	}

	return {
		apiKey: env.GEMINI_API_KEY,
		model: env.GEMINI_MODEL,
	};
}
