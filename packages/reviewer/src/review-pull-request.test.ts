import { describe, expect, it, vi } from "vitest";

import { reviewPullRequest } from "./review-pull-request";

describe("reviewPullRequest", () => {
	it("returns a normalized structured review from the model response", async () => {
		const generateReview = vi.fn(async () => ({
			issues: [
				{
					body: "The worker still drops failures instead of retrying them.",
					file: "apps/api/src/workers/review-worker.ts",
					severity: "medium",
					title: "Missing retry guidance",
				},
			],
			overallSeverity: "medium",
			summary:
				"This PR wires webhook processing, but the worker path still needs stronger failure handling.",
		}));

		const review = await reviewPullRequest(
			{
				files: [
					{
						filename: "apps/api/src/workers/review-worker.ts",
						patch: "@@ -1,2 +1,5 @@",
						sha: "abc123",
						status: "modified",
					},
				],
				headSha: "head-sha",
				owner: "Nitish27",
				pullNumber: 7,
				repository: "PullSense",
			},
			{
				generateReview,
				model: "gemini-test",
			},
		);

		expect(generateReview).toHaveBeenCalledWith({
			model: "gemini-test",
			prompt: expect.stringContaining("Nitish27/PullSense"),
		});
		expect(review).toEqual({
			issues: [
				{
					body: "The worker still drops failures instead of retrying them.",
					file: "apps/api/src/workers/review-worker.ts",
					severity: "medium",
					title: "Missing retry guidance",
				},
			],
			overallSeverity: "medium",
			summary:
				"This PR wires webhook processing, but the worker path still needs stronger failure handling.",
		});
	});

	it("throws a deterministic error when the model response is malformed", async () => {
		await expect(
			reviewPullRequest(
				{
					files: [],
					headSha: "head-sha",
					owner: "Nitish27",
					pullNumber: 8,
					repository: "PullSense",
				},
				{
					generateReview: async () => ({
						issues: "not-an-array",
						overallSeverity: "high",
						summary: 42,
					}),
					model: "gemini-test",
				},
			),
		).rejects.toThrow("Gemini review response did not match expected schema");
	});
});
