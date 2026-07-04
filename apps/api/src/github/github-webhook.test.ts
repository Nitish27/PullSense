import type { GitHubPullRequestWebhookPayload } from "@ai-code-review/shared";
import { describe, expect, it } from "vitest";

import {
	createGitHubSignature,
	getPullReviewJobFromWebhook,
	verifyGitHubWebhookSignature,
} from "./github-webhook";

const secret = "super-secret";
const basePayload: GitHubPullRequestWebhookPayload = {
	action: "opened",
	installation: {
		id: 42,
	},
	pull_request: {
		number: 18,
		head: {
			sha: "abc123def456",
		},
	},
	repository: {
		name: "PullSense",
		owner: {
			login: "Nitish27",
		},
	},
};

describe("verifyGitHubWebhookSignature", () => {
	it("accepts a valid GitHub sha256 signature", () => {
		const body = JSON.stringify(basePayload);
		const signature = createGitHubSignature(secret, body);

		expect(verifyGitHubWebhookSignature(secret, body, signature)).toBe(true);
	});

	it("rejects an invalid GitHub sha256 signature", () => {
		const body = JSON.stringify(basePayload);

		expect(verifyGitHubWebhookSignature(secret, body, "sha256=deadbeef")).toBe(
			false,
		);
	});
});

describe("getPullReviewJobFromWebhook", () => {
	it("normalizes a supported pull_request event into a review job", () => {
		expect(getPullReviewJobFromWebhook("pull_request", basePayload)).toEqual({
			action: "opened",
			headSha: "abc123def456",
			installationId: 42,
			owner: "Nitish27",
			pullNumber: 18,
			repository: "PullSense",
		});
	});

	it("ignores unsupported GitHub events", () => {
		expect(getPullReviewJobFromWebhook("push", basePayload)).toBeNull();
	});

	it("ignores unsupported pull_request actions", () => {
		expect(
			getPullReviewJobFromWebhook("pull_request", {
				...basePayload,
				action: "closed",
			}),
		).toBeNull();
	});
});
