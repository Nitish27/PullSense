import type {
	PullRequestInlineFinding,
	PullRequestReviewFile,
} from "@ai-code-review/shared";
import { describe, expect, it, vi } from "vitest";

import {
	buildPullRequestReviewComments,
	type PullRequestReviewClient,
	postPullRequestReview,
} from "./post-pr-review";

describe("buildPullRequestReviewComments", () => {
	it("converts high-confidence diff findings into anchored review comments", () => {
		const files: PullRequestReviewFile[] = [
			{
				filename: "apps/api/src/workers/review-worker.ts",
				patch: [
					"@@ -10,2 +10,4 @@ export async function processReviewJob() {",
					" \tconst files = await fetchFiles();",
					"+\tconst review = await reviewPullRequest(files);",
					"+\tconst inlineFindings = review.inlineFindings;",
					" \treturn files;",
				].join("\n"),
				sha: "file-sha",
				status: "modified",
			},
		];
		const inlineFindings: PullRequestInlineFinding[] = [
			{
				body: "Use the review output immediately after generation so anchoring stays close to the changed code.",
				confidence: "high",
				file: "apps/api/src/workers/review-worker.ts",
				line: 12,
				severity: "medium",
				title: "Keep inline review handling near review generation",
			},
			{
				body: "This one should be ignored because the line does not exist in the diff.",
				confidence: "high",
				file: "apps/api/src/workers/review-worker.ts",
				line: 99,
				severity: "low",
				title: "Unanchorable finding",
			},
		];

		const comments = buildPullRequestReviewComments(files, inlineFindings);

		expect(comments).toEqual([
			{
				body: [
					"**[MEDIUM] Keep inline review handling near review generation**",
					"",
					"Use the review output immediately after generation so anchoring stays close to the changed code.",
				].join("\n"),
				line: 12,
				path: "apps/api/src/workers/review-worker.ts",
				side: "RIGHT",
			},
		]);
	});
});

describe("postPullRequestReview", () => {
	it("submits one grouped pull request review with inline comments", async () => {
		const listReviews = vi.fn(async () => ({
			data: [],
		}));
		const createReview = vi.fn(async () => ({
			data: {
				html_url:
					"https://github.com/Nitish27/PullSense/pull/1#pullrequestreview-1",
				id: 1,
			},
		}));
		const updateReview = vi.fn();
		const client: PullRequestReviewClient = {
			pulls: {
				createReview,
				listReviews,
				updateReview,
			},
		};

		const review = await postPullRequestReview(client, {
			body: [
				"<!-- pullsense:inline-review:key=abc123 -->",
				"## PullSense inline review",
				"",
				"High-confidence inline findings only.",
			].join("\n"),
			comments: [
				{
					body: "Please add retry handling here.",
					line: 12,
					path: "apps/api/src/workers/review-worker.ts",
					side: "RIGHT",
				},
			],
			commitId: "head-sha",
			event: "COMMENT",
			owner: "Nitish27",
			pullNumber: 1,
			repository: "PullSense",
		});

		expect(listReviews).toHaveBeenCalledWith({
			owner: "Nitish27",
			per_page: 100,
			pull_number: 1,
			repo: "PullSense",
		});
		expect(createReview).toHaveBeenCalledWith({
			body: [
				"<!-- pullsense:inline-review:key=abc123 -->",
				"## PullSense inline review",
				"",
				"High-confidence inline findings only.",
			].join("\n"),
			comments: [
				{
					body: "Please add retry handling here.",
					line: 12,
					path: "apps/api/src/workers/review-worker.ts",
					side: "RIGHT",
				},
			],
			commit_id: "head-sha",
			event: "COMMENT",
			owner: "Nitish27",
			pull_number: 1,
			repo: "PullSense",
		});
		expect(updateReview).not.toHaveBeenCalled();
		expect(review).toEqual({
			htmlUrl:
				"https://github.com/Nitish27/PullSense/pull/1#pullrequestreview-1",
			id: 1,
		});
	});

	it("skips creating a new grouped review when the latest PullSense review has the same signature", async () => {
		const body = [
			"<!-- pullsense:inline-review:key=abc123 -->",
			"## PullSense inline review",
			"",
			"High-confidence inline findings only.",
		].join("\n");
		const listReviews = vi.fn(async () => ({
			data: [
				{
					body,
					html_url:
						"https://github.com/Nitish27/PullSense/pull/1#pullrequestreview-7",
					id: 7,
				},
			],
		}));
		const createReview = vi.fn();
		const updateReview = vi.fn();
		const client: PullRequestReviewClient = {
			pulls: {
				createReview,
				listReviews,
				updateReview,
			},
		};

		const review = await postPullRequestReview(client, {
			body,
			comments: [
				{
					body: "Please add retry handling here.",
					line: 12,
					path: "apps/api/src/workers/review-worker.ts",
					side: "RIGHT",
				},
			],
			commitId: "head-sha",
			event: "COMMENT",
			owner: "Nitish27",
			pullNumber: 1,
			repository: "PullSense",
		});

		expect(createReview).not.toHaveBeenCalled();
		expect(updateReview).not.toHaveBeenCalled();
		expect(review).toEqual({
			htmlUrl:
				"https://github.com/Nitish27/PullSense/pull/1#pullrequestreview-7",
			id: 7,
		});
	});

	it("updates the latest PullSense review body when the signature matches but the summary text changes", async () => {
		const listReviews = vi.fn(async () => ({
			data: [
				{
					body: [
						"<!-- pullsense:inline-review:key=abc123 -->",
						"## PullSense inline review",
						"",
						"Older summary body.",
					].join("\n"),
					html_url:
						"https://github.com/Nitish27/PullSense/pull/1#pullrequestreview-7",
					id: 7,
				},
			],
		}));
		const createReview = vi.fn();
		const updateReview = vi.fn(async () => ({
			data: {
				html_url:
					"https://github.com/Nitish27/PullSense/pull/1#pullrequestreview-7",
				id: 7,
			},
		}));
		const client: PullRequestReviewClient = {
			pulls: {
				createReview,
				listReviews,
				updateReview,
			},
		};

		const review = await postPullRequestReview(client, {
			body: [
				"<!-- pullsense:inline-review:key=abc123 -->",
				"## PullSense inline review",
				"",
				"Updated summary body.",
			].join("\n"),
			comments: [
				{
					body: "Please add retry handling here.",
					line: 12,
					path: "apps/api/src/workers/review-worker.ts",
					side: "RIGHT",
				},
			],
			commitId: "head-sha",
			event: "COMMENT",
			owner: "Nitish27",
			pullNumber: 1,
			repository: "PullSense",
		});

		expect(updateReview).toHaveBeenCalledWith({
			body: [
				"<!-- pullsense:inline-review:key=abc123 -->",
				"## PullSense inline review",
				"",
				"Updated summary body.",
			].join("\n"),
			owner: "Nitish27",
			pull_number: 1,
			repo: "PullSense",
			review_id: 7,
		});
		expect(createReview).not.toHaveBeenCalled();
		expect(review).toEqual({
			htmlUrl:
				"https://github.com/Nitish27/PullSense/pull/1#pullrequestreview-7",
			id: 7,
		});
	});
});
