import type {
	GitHubPullRequestWebhookPayload,
	PullReviewJob,
} from "@ai-code-review/shared";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../app";
import { createGitHubSignature } from "../github/github-webhook";

const webhookSecret = "route-secret";
const pullRequestPayload: GitHubPullRequestWebhookPayload = {
	action: "opened",
	installation: {
		id: 99,
	},
	pull_request: {
		number: 7,
		head: {
			sha: "deadbeefcafebabe",
		},
	},
	repository: {
		name: "PullSense",
		owner: {
			login: "Nitish27",
		},
	},
};

describe("/webhook", () => {
	it("enqueues a supported signed pull_request event", async () => {
		const enqueueReviewJob = vi.fn<(job: PullReviewJob) => Promise<void>>(
			async () => undefined,
		);
		const body = JSON.stringify(pullRequestPayload);
		const app = await createApp({
			reviewQueue: {
				enqueueReviewJob,
			},
			webhookSecret,
		});

		const response = await app.inject({
			method: "POST",
			url: "/webhook",
			headers: {
				"x-github-event": "pull_request",
				"x-hub-signature-256": createGitHubSignature(webhookSecret, body),
				"content-type": "application/json",
			},
			payload: body,
		});

		expect(response.statusCode).toBe(202);
		expect(response.json()).toEqual({
			status: "accepted",
		});
		expect(enqueueReviewJob).toHaveBeenCalledWith({
			action: "opened",
			headSha: "deadbeefcafebabe",
			installationId: 99,
			owner: "Nitish27",
			pullNumber: 7,
			repository: "PullSense",
		});
	});

	it("rejects a webhook with an invalid signature", async () => {
		const enqueueReviewJob = vi.fn<(job: PullReviewJob) => Promise<void>>(
			async () => undefined,
		);
		const app = await createApp({
			reviewQueue: {
				enqueueReviewJob,
			},
			webhookSecret,
		});

		const response = await app.inject({
			method: "POST",
			url: "/webhook",
			headers: {
				"x-github-event": "pull_request",
				"x-hub-signature-256": "sha256=invalid",
				"content-type": "application/json",
			},
			payload: JSON.stringify(pullRequestPayload),
		});

		expect(response.statusCode).toBe(401);
		expect(response.json()).toEqual({
			error: "Invalid GitHub webhook signature",
		});
		expect(enqueueReviewJob).not.toHaveBeenCalled();
	});

	it("ignores unsupported GitHub events without queueing work", async () => {
		const enqueueReviewJob = vi.fn<(job: PullReviewJob) => Promise<void>>(
			async () => undefined,
		);
		const body = JSON.stringify(pullRequestPayload);
		const app = await createApp({
			reviewQueue: {
				enqueueReviewJob,
			},
			webhookSecret,
		});

		const response = await app.inject({
			method: "POST",
			url: "/webhook",
			headers: {
				"x-github-event": "push",
				"x-hub-signature-256": createGitHubSignature(webhookSecret, body),
				"content-type": "application/json",
			},
			payload: body,
		});

		expect(response.statusCode).toBe(202);
		expect(response.json()).toEqual({
			status: "ignored",
		});
		expect(enqueueReviewJob).not.toHaveBeenCalled();
	});
});
