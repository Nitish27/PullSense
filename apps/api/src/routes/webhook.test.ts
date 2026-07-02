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

function createQueuedReviewRunRecord(id: number) {
	const now = new Date("2026-07-03T11:00:00.000Z");

	return {
		checkRunId: null,
		commentId: null,
		commentUrl: null,
		completedAt: null,
		conclusion: null,
		createdAt: now,
		errorMessage: null,
		headSha: "deadbeefcafebabe",
		id,
		inlineReviewId: null,
		inlineReviewUrl: null,
		installationId: 99,
		overallSeverity: null,
		owner: "Nitish27",
		pullNumber: 7,
		pullRequestAction: "opened" as const,
		repository: "PullSense",
		startedAt: null,
		status: "queued" as const,
		summary: null,
		updatedAt: now,
	};
}

function createReviewRunStore(
	createQueuedReviewRun: () => Promise<
		ReturnType<typeof createQueuedReviewRunRecord>
	>,
) {
	return {
		createQueuedReviewRun,
		getLatestReviewRunForPullRequest: vi.fn(async () => null),
		getReviewRunById: vi.fn(async () => null),
		listReviewRunsForPullRequest: vi.fn(async () => []),
		markReviewRunCompleted: vi.fn(async () => undefined),
		markReviewRunFailed: vi.fn(async () => undefined),
		markReviewRunInProgress: vi.fn(async () => undefined),
	};
}

describe("/webhook", () => {
	it("enqueues a supported signed pull_request event", async () => {
		const enqueueReviewJob = vi.fn<(job: PullReviewJob) => Promise<void>>(
			async () => undefined,
		);
		const createQueuedReviewRun = vi.fn(async () =>
			createQueuedReviewRunRecord(321),
		);
		const body = JSON.stringify(pullRequestPayload);
		const app = await createApp({
			reviewQueue: {
				enqueueReviewJob,
			},
			reviewRunStore: createReviewRunStore(createQueuedReviewRun),
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
		expect(createQueuedReviewRun).toHaveBeenCalledWith({
			headSha: "deadbeefcafebabe",
			installationId: 99,
			owner: "Nitish27",
			pullNumber: 7,
			pullRequestAction: "opened",
			repository: "PullSense",
		});
		expect(enqueueReviewJob).toHaveBeenCalledWith({
			action: "opened",
			headSha: "deadbeefcafebabe",
			installationId: 99,
			owner: "Nitish27",
			pullNumber: 7,
			reviewRunId: 321,
			repository: "PullSense",
		});
	});

	it("rejects a webhook with an invalid signature", async () => {
		const enqueueReviewJob = vi.fn<(job: PullReviewJob) => Promise<void>>(
			async () => undefined,
		);
		const createQueuedReviewRun = vi.fn(async () =>
			createQueuedReviewRunRecord(321),
		);
		const app = await createApp({
			reviewQueue: {
				enqueueReviewJob,
			},
			reviewRunStore: createReviewRunStore(createQueuedReviewRun),
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
		expect(createQueuedReviewRun).not.toHaveBeenCalled();
		expect(enqueueReviewJob).not.toHaveBeenCalled();
	});

	it("ignores unsupported GitHub events without queueing work", async () => {
		const enqueueReviewJob = vi.fn<(job: PullReviewJob) => Promise<void>>(
			async () => undefined,
		);
		const createQueuedReviewRun = vi.fn(async () =>
			createQueuedReviewRunRecord(321),
		);
		const body = JSON.stringify(pullRequestPayload);
		const app = await createApp({
			reviewQueue: {
				enqueueReviewJob,
			},
			reviewRunStore: createReviewRunStore(createQueuedReviewRun),
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
		expect(createQueuedReviewRun).not.toHaveBeenCalled();
		expect(enqueueReviewJob).not.toHaveBeenCalled();
	});
});
