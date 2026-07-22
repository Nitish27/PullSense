import { describe, expect, it, vi } from "vitest";

import { loadReviewRunsPageData } from "./review-runs";

describe("loadReviewRunsPageData", () => {
	it("returns an idle state when the search params are missing", async () => {
		await expect(
			loadReviewRunsPageData({
				apiBaseUrl: "http://localhost:3001",
				searchParams: {},
			}),
		).resolves.toEqual({
			apiBaseUrl: "http://localhost:3001",
			form: {
				owner: "",
				pullNumber: "",
				repository: "",
			},
			state: "idle",
		});
	});

	it("returns a validation error when the pull number is invalid", async () => {
		await expect(
			loadReviewRunsPageData({
				apiBaseUrl: "http://localhost:3001",
				searchParams: {
					owner: "Nitish27",
					pullNumber: "abc",
					repository: "PullSense",
				},
			}),
		).resolves.toEqual({
			apiBaseUrl: "http://localhost:3001",
			error: "Pull request number must be a positive integer.",
			form: {
				owner: "Nitish27",
				pullNumber: "abc",
				repository: "PullSense",
			},
			state: "error",
		});
	});

	it("loads the latest review run and history for a valid pull request", async () => {
		const fetchImplementation = vi.fn(async () => ({
			json: async () => ({
				latest: {
					checkRunId: 111,
					commentId: 222,
					commentUrl:
						"https://github.com/Nitish27/PullSense/pull/2#issuecomment-222",
					completedAt: "2026-07-21T10:00:00.000Z",
					conclusion: "success",
					createdAt: "2026-07-21T09:55:00.000Z",
					errorMessage: null,
					headSha: "abc123",
					id: 3,
					inlineReviewId: 333,
					inlineReviewUrl:
						"https://github.com/Nitish27/PullSense/pull/2#pullrequestreview-333",
					installationId: 42,
					overallSeverity: "low",
					owner: "Nitish27",
					pullNumber: 2,
					pullRequestAction: "synchronize",
					repository: "PullSense",
					startedAt: "2026-07-21T09:56:00.000Z",
					status: "completed",
					summary: "Review completed successfully.",
					updatedAt: "2026-07-21T10:00:00.000Z",
				},
				owner: "Nitish27",
				pullNumber: 2,
				repository: "PullSense",
				runs: [
					{
						checkRunId: 111,
						commentId: 222,
						commentUrl:
							"https://github.com/Nitish27/PullSense/pull/2#issuecomment-222",
						completedAt: "2026-07-21T10:00:00.000Z",
						conclusion: "success",
						createdAt: "2026-07-21T09:55:00.000Z",
						errorMessage: null,
						headSha: "abc123",
						id: 3,
						inlineReviewId: 333,
						inlineReviewUrl:
							"https://github.com/Nitish27/PullSense/pull/2#pullrequestreview-333",
						installationId: 42,
						overallSeverity: "low",
						owner: "Nitish27",
						pullNumber: 2,
						pullRequestAction: "synchronize",
						repository: "PullSense",
						startedAt: "2026-07-21T09:56:00.000Z",
						status: "completed",
						summary: "Review completed successfully.",
						updatedAt: "2026-07-21T10:00:00.000Z",
					},
				],
			}),
			ok: true,
		}));

		const result = await loadReviewRunsPageData({
			apiBaseUrl: "http://localhost:3001",
			fetchImplementation: fetchImplementation as never,
			searchParams: {
				owner: "Nitish27",
				pullNumber: "2",
				repository: "PullSense",
			},
		});

		expect(fetchImplementation).toHaveBeenCalledWith(
			"http://localhost:3001/repos/Nitish27/PullSense/pulls/2/review-runs",
			{
				cache: "no-store",
			},
		);
		expect(result).toMatchObject({
			apiBaseUrl: "http://localhost:3001",
			form: {
				owner: "Nitish27",
				pullNumber: "2",
				repository: "PullSense",
			},
			state: "ready",
		});
		if (result.state !== "ready") {
			throw new Error("Expected ready state");
		}
		expect(result.data.latest?.checkRunId).toBe(111);
		expect(result.data.runs).toHaveLength(1);
	});

	it("returns an error state when the API request fails", async () => {
		const fetchImplementation = vi.fn(async () => ({
			ok: false,
			status: 503,
		}));

		await expect(
			loadReviewRunsPageData({
				apiBaseUrl: "http://localhost:3001",
				fetchImplementation: fetchImplementation as never,
				searchParams: {
					owner: "Nitish27",
					pullNumber: "2",
					repository: "PullSense",
				},
			}),
		).resolves.toEqual({
			apiBaseUrl: "http://localhost:3001",
			error: "PullSense could not load review runs right now (HTTP 503).",
			form: {
				owner: "Nitish27",
				pullNumber: "2",
				repository: "PullSense",
			},
			state: "error",
		});
	});
});
