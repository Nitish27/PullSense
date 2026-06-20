import { createHmac, timingSafeEqual } from "node:crypto";

import type {
	GitHubPullRequestAction,
	GitHubPullRequestWebhookPayload,
	PullReviewJob,
} from "@ai-code-review/shared";

const supportedPullRequestActions = new Set<GitHubPullRequestAction>([
	"opened",
	"synchronize",
]);

export function createGitHubSignature(secret: string, body: string) {
	const digest = createHmac("sha256", secret).update(body).digest("hex");

	return `sha256=${digest}`;
}

export function verifyGitHubWebhookSignature(
	secret: string,
	body: string,
	signatureHeader: string | undefined,
) {
	if (!signatureHeader) {
		return false;
	}

	const expectedSignature = createGitHubSignature(secret, body);
	const expectedBuffer = Buffer.from(expectedSignature);
	const actualBuffer = Buffer.from(signatureHeader);

	if (expectedBuffer.length !== actualBuffer.length) {
		return false;
	}

	return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function getPullReviewJobFromWebhook(
	eventName: string | undefined,
	payload: GitHubPullRequestWebhookPayload,
): PullReviewJob | null {
	if (eventName !== "pull_request") {
		return null;
	}

	if (
		!supportedPullRequestActions.has(payload.action as GitHubPullRequestAction)
	) {
		return null;
	}

	if (!payload.installation?.id) {
		return null;
	}

	return {
		action: payload.action as GitHubPullRequestAction,
		headSha: payload.pull_request.head.sha,
		installationId: payload.installation.id,
		owner: payload.repository.owner.login,
		pullNumber: payload.pull_request.number,
		repository: payload.repository.name,
	};
}
