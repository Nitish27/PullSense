import { describe, expect, it, vi } from "vitest";

import { createApp } from "../app";
import type { ReviewRunRecord } from "../db/review-runs";

function createReviewRun(id: number, overrides: Partial<ReviewRunRecord> = {}) {
	const now = new Date("2026-07-03T13:00:00.000Z");

	return {
		checkRunId: null,
		commentId: null,
		commentUrl: null,
		completedAt: null,
		conclusion: null,
		createdAt: now,
		errorMessage: null,
		headSha: `sha-${id}`,
		id,
		inlineReviewId: null,
		inlineReviewUrl: null,
		installationId: 42,
		overallSeverity: null,
		owner: "Nitish27",
		pullNumber: 1,
		pullRequestAction: "opened",
		repository: "PullSense",
		startedAt: null,
		status: "queued",
		summary: null,
		updatedAt: now,
		...overrides,
	} satisfies ReviewRunRecord;
}

describe("GET /repos/:owner/:repository/pulls/:pullNumber/review-runs", () => {
	it("returns the latest review run plus recent history for a PR", async () => {
		const latest = createReviewRun(12, {
			commentId: 900,
			commentUrl:
				"https://github.com/Nitish27/PullSense/pull/1#issuecomment-900",
			completedAt: new Date("2026-07-03T13:15:00.000Z"),
			conclusion: "success",
			overallSeverity: "low",
			status: "completed",
			summary: "Latest completed run",
		});
		const older = createReviewRun(11, {
			createdAt: new Date("2026-07-03T12:30:00.000Z"),
			updatedAt: new Date("2026-07-03T12:30:00.000Z"),
			status: "failed",
			errorMessage: "Gemini request failed",
		});
		const getLatestReviewRunForPullRequest = vi.fn(async () => latest);
		const listReviewRunsForPullRequest = vi.fn(async () => [latest, older]);
		const app = createApp({
			reviewRunStore: {
				attachCheckRunToReviewRun: vi.fn(async () => undefined),
				createQueuedReviewRun: vi.fn(async () => createReviewRun(10)),
				getLatestReviewRunForPullRequest,
				getReviewRunById: vi.fn(async () => null),
				listReviewRunsForPullRequest,
				markReviewRunCompleted: vi.fn(async () => undefined),
				markReviewRunFailed: vi.fn(async () => undefined),
				markReviewRunInProgress: vi.fn(async () => undefined),
			},
		});

		const response = await app.inject({
			method: "GET",
			url: "/repos/Nitish27/PullSense/pulls/1/review-runs",
		});

		expect(response.statusCode).toBe(200);
		expect(getLatestReviewRunForPullRequest).toHaveBeenCalledWith({
			owner: "Nitish27",
			pullNumber: 1,
			repository: "PullSense",
		});
		expect(listReviewRunsForPullRequest).toHaveBeenCalledWith({
			owner: "Nitish27",
			pullNumber: 1,
			repository: "PullSense",
		});
		expect(response.json()).toEqual({
			latest: {
				commentId: 900,
				commentUrl:
					"https://github.com/Nitish27/PullSense/pull/1#issuecomment-900",
				completedAt: "2026-07-03T13:15:00.000Z",
				conclusion: "success",
				createdAt: "2026-07-03T13:00:00.000Z",
				errorMessage: null,
				headSha: "sha-12",
				id: 12,
				inlineReviewId: null,
				inlineReviewUrl: null,
				installationId: 42,
				overallSeverity: "low",
				owner: "Nitish27",
				pullNumber: 1,
				pullRequestAction: "opened",
				repository: "PullSense",
				startedAt: null,
				status: "completed",
				summary: "Latest completed run",
				updatedAt: "2026-07-03T13:00:00.000Z",
				checkRunId: null,
			},
			owner: "Nitish27",
			pullNumber: 1,
			repository: "PullSense",
			runs: [
				{
					checkRunId: null,
					commentId: 900,
					commentUrl:
						"https://github.com/Nitish27/PullSense/pull/1#issuecomment-900",
					completedAt: "2026-07-03T13:15:00.000Z",
					conclusion: "success",
					createdAt: "2026-07-03T13:00:00.000Z",
					errorMessage: null,
					headSha: "sha-12",
					id: 12,
					inlineReviewId: null,
					inlineReviewUrl: null,
					installationId: 42,
					overallSeverity: "low",
					owner: "Nitish27",
					pullNumber: 1,
					pullRequestAction: "opened",
					repository: "PullSense",
					startedAt: null,
					status: "completed",
					summary: "Latest completed run",
					updatedAt: "2026-07-03T13:00:00.000Z",
				},
				{
					checkRunId: null,
					commentId: null,
					commentUrl: null,
					completedAt: null,
					conclusion: null,
					createdAt: "2026-07-03T12:30:00.000Z",
					errorMessage: "Gemini request failed",
					headSha: "sha-11",
					id: 11,
					inlineReviewId: null,
					inlineReviewUrl: null,
					installationId: 42,
					overallSeverity: null,
					owner: "Nitish27",
					pullNumber: 1,
					pullRequestAction: "opened",
					repository: "PullSense",
					startedAt: null,
					status: "failed",
					summary: null,
					updatedAt: "2026-07-03T12:30:00.000Z",
				},
			],
		});
	});

	it("returns an empty status payload when the PR has no persisted review runs", async () => {
		const getLatestReviewRunForPullRequest = vi.fn(async () => null);
		const listReviewRunsForPullRequest = vi.fn(async () => []);
		const app = createApp({
			reviewRunStore: {
				attachCheckRunToReviewRun: vi.fn(async () => undefined),
				createQueuedReviewRun: vi.fn(async () => createReviewRun(10)),
				getLatestReviewRunForPullRequest,
				getReviewRunById: vi.fn(async () => null),
				listReviewRunsForPullRequest,
				markReviewRunCompleted: vi.fn(async () => undefined),
				markReviewRunFailed: vi.fn(async () => undefined),
				markReviewRunInProgress: vi.fn(async () => undefined),
			},
		});

		const response = await app.inject({
			method: "GET",
			url: "/repos/Nitish27/PullSense/pulls/999/review-runs",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			latest: null,
			owner: "Nitish27",
			pullNumber: 999,
			repository: "PullSense",
			runs: [],
		});
	});
});
