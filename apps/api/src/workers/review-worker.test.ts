import type { PullRequestReview, PullReviewJob } from "@ai-code-review/shared";
import { describe, expect, it, vi } from "vitest";

import { processReviewJob } from "./review-worker";

describe("processReviewJob", () => {
	it("fetches files, generates a review, and posts a PR summary comment", async () => {
		const fetchPullRequestFilesForInstallation = vi.fn(async () => [
			{
				filename: "src/app.ts",
				patch: "@@ -1 +1 @@",
				sha: "file-sha",
				status: "modified",
			},
		]);
		const reviewPullRequest = vi.fn(
			async (): Promise<PullRequestReview> => ({
				issues: [
					{
						body: "Worker failures should retry before exiting.",
						file: "src/app.ts",
						severity: "medium",
						title: "Retry path missing",
					},
				],
				overallSeverity: "medium",
				summary:
					"The worker pipeline is in place, but retry handling still needs work.",
			}),
		);
		const postPullRequestComment = vi.fn(async () => ({
			htmlUrl: "https://github.com/Nitish27/PullSense/pull/9#issuecomment-101",
			id: 101,
		}));
		const logger = {
			info: vi.fn(),
		};
		const job: PullReviewJob = {
			action: "opened",
			headSha: "abc123",
			installationId: 42,
			owner: "Nitish27",
			pullNumber: 9,
			repository: "PullSense",
		};

		const result = await processReviewJob(job, {
			fetchPullRequestFilesForInstallation,
			postPullRequestComment,
			reviewPullRequest,
			logger,
		});

		expect(fetchPullRequestFilesForInstallation).toHaveBeenCalledWith({
			installationId: 42,
			owner: "Nitish27",
			pullNumber: 9,
			repository: "PullSense",
		});
		expect(reviewPullRequest).toHaveBeenCalledWith({
			files: [
				{
					filename: "src/app.ts",
					patch: "@@ -1 +1 @@",
					sha: "file-sha",
					status: "modified",
				},
			],
			headSha: "abc123",
			owner: "Nitish27",
			pullNumber: 9,
			repository: "PullSense",
		});
		expect(postPullRequestComment).toHaveBeenCalledWith({
			body: expect.stringContaining("## PullSense review"),
			installationId: 42,
			owner: "Nitish27",
			pullNumber: 9,
			repository: "PullSense",
		});
		expect(result).toEqual({
			comment: {
				htmlUrl:
					"https://github.com/Nitish27/PullSense/pull/9#issuecomment-101",
				id: 101,
			},
			fileCount: 1,
			files: [
				{
					filename: "src/app.ts",
					patch: "@@ -1 +1 @@",
					sha: "file-sha",
					status: "modified",
				},
			],
			job,
			review: {
				issues: [
					{
						body: "Worker failures should retry before exiting.",
						file: "src/app.ts",
						severity: "medium",
						title: "Retry path missing",
					},
				],
				overallSeverity: "medium",
				summary:
					"The worker pipeline is in place, but retry handling still needs work.",
			},
		});
		expect(logger.info).toHaveBeenCalled();
	});
});
