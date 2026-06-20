import type { GitHubPullRequestWebhookPayload } from "@ai-code-review/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";

import {
	getPullReviewJobFromWebhook,
	verifyGitHubWebhookSignature,
} from "../github/github-webhook";
import type { ReviewQueue } from "../queue/review-queue";

type RegisterWebhookRoutesOptions = {
	reviewQueue: ReviewQueue;
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

			await options.reviewQueue.enqueueReviewJob(reviewJob);

			app.log.info(
				{
					action: reviewJob.action,
					eventName,
					installationId: reviewJob.installationId,
					owner: reviewJob.owner,
					pullNumber: reviewJob.pullNumber,
					repository: reviewJob.repository,
				},
				"Accepted GitHub webhook and enqueued review job",
			);

			return reply.code(202).send({ status: "accepted" });
		},
	);
}
