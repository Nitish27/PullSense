import { describe, expect, it, vi } from "vitest";

import {
	buildRepositoryHealthPath,
	buildReviewRunsDetailPath,
	buildSetupCenterPath,
	loadGitHubInstallationHealthPageData,
	loadRepositoryReviewHealthPageData,
	loadReviewRunsDetailPageData,
	loadReviewRunsPageData,
	loadSetupStatusPageData,
} from "./review-runs";

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

	it("loads review runs for dedicated PR detail route params", async () => {
		const fetchImplementation = vi.fn(async () => ({
			json: async () => ({
				latest: null,
				owner: "Nitish27",
				pullNumber: 4,
				repository: "PullSense",
				runs: [],
			}),
			ok: true,
		}));

		const result = await loadReviewRunsDetailPageData({
			apiBaseUrl: "http://localhost:3001",
			fetchImplementation: fetchImplementation as never,
			params: {
				owner: "Nitish27",
				pullNumber: "4",
				repository: "PullSense",
			},
		});

		expect(fetchImplementation).toHaveBeenCalledWith(
			"http://localhost:3001/repos/Nitish27/PullSense/pulls/4/review-runs",
			{
				cache: "no-store",
			},
		);
		expect(result).toMatchObject({
			apiBaseUrl: "http://localhost:3001",
			form: {
				owner: "Nitish27",
				pullNumber: "4",
				repository: "PullSense",
			},
			state: "ready",
		});
	});

	it("returns a validation error for invalid dedicated route params", async () => {
		await expect(
			loadReviewRunsDetailPageData({
				apiBaseUrl: "http://localhost:3001",
				params: {
					owner: "Nitish27",
					pullNumber: "bad-value",
					repository: "PullSense",
				},
			}),
		).resolves.toEqual({
			apiBaseUrl: "http://localhost:3001",
			error: "Pull request number must be a positive integer.",
			form: {
				owner: "Nitish27",
				pullNumber: "bad-value",
				repository: "PullSense",
			},
			state: "error",
		});
	});

	it("builds an internal PullSense PR detail route", () => {
		expect(
			buildReviewRunsDetailPath({
				owner: "Nitish27",
				pullNumber: 7,
				repository: "PullSense",
			}),
		).toBe("/pull-requests/Nitish27/PullSense/7");
	});

	it("loads repository health data for the dedicated repository route", async () => {
		const fetchImplementation = vi.fn(async () => ({
			json: async () => ({
				failureTrends: [
					{ category: "gemini", count: 1 },
					{ category: "github", count: 0 },
					{ category: "database", count: 0 },
					{ category: "queue", count: 0 },
					{ category: "unknown", count: 0 },
				],
				metrics: {
					averageReviewLatencyMs: 4100,
					failedRuns: 1,
					successfulRuns: 3,
					totalRuns: 4,
				},
				owner: "Nitish27",
				recentPullRequests: [],
				repository: "PullSense",
			}),
			ok: true,
		}));

		const result = await loadRepositoryReviewHealthPageData({
			apiBaseUrl: "http://localhost:3001",
			fetchImplementation: fetchImplementation as never,
			params: {
				owner: "Nitish27",
				repository: "PullSense",
			},
		});

		expect(fetchImplementation).toHaveBeenCalledWith(
			"http://localhost:3001/repositories/Nitish27/PullSense/review-health",
			{
				cache: "no-store",
			},
		);
		expect(result).toMatchObject({
			apiBaseUrl: "http://localhost:3001",
			form: {
				owner: "Nitish27",
				repository: "PullSense",
			},
			state: "ready",
		});
	});

	it("returns an error state when a repository route parameter is missing", async () => {
		await expect(
			loadRepositoryReviewHealthPageData({
				apiBaseUrl: "http://localhost:3001",
				params: {
					owner: "Nitish27",
				},
			}),
		).resolves.toEqual({
			apiBaseUrl: "http://localhost:3001",
			error: "Repository owner and name are required.",
			form: {
				owner: "Nitish27",
				repository: "",
			},
			state: "error",
		});
	});

	it("returns an error state when repository health is unavailable", async () => {
		const fetchImplementation = vi.fn(async () => ({
			ok: false,
			status: 503,
		}));

		await expect(
			loadRepositoryReviewHealthPageData({
				apiBaseUrl: "http://localhost:3001",
				fetchImplementation: fetchImplementation as never,
				params: {
					owner: "Nitish27",
					repository: "PullSense",
				},
			}),
		).resolves.toMatchObject({
			error: "PullSense could not load repository health right now (HTTP 503).",
			state: "error",
		});
	});

	it("builds an internal PullSense repository health route", () => {
		expect(
			buildRepositoryHealthPath({
				owner: "Nitish27",
				repository: "PullSense",
			}),
		).toBe("/repositories/Nitish27/PullSense");
	});

	it("builds the internal PullSense setup center route", () => {
		expect(buildSetupCenterPath()).toBe("/settings");
	});

	it("loads a sanitized setup status snapshot", async () => {
		const fetchImplementation = vi.fn(async () => ({
			json: async () => ({
				database: {
					detail: "Review-run persistence is ready.",
					state: "ready",
				},
				githubApp: {
					detail: "GitHub App credentials are configured.",
					state: "ready",
				},
				modelProvider: {
					detail: "Gemini review generation is configured.",
					state: "ready",
				},
				queue: {
					detail: "Redis queue configuration is present.",
					state: "ready",
				},
				webhook: {
					detail: "Webhook signing is configured.",
					state: "ready",
				},
			}),
			ok: true,
		}));

		const result = await loadSetupStatusPageData({
			apiBaseUrl: "http://localhost:3001",
			fetchImplementation: fetchImplementation as never,
		});

		expect(fetchImplementation).toHaveBeenCalledWith(
			"http://localhost:3001/setup-status",
			{
				cache: "no-store",
			},
		);
		expect(result).toMatchObject({
			apiBaseUrl: "http://localhost:3001",
			data: {
				webhook: {
					state: "ready",
				},
			},
			state: "ready",
		});
	});

	it("returns an error state when setup status is unavailable", async () => {
		const fetchImplementation = vi.fn(async () => ({
			ok: false,
			status: 503,
		}));

		await expect(
			loadSetupStatusPageData({
				apiBaseUrl: "http://localhost:3001",
				fetchImplementation: fetchImplementation as never,
			}),
		).resolves.toEqual({
			apiBaseUrl: "http://localhost:3001",
			error: "PullSense could not load setup status right now (HTTP 503).",
			state: "error",
		});
	});

	it("loads connected GitHub installations and accessible repositories", async () => {
		const fetchImplementation = vi.fn(async () => ({
			json: async () => ({
				detail: "GitHub App installations are connected.",
				installations: [
					{
						accountLogin: "Nitish27",
						id: 141542735,
						repositories: [
							{
								fullName: "Nitish27/PullSense",
								htmlUrl: "https://github.com/Nitish27/PullSense",
								name: "PullSense",
								ownerLogin: "Nitish27",
								private: true,
							},
						],
						repositorySelection: "selected",
					},
				],
				state: "connected",
			}),
			ok: true,
		}));

		const result = await loadGitHubInstallationHealthPageData({
			apiBaseUrl: "http://localhost:3001",
			fetchImplementation: fetchImplementation as never,
		});

		expect(fetchImplementation).toHaveBeenCalledWith(
			"http://localhost:3001/setup/github-installations",
			{ cache: "no-store" },
		);
		expect(result).toMatchObject({
			data: {
				installations: [
					{
						repositories: [{ fullName: "Nitish27/PullSense" }],
					},
				],
				state: "connected",
			},
			state: "ready",
		});
	});

	it("returns an error state when GitHub installation health is unavailable", async () => {
		const fetchImplementation = vi.fn(async () => ({
			ok: false,
			status: 503,
		}));

		await expect(
			loadGitHubInstallationHealthPageData({
				apiBaseUrl: "http://localhost:3001",
				fetchImplementation: fetchImplementation as never,
			}),
		).resolves.toEqual({
			apiBaseUrl: "http://localhost:3001",
			error:
				"PullSense could not load GitHub installation health right now (HTTP 503).",
			state: "error",
		});
	});
});
