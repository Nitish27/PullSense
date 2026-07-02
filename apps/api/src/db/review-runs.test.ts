import { describe, expect, it, vi } from "vitest";

import {
	createNoopReviewRunStore,
	createReviewRun,
	ensureReviewRunsTable,
	getLatestReviewRunForPullRequest,
	getReviewRunById,
	listReviewRunsForPullRequest,
	markReviewRunCompleted,
	markReviewRunFailed,
	markReviewRunInProgress,
	type ReviewRunDatabaseClient,
} from "./review-runs";

describe("ensureReviewRunsTable", () => {
	it("creates the review_runs table with the expected persistence columns", async () => {
		const statements: string[] = [];
		const query = vi.fn(async (text: string) => {
			statements.push(text);

			return { rows: [] };
		});
		const client: ReviewRunDatabaseClient = {
			query,
		};

		await ensureReviewRunsTable(client);

		expect(query).toHaveBeenCalledTimes(2);
		expect(statements[0]).toContain("create table if not exists review_runs");
		expect(statements[0]).toContain("status text not null");
		expect(statements[0]).toContain("conclusion text");
		expect(statements[0]).toContain("check_run_id bigint");
		expect(statements[0]).toContain("comment_id bigint");
		expect(statements[0]).toContain("inline_review_id bigint");
		expect(statements[0]).toContain("error_message text");
		expect(statements[0]).toContain("created_at timestamptz not null");
	});
});

describe("createReviewRun", () => {
	it("inserts a queued review run and normalizes the row into a typed record", async () => {
		const createdAt = new Date("2026-07-02T10:00:00.000Z");
		const statements: string[] = [];
		const values: unknown[][] = [];
		const query = vi.fn(async (text: string, params?: unknown[]) => {
			statements.push(text);
			values.push(params ?? []);

			return {
				rows: [
					{
						check_run_id: null,
						comment_id: null,
						comment_url: null,
						completed_at: null,
						conclusion: null,
						created_at: createdAt.toISOString(),
						error_message: null,
						head_sha: "abc123",
						id: 7,
						inline_review_id: null,
						inline_review_url: null,
						installation_id: 42,
						owner: "Nitish27",
						overall_severity: null,
						pull_number: 9,
						pull_request_action: "opened",
						repository: "PullSense",
						started_at: null,
						status: "queued",
						summary: null,
						updated_at: createdAt.toISOString(),
					},
				],
			};
		});
		const client: ReviewRunDatabaseClient = {
			query,
		};

		const reviewRun = await createReviewRun(client, {
			headSha: "abc123",
			installationId: 42,
			owner: "Nitish27",
			pullNumber: 9,
			pullRequestAction: "opened",
			repository: "PullSense",
		});

		expect(query).toHaveBeenCalledTimes(1);
		expect(statements[0]).toContain("insert into review_runs");
		expect(values[0]).toEqual([
			"Nitish27",
			"PullSense",
			9,
			"abc123",
			42,
			"opened",
			"queued",
		]);
		expect(reviewRun).toEqual({
			checkRunId: null,
			commentId: null,
			commentUrl: null,
			completedAt: null,
			conclusion: null,
			createdAt,
			errorMessage: null,
			headSha: "abc123",
			id: 7,
			inlineReviewId: null,
			inlineReviewUrl: null,
			installationId: 42,
			overallSeverity: null,
			owner: "Nitish27",
			pullNumber: 9,
			pullRequestAction: "opened",
			repository: "PullSense",
			startedAt: null,
			status: "queued",
			summary: null,
			updatedAt: createdAt,
		});
	});
});

describe("getReviewRunById", () => {
	it("returns null when the requested review run does not exist", async () => {
		const client: ReviewRunDatabaseClient = {
			query: vi.fn(async () => ({
				rows: [],
			})),
		};

		await expect(getReviewRunById(client, 999)).resolves.toBeNull();
	});
});

