import type {
	PullRequestReview,
	PullRequestReviewInput,
	PullRequestReviewSeverity,
} from "@ai-code-review/shared";
import { z } from "zod";

const reviewIssueSchema = z.object({
	body: z.string().min(1),
	file: z.string().min(1).optional(),
	severity: z.enum(["high", "medium", "low"]),
	title: z.string().min(1),
});

const pullRequestReviewSchema = z.object({
	issues: z.array(reviewIssueSchema),
	overallSeverity: z.enum(["high", "medium", "low"]),
	summary: z.string().min(1),
});

const geminiResponseSchema = z.object({
	candidates: z
		.array(
			z.object({
				content: z
					.object({
						parts: z.array(
							z.object({
								text: z.string().optional(),
							}),
						),
					})
					.optional(),
			}),
		)
		.default([]),
});

export type ReviewPullRequestDependencies = {
	generateReview(input: { model: string; prompt: string }): Promise<unknown>;
};

export type ReviewPullRequestOptions = ReviewPullRequestDependencies & {
	model: string;
};

export type GeminiReviewGeneratorOptions = {
	apiBaseUrl?: string;
	apiKey: string;
	fetch?: typeof fetch;
};

export function buildReviewPrompt(input: PullRequestReviewInput) {
	const fileSections = input.files
		.slice(0, 20)
		.map((file, index) =>
			[
				`File ${index + 1}: ${file.filename}`,
				`Status: ${file.status}`,
				`SHA: ${file.sha ?? "missing"}`,
				"Patch:",
				file.patch ? truncatePatch(file.patch) : "No patch provided.",
			].join("\n"),
		)
		.join("\n\n");

	return [
		"You are reviewing a GitHub pull request.",
		`Repository: ${input.owner}/${input.repository}`,
		`Pull request: #${input.pullNumber}`,
		`Head SHA: ${input.headSha}`,
		`Changed files: ${input.files.length}`,
		"",
		"Return only JSON with this shape:",
		'{ "summary": string, "overallSeverity": "high" | "medium" | "low", "issues": [{ "title": string, "body": string, "severity": "high" | "medium" | "low", "file"?: string }] }',
		"",
		"Rules:",
		"- Focus on correctness, regressions, and operational risk.",
		"- Keep the summary concise.",
		"- Use an empty issues array when no actionable problem is found.",
		"- Do not include markdown fences or extra prose.",
		"",
		fileSections || "No changed files were supplied.",
	].join("\n");
}

export async function reviewPullRequest(
	input: PullRequestReviewInput,
	options: ReviewPullRequestOptions,
): Promise<PullRequestReview> {
	const prompt = buildReviewPrompt(input);
	const result = await options.generateReview({
		model: options.model,
		prompt,
	});
	const parsed = pullRequestReviewSchema.safeParse(result);

	if (!parsed.success) {
		throw new Error("Gemini review response did not match expected schema");
	}

	return parsed.data;
}

export function createGeminiReviewGenerator(
	options: GeminiReviewGeneratorOptions,
): ReviewPullRequestDependencies["generateReview"] {
	const fetchImplementation = options.fetch ?? fetch;
	const apiBaseUrl =
		options.apiBaseUrl ?? "https://generativelanguage.googleapis.com/v1beta";

	return async ({ model, prompt }) => {
		const response = await fetchImplementation(
			`${apiBaseUrl}/models/${model}:generateContent`,
			{
				body: JSON.stringify({
					contents: [
						{
							parts: [{ text: prompt }],
							role: "user",
						},
					],
					generationConfig: {
						responseMimeType: "application/json",
						temperature: 0.2,
					},
				}),
				headers: {
					"content-type": "application/json",
					"x-goog-api-key": options.apiKey,
				},
				method: "POST",
			},
		);

		if (!response.ok) {
			throw new Error(`Gemini request failed with status ${response.status}`);
		}

		const payload = geminiResponseSchema.parse(await response.json());
		const text = extractGeminiText(payload);

		if (!text) {
			throw new Error("Gemini response did not include review content");
		}

		try {
			return JSON.parse(text) as unknown;
		} catch {
			throw new Error("Gemini review response was not valid JSON");
		}
	};
}

function extractGeminiText(payload: z.infer<typeof geminiResponseSchema>) {
	for (const candidate of payload.candidates) {
		for (const part of candidate.content?.parts ?? []) {
			if (part.text) {
				return part.text;
			}
		}
	}

	return undefined;
}

function truncatePatch(patch: string) {
	const maximumPatchCharacters = 6_000;

	if (patch.length <= maximumPatchCharacters) {
		return patch;
	}

	return `${patch.slice(0, maximumPatchCharacters)}\n...[truncated]`;
}

export const reviewSeverities: PullRequestReviewSeverity[] = [
	"high",
	"medium",
	"low",
];
