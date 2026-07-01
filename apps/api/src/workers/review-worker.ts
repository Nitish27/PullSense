import {
	buildPullRequestReviewComments,
	fetchPullRequestFilesForInstallation,
	type PullRequestFilesInput,
	type PullRequestFilesResult,
	postPullRequestCommentForInstallation,
	postPullRequestReviewForInstallation,
	readGitHubAppConfigFromEnv,
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

import { getApiEnv } from "../env";
import { createRedisConnection, reviewQueueName } from "../queue/review-queue";

type ReviewWorkerDependencies = {
	fetchPullRequestFilesForInstallation(
		input: PullRequestFilesInput & { installationId: number },
	): Promise<PullRequestFilesResult>;
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
	};
};

export async function processReviewJob(
	job: PullReviewJob,
	dependencies: ReviewWorkerDependencies,
) {
	const files = await dependencies.fetchPullRequestFilesForInstallation({
		installationId: job.installationId,
		owner: job.owner,
		pullNumber: job.pullNumber,
		repository: job.repository,
	});
	const review = await dependencies.reviewPullRequest({
		files,
		headSha: job.headSha,
		owner: job.owner,
		pullNumber: job.pullNumber,
		repository: job.repository,
	});
	const comment = await dependencies.postPullRequestComment({
		body: formatPullRequestReviewComment(review),
		installationId: job.installationId,
		owner: job.owner,
		pullNumber: job.pullNumber,
		repository: job.repository,
	});
	const inlineReviewComments = buildPullRequestReviewComments(
		files,
		review.inlineFindings.filter((finding) => finding.confidence === "high"),
	);
	const inlineReview =
		inlineReviewComments.length > 0
			? await dependencies.postPullRequestReview({
					body: formatInlinePullRequestReviewBody(review),
					comments: inlineReviewComments,
					installationId: job.installationId,
					owner: job.owner,
					pullNumber: job.pullNumber,
					repository: job.repository,
				})
			: null;

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
		},
		"Posted pull request review summary",
	);

	return result;
}

export function createReviewWorker() {
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
			processReviewJob(job.data, {
				fetchPullRequestFilesForInstallation: (input) =>
					fetchPullRequestFilesForInstallation(githubAppConfig, input),
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
			}),
		{
			connection,
		},
	);
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
