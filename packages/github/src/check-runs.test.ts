import { describe, expect, it, vi } from "vitest";

import {
	createCheckRun,
	type PullRequestCheckRunClient,
	updateCheckRun,
} from "./check-runs";

describe("createCheckRun", () => {
	it("creates a queued PullSense check run for a pull request head sha", async () => {
		const create = vi.fn(async () => ({
			data: {
				html_url: "https://github.com/Nitish27/PullSense/runs/8801",
				id: 8801,
			},
		}));
		const update = vi.fn();
		const client: PullRequestCheckRunClient = {
			checks: {
				create,
				update,
			},
		};

		const result = await createCheckRun(client, {
			detailsUrl: undefined,
			externalId: "pullsense-review-run-321",
			headSha: "abc123",
			owner: "Nitish27",
			repository: "PullSense",
			status: "queued",
			summary: "PullSense queued this pull request for AI review.",
			title: "Review queued",
		});

		expect(create).toHaveBeenCalledWith({
			details_url: undefined,
			external_id: "pullsense-review-run-321",
			head_sha: "abc123",
			name: "PullSense review",
			output: {
				summary: "PullSense queued this pull request for AI review.",
				title: "Review queued",
			},
			owner: "Nitish27",
			repo: "PullSense",
			status: "queued",
		});
		expect(update).not.toHaveBeenCalled();
		expect(result).toEqual({
			htmlUrl: "https://github.com/Nitish27/PullSense/runs/8801",
			id: 8801,
		});
	});
});

describe("updateCheckRun", () => {
	it("updates a PullSense check run to a completed conclusion", async () => {
		const create = vi.fn();
		const update = vi.fn(async () => ({
			data: {
				html_url: "https://github.com/Nitish27/PullSense/runs/8801",
				id: 8801,
			},
		}));
		const client: PullRequestCheckRunClient = {
			checks: {
				create,
				update,
			},
		};

		const result = await updateCheckRun(client, {
			checkRunId: 8801,
			conclusion: "success",
			detailsUrl:
				"https://github.com/Nitish27/PullSense/pull/1#issuecomment-900",
			owner: "Nitish27",
			repository: "PullSense",
			status: "completed",
			summary: "PullSense completed the review successfully.",
			title: "Review completed",
		});

		expect(update).toHaveBeenCalledWith({
			check_run_id: 8801,
			completed_at: expect.any(String),
			conclusion: "success",
			details_url:
				"https://github.com/Nitish27/PullSense/pull/1#issuecomment-900",
			name: "PullSense review",
			output: {
				summary: "PullSense completed the review successfully.",
				title: "Review completed",
			},
			owner: "Nitish27",
			repo: "PullSense",
			status: "completed",
		});
		expect(create).not.toHaveBeenCalled();
		expect(result).toEqual({
			htmlUrl: "https://github.com/Nitish27/PullSense/runs/8801",
			id: 8801,
		});
	});
});
