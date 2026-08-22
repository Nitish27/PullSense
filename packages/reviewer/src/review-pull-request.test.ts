import { describe, expect, it, vi } from "vitest";

import {
	buildReviewPrompt,
	createGeminiReviewGenerator,
	reviewPullRequest,
} from "./review-pull-request";

describe("reviewPullRequest", () => {
	it("includes anti-noise guidance so the model prefers fewer, higher-signal findings", () => {
		const prompt = buildReviewPrompt({
			files: [
				{
					filename: "docker-compose.yml",
					patch: '@@ -1 +1 @@\n-"5432:5432"\n+"5433:5432"',
					sha: "abc123",
					status: "modified",
				},
			],
			headSha: "head-sha",
			owner: "Nitish27",
			pullNumber: 11,
			repository: "PullSense",
		});

		expect(prompt).toContain(
			"Prefer zero findings over weak, generic, or speculative findings.",
		);
		expect(prompt).toContain(
			"Do not flag style-only, naming-only, formatting-only, or documentation-only nits.",
		);
		expect(prompt).toContain(
			"Do not leave generic reminders to add tests, monitor the rollout, or coordinate follow-up work unless the diff shows a concrete risk.",
		);
		expect(prompt).toContain(
			"Return at most 3 issues, ordered from highest to lowest user impact.",
		);
	});

	it("returns a normalized structured review from the model response", async () => {
		const generateReview = vi.fn(async () => ({
			inlineFindings: [
				{
					body: "Wrap the worker body in retry-aware error handling before posting the review.",
					confidence: "high",
					file: "apps/api/src/workers/review-worker.ts",
					line: 34,
					severity: "medium",
					title: "Add retry guard around external API calls",
				},
			],
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
			inlineFindings: [
				{
					body: "Wrap the worker body in retry-aware error handling before posting the review.",
					confidence: "high",
					file: "apps/api/src/workers/review-worker.ts",
					line: 34,
					severity: "medium",
					title: "Add retry guard around external API calls",
				},
			],
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
						inlineFindings: [
							{
								body: "Needs a line number",
								confidence: "high",
								file: "apps/api/src/workers/review-worker.ts",
								line: "34",
								severity: "medium",
								title: "Invalid line type",
							},
						],
						issues: "not-an-array",
						overallSeverity: "high",
						summary: 42,
					}),
					model: "gemini-test",
				},
			),
		).rejects.toThrow("Gemini review response did not match expected schema");
	});

	it("uses a low-temperature JSON generation config for stable review output", async () => {
		const fetchImplementation = vi.fn(async () => ({
			json: async () => ({
				candidates: [
					{
						content: {
							parts: [
								{
									text: JSON.stringify({
										inlineFindings: [],
										issues: [],
										overallSeverity: "low",
										summary: "No actionable issues found.",
									}),
								},
							],
						},
					},
				],
			}),
			ok: true,
		}));
		const generateReview = createGeminiReviewGenerator({
			apiKey: "gemini-test-key",
			fetch: fetchImplementation as unknown as typeof fetch,
		});

		await generateReview({
			model: "gemini-test",
			prompt: "Review this pull request.",
		});

		const firstCall = fetchImplementation.mock.calls[0] as unknown as
			| [string, RequestInit]
			| undefined;
		const request = firstCall?.[1];
		expect(request).toBeDefined();
		expect(request?.method).toBe("POST");
		expect(JSON.parse(String(request?.body))).toMatchObject({
			generationConfig: {
				responseMimeType: "application/json",
				temperature: 0.1,
			},
		});
	});
});
