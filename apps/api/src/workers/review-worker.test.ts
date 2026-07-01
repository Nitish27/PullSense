import type { PullRequestReview, PullReviewJob } from "@ai-code-review/shared";
import { describe, expect, it, vi } from "vitest";

import { processReviewJob } from "./review-worker";

describe("processReviewJob", () => {
	it("fetches files, generates a review, and posts a PR summary comment", async () => {
		const fetchPullRequestFilesForInstallation = vi.fn(async () => [
			{
				filename: "src/app.ts",
				patch: [
					"@@ -1 +1,2 @@",
					"+const review = await reviewPullRequest();",
				].join("\n"),
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
				inlineFindings: [
					{
						body: "Guard this external call so transient failures are clearer in the worker path.",
						confidence: "high",
						file: "src/app.ts",
						line: 1,
						severity: "medium",
						title: "Add explicit retry-aware guard",
					},
					{
						body: "This should stay summary-only because confidence is not high.",
						confidence: "medium",
						file: "src/app.ts",
						line: 1,
						severity: "low",
						title: "Skip medium-confidence inline comment",
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
		const inlineReviewBodies: string[] = [];
		const postPullRequestReview = vi.fn(
			async (input: { body: string; comments: unknown[] }) => {
				inlineReviewBodies.push(input.body);

				return {
					htmlUrl:
						"https://github.com/Nitish27/PullSense/pull/9#pullrequestreview-202",
					id: 202,
				};
			},
		);
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
			postPullRequestReview,
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
					patch: [
						"@@ -1 +1,2 @@",
						"+const review = await reviewPullRequest();",
					].join("\n"),
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
			body: expect.stringContaining("<!-- pullsense:summary -->"),
			installationId: 42,
			owner: "Nitish27",
			pullNumber: 9,
			repository: "PullSense",
		});
		expect(postPullRequestReview).toHaveBeenCalledWith({
			body: expect.stringContaining("## PullSense inline review"),
			comments: [
				{
					body: expect.stringContaining("Add explicit retry-aware guard"),
					line: 1,
					path: "src/app.ts",
					side: "RIGHT",
				},
			],
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
					patch: [
						"@@ -1 +1,2 @@",
						"+const review = await reviewPullRequest();",
					].join("\n"),
					sha: "file-sha",
					status: "modified",
				},
			],
			job,
			inlineReview: {
				htmlUrl:
					"https://github.com/Nitish27/PullSense/pull/9#pullrequestreview-202",
				id: 202,
			},
			review: {
				inlineFindings: [
					{
						body: "Guard this external call so transient failures are clearer in the worker path.",
						confidence: "high",
						file: "src/app.ts",
						line: 1,
						severity: "medium",
						title: "Add explicit retry-aware guard",
					},
					{
						body: "This should stay summary-only because confidence is not high.",
						confidence: "medium",
						file: "src/app.ts",
						line: 1,
						severity: "low",
						title: "Skip medium-confidence inline comment",
					},
				],
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

	it("formats the summary comment with the PullSense marker so reruns can update it in place", async () => {
		const fetchPullRequestFilesForInstallation = vi.fn(async () => []);
		const reviewPullRequest = vi.fn(
			async (): Promise<PullRequestReview> => ({
				issues: [],
				inlineFindings: [],
				overallSeverity: "low",
				summary: "No actionable issues found.",
			}),
		);
		const postPullRequestComment = vi.fn(async () => ({
			htmlUrl: "https://github.com/Nitish27/PullSense/pull/9#issuecomment-101",
			id: 101,
		}));
		const postPullRequestReview = vi.fn();
		const logger = {
			info: vi.fn(),
		};
		const job: PullReviewJob = {
			action: "synchronize",
			headSha: "abc123",
			installationId: 42,
			owner: "Nitish27",
			pullNumber: 9,
			repository: "PullSense",
		};

		await processReviewJob(job, {
			fetchPullRequestFilesForInstallation,
			postPullRequestComment,
			postPullRequestReview,
			reviewPullRequest,
			logger,
		});

		expect(postPullRequestComment).toHaveBeenCalledWith({
			body: expect.stringContaining("<!-- pullsense:summary -->"),
			installationId: 42,
			owner: "Nitish27",
			pullNumber: 9,
			repository: "PullSense",
		});
		expect(postPullRequestReview).not.toHaveBeenCalled();
	});

	it("formats a stable inline review marker so repeated runs with the same findings can be deduped", async () => {
		const fetchPullRequestFilesForInstallation = vi.fn(async () => [
			{
				filename: "src/app.ts",
				patch: [
					"@@ -1 +1,2 @@",
					"+const review = await reviewPullRequest();",
				].join("\n"),
				sha: "file-sha",
				status: "modified",
			},
		]);
		const reviewPullRequest = vi.fn(
			async (): Promise<PullRequestReview> => ({
				issues: [],
				inlineFindings: [
					{
						body: "Guard this external call so transient failures are clearer in the worker path.",
						confidence: "high",
						file: "src/app.ts",
						line: 1,
						severity: "medium",
						title: "Add explicit retry-aware guard",
					},
				],
				overallSeverity: "low",
				summary: "Same inline finding set across reruns.",
			}),
		);
		const postPullRequestComment = vi.fn(async () => ({
			htmlUrl: "https://github.com/Nitish27/PullSense/pull/9#issuecomment-101",
			id: 101,
		}));
		const inlineReviewBodies: string[] = [];
		const postPullRequestReview = vi.fn(
			async (input: { body: string; comments: unknown[] }) => {
				inlineReviewBodies.push(input.body);

				return {
					htmlUrl:
						"https://github.com/Nitish27/PullSense/pull/9#pullrequestreview-202",
					id: 202,
				};
			},
		);
		const logger = {
			info: vi.fn(),
		};
		const job: PullReviewJob = {
			action: "synchronize",
			headSha: "abc123",
			installationId: 42,
			owner: "Nitish27",
			pullNumber: 9,
			repository: "PullSense",
		};

		await processReviewJob(job, {
			fetchPullRequestFilesForInstallation,
			postPullRequestComment,
			postPullRequestReview,
			reviewPullRequest,
			logger,
		});
		await processReviewJob(job, {
			fetchPullRequestFilesForInstallation,
			postPullRequestComment,
			postPullRequestReview,
			reviewPullRequest,
			logger,
		});

		expect(postPullRequestReview).toHaveBeenCalledTimes(2);
		expect(inlineReviewBodies[0]).toContain(
			"<!-- pullsense:inline-review:key=",
		);
		expect(inlineReviewBodies[0]).toBe(inlineReviewBodies[1]);
	});
});