describe("PR-scoped review run queries", () => {
	it("lists review runs for a pull request in newest-first order", async () => {
		const newerCreatedAt = new Date("2026-07-03T12:00:00.000Z");
		const olderCreatedAt = new Date("2026-07-03T11:00:00.000Z");
		const statements: string[] = [];
		const values: unknown[][] = [];
		const client: ReviewRunDatabaseClient = {
			query: vi.fn(async (text: string, params?: unknown[]) => {
				statements.push(text);
				values.push(params ?? []);

				return {
					rows: [
						{
							check_run_id: null,
							comment_id: 500,
							comment_url:
								"https://github.com/Nitish27/PullSense/pull/1#issuecomment-500",
							completed_at: newerCreatedAt.toISOString(),
							conclusion: "success",
							created_at: newerCreatedAt.toISOString(),
							error_message: null,
							head_sha: "newer-sha",
							id: 9,
							inline_review_id: 600,
							inline_review_url:
								"https://github.com/Nitish27/PullSense/pull/1#pullrequestreview-600",
							installation_id: 42,
							overall_severity: "low",
							owner: "Nitish27",
							pull_number: 1,
							pull_request_action: "synchronize",
							repository: "PullSense",
							started_at: newerCreatedAt.toISOString(),
							status: "completed",
							summary: "Newest review run",
							updated_at: newerCreatedAt.toISOString(),
						},
						{
							check_run_id: null,
							comment_id: null,
							comment_url: null,
							completed_at: null,
							conclusion: null,
							created_at: olderCreatedAt.toISOString(),
							error_message: null,
							head_sha: "older-sha",
							id: 8,
							inline_review_id: null,
							inline_review_url: null,
							installation_id: 42,
							overall_severity: null,
							owner: "Nitish27",
							pull_number: 1,
							pull_request_action: "opened",
							repository: "PullSense",
							started_at: null,
							status: "queued",
							summary: null,
							updated_at: olderCreatedAt.toISOString(),
						},
					],
				};
			}),
		};

		const reviewRuns = await listReviewRunsForPullRequest(client, {
			owner: "Nitish27",
			pullNumber: 1,
			repository: "PullSense",
		});

		expect(statements[0]).toContain("from review_runs");
		expect(statements[0]).toContain("order by created_at desc");
		expect(values[0]).toEqual(["Nitish27", "PullSense", 1]);
		expect(reviewRuns).toHaveLength(2);
		expect(reviewRuns.map((run) => run.id)).toEqual([9, 8]);
		expect(reviewRuns[0]).toMatchObject({
			commentId: 500,
			overallSeverity: "low",
			status: "completed",
			summary: "Newest review run",
		});
	});

	it("returns the latest review run for a pull request", async () => {
		const latestCreatedAt = new Date("2026-07-03T12:30:00.000Z");
		const statements: string[] = [];
		const values: unknown[][] = [];
		const client: ReviewRunDatabaseClient = {
			query: vi.fn(async (text: string, params?: unknown[]) => {
				statements.push(text);
				values.push(params ?? []);

				return {
					rows: [
						{
							check_run_id: null,
							comment_id: 700,
							comment_url:
								"https://github.com/Nitish27/PullSense/pull/1#issuecomment-700",
							completed_at: latestCreatedAt.toISOString(),
							conclusion: "success",
							created_at: latestCreatedAt.toISOString(),
							error_message: null,
							head_sha: "latest-sha",
							id: 10,
							inline_review_id: null,
							inline_review_url: null,
							installation_id: 42,
							overall_severity: "medium",
							owner: "Nitish27",
							pull_number: 1,
							pull_request_action: "synchronize",
							repository: "PullSense",
							started_at: latestCreatedAt.toISOString(),
							status: "completed",
							summary: "Latest run only",
							updated_at: latestCreatedAt.toISOString(),
						},
					],
				};
			}),
		};

		const reviewRun = await getLatestReviewRunForPullRequest(client, {
			owner: "Nitish27",
			pullNumber: 1,
			repository: "PullSense",
		});

		expect(statements[0]).toContain("order by created_at desc");
		expect(statements[0]).toContain("limit 1");
		expect(values[0]).toEqual(["Nitish27", "PullSense", 1]);
		expect(reviewRun).toMatchObject({
			id: 10,
			overallSeverity: "medium",
			status: "completed",
			summary: "Latest run only",
		});
	});
});

