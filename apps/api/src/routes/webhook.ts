import type { GitHubPullRequestWebhookPayload } from "@ai-code-review/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ReviewRunStore } from "../db/review-runs";
import {
	getPullReviewJobFromWebhook,
	verifyGitHubWebhookSignature,
} from "../github/github-webhook";
import type { ReviewQueue } from "../queue/review-queue";

type RegisterWebhookRoutesOptions = {
	createCheckRun(input: {
		headSha: string;
		installationId: number;
		owner: string;
		repository: string;
		status: "queued" | "in_progress";
		summary: string;
		title: string;
	}): Promise<{ id: number } | null>;
	reviewQueue: ReviewQueue;
	reviewRunStore: ReviewRunStore;
	webhookSecret: string;
};

type RawBodyRequest = FastifyRequest & {
	rawBody?: string;
};

export function registerWebhookRoutes(
	app: FastifyInstance,
	options: RegisterWebhookRoutesOptions,
) {
	app.post(
		"/webhook",
		{
			config: {
				rawBody: true,
			},
		},
		async (request, reply) => {
			const rawRequest = request as RawBodyRequest;
			const rawBody =
				typeof rawRequest.rawBody === "string" && rawRequest.rawBody.length > 0
					? rawRequest.rawBody
					: JSON.stringify(request.body ?? {});
			const signatureHeader = request.headers["x-hub-signature-256"];
			const eventHeader = request.headers["x-github-event"];
			const eventName =
				typeof eventHeader === "string" ? eventHeader : undefined;
			const signature =
				typeof signatureHeader === "string" ? signatureHeader : undefined;

			if (
				!verifyGitHubWebhookSignature(options.webhookSecret, rawBody, signature)
			) {
				app.log.warn(
					{
						eventName,
					},
					"Rejected GitHub webhook with invalid signature",
				);

				return reply
					.code(401)
					.send({ error: "Invalid GitHub webhook signature" });
			}

			const payload = JSON.parse(rawBody) as GitHubPullRequestWebhookPayload;
			const reviewJob = getPullReviewJobFromWebhook(eventName, payload);

			if (!reviewJob) {
				app.log.info(
					{
						action: payload.action,
						eventName,
					},
					"Ignored GitHub webhook event",
				);

				return reply.code(202).send({ status: "ignored" });
			}

			const latestReviewRun =
				await options.reviewRunStore.getLatestReviewRunForPullRequest({
					owner: reviewJob.owner,
					pullNumber: reviewJob.pullNumber,
					repository: reviewJob.repository,
				});

			if (
				latestReviewRun &&
				latestReviewRun.headSha === reviewJob.headSha &&
				latestReviewRun.status !== "failed"
			) {
				app.log.info(
					{
						action: reviewJob.action,
						eventName,
						headSha: reviewJob.headSha,
						installationId: reviewJob.installationId,
						owner: reviewJob.owner,
						pullNumber: reviewJob.pullNumber,
						repository: reviewJob.repository,
						reviewRunId: latestReviewRun.id,
						status: latestReviewRun.status,
					},
					"Skipped duplicate GitHub webhook for an already-reviewed head sha",
				);

				return reply.code(202).send({
					reviewRunId: latestReviewRun.id,
					status: "duplicate",
				});
			}

			const reviewRun = await options.reviewRunStore.createQueuedReviewRun({
				headSha: reviewJob.headSha,
				installationId: reviewJob.installationId,
				owner: reviewJob.owner,
				pullNumber: reviewJob.pullNumber,
				pullRequestAction: reviewJob.action,
				repository: reviewJob.repository,
			});
			try {
				const checkRun = await options.createCheckRun({
					headSha: reviewJob.headSha,
					installationId: reviewJob.installationId,
					owner: reviewJob.owner,
					repository: reviewJob.repository,
					status: "queued",
					summary: "PullSense queued this pull request for AI review.",
					title: "Review queued",
				});

				if (checkRun) {
					await options.reviewRunStore.attachCheckRunToReviewRun({
						checkRunId: checkRun.id,
						reviewRunId: reviewRun.id,
					});
				}
			} catch (error) {
				app.log.warn(
					{
						error,
						installationId: reviewJob.installationId,
						owner: reviewJob.owner,
						pullNumber: reviewJob.pullNumber,
						repository: reviewJob.repository,
						reviewRunId: reviewRun.id,
					},
					"Failed to create queued GitHub check run",
				);
			}

			await options.reviewQueue.enqueueReviewJob({
				...reviewJob,
				reviewRunId: reviewRun.id,
			});

			app.log.info(
				{
					action: reviewJob.action,
					eventName,
					installationId: reviewJob.installationId,
					owner: reviewJob.owner,
					pullNumber: reviewJob.pullNumber,
					reviewRunId: reviewRun.id,
					repository: reviewJob.repository,
				},
				"Accepted GitHub webhook and enqueued review job",
			);

			return reply.code(202).send({ status: "accepted" });
		},
	);
}