describe("review run lifecycle updates", () => {
	it("marks a review run as in progress with a started timestamp", async () => {
		const statements: string[] = [];
		const values: unknown[][] = [];
		const client: ReviewRunDatabaseClient = {
			query: vi.fn(async (text: string, params?: unknown[]) => {
				statements.push(text);
				values.push(params ?? []);

				return { rows: [] };
			}),
		};

		await markReviewRunInProgress(client, {
			reviewRunId: 55,
			startedAt: new Date("2026-07-03T09:00:00.000Z"),
		});

		expect(statements[0]).toContain("update review_runs");
		expect(statements[0]).toContain("status = $1");
		expect(statements[0]).toContain("started_at = $2");
		expect(values[0]).toEqual([
			"in_progress",
			new Date("2026-07-03T09:00:00.000Z"),
			55,
		]);
	});

	it("marks a review run as completed with summary metadata", async () => {
		const values: unknown[][] = [];
		const client: ReviewRunDatabaseClient = {
			query: vi.fn(async (_text: string, params?: unknown[]) => {
				values.push(params ?? []);

				return { rows: [] };
			}),
		};

		await markReviewRunCompleted(client, {
			commentId: 101,
			commentUrl:
				"https://github.com/Nitish27/PullSense/pull/1#issuecomment-101",
			completedAt: new Date("2026-07-03T09:30:00.000Z"),
			inlineReviewId: 202,
			inlineReviewUrl:
				"https://github.com/Nitish27/PullSense/pull/1#pullrequestreview-202",
			overallSeverity: "medium",
			reviewRunId: 55,
			summary: "Review finished successfully.",
		});

		expect(values[0]).toEqual([
			"completed",
			"success",
			"Review finished successfully.",
			"medium",
			101,
			"https://github.com/Nitish27/PullSense/pull/1#issuecomment-101",
			202,
			"https://github.com/Nitish27/PullSense/pull/1#pullrequestreview-202",
			new Date("2026-07-03T09:30:00.000Z"),
			55,
		]);
	});

	it("marks a review run as failed with the thrown error message", async () => {
		const values: unknown[][] = [];
		const client: ReviewRunDatabaseClient = {
			query: vi.fn(async (_text: string, params?: unknown[]) => {
				values.push(params ?? []);

				return { rows: [] };
			}),
		};

		await markReviewRunFailed(client, {
			completedAt: new Date("2026-07-03T10:00:00.000Z"),
			errorMessage: "Gemini request failed",
			reviewRunId: 55,
		});

		expect(values[0]).toEqual([
			"failed",
			"failure",
			"Gemini request failed",
			new Date("2026-07-03T10:00:00.000Z"),
			55,
		]);
	});

	it("provides a noop review run store for app construction and tests", async () => {
		const store = createNoopReviewRunStore();

		await expect(
			store.createQueuedReviewRun({
				headSha: "abc123",
				installationId: 42,
				owner: "Nitish27",
				pullNumber: 9,
				pullRequestAction: "opened",
				repository: "PullSense",
			}),
		).resolves.toMatchObject({
			id: 0,
			status: "queued",
		});
		await expect(
			store.markReviewRunInProgress({ reviewRunId: 0 }),
		).resolves.toBeUndefined();
		await expect(
			store.markReviewRunCompleted({
				commentId: 1,
				commentUrl: "https://example.com/comment/1",
				completedAt: new Date("2026-07-03T10:05:00.000Z"),
				inlineReviewId: null,
				inlineReviewUrl: null,
				overallSeverity: "low",
				reviewRunId: 0,
				summary: "noop",
			}),
		).resolves.toBeUndefined();
		await expect(
			store.markReviewRunFailed({
				completedAt: new Date("2026-07-03T10:05:00.000Z"),
				errorMessage: "noop",
				reviewRunId: 0,
			}),
		).resolves.toBeUndefined();
		await expect(
			store.listReviewRunsForPullRequest({
				owner: "Nitish27",
				pullNumber: 9,
				repository: "PullSense",
			}),
		).resolves.toEqual([]);
		await expect(
			store.getLatestReviewRunForPullRequest({
				owner: "Nitish27",
				pullNumber: 9,
				repository: "PullSense",
			}),
		).resolves.toBeNull();
	});
});
