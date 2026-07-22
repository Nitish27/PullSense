import { z } from "zod";

const serializedReviewRunSchema = z.object({
	checkRunId: z.number().nullable(),
	commentId: z.number().nullable(),
	commentUrl: z.string().nullable(),
	completedAt: z.string().nullable(),
	conclusion: z.enum(["success", "failure", "neutral", "skipped"]).nullable(),
	createdAt: z.string(),
	errorMessage: z.string().nullable(),
	headSha: z.string(),
	id: z.number(),
	inlineReviewId: z.number().nullable(),
	inlineReviewUrl: z.string().nullable(),
	installationId: z.number(),
	overallSeverity: z.enum(["high", "medium", "low"]).nullable(),
	owner: z.string(),
	pullNumber: z.number(),
	pullRequestAction: z.enum(["opened", "synchronize"]),
	repository: z.string(),
	startedAt: z.string().nullable(),
	status: z.enum(["queued", "in_progress", "completed", "failed"]),
	summary: z.string().nullable(),
	updatedAt: z.string(),
});

const reviewRunsResponseSchema = z.object({
	latest: serializedReviewRunSchema.nullable(),
	owner: z.string(),
	pullNumber: z.number(),
	repository: z.string(),
	runs: z.array(serializedReviewRunSchema),
});

type SearchParamValue = string | string[] | undefined;

export type ReviewRunsPageSearchParams = {
	owner?: SearchParamValue;
	pullNumber?: SearchParamValue;
	repository?: SearchParamValue;
};

export type ReviewRunsResponse = z.infer<typeof reviewRunsResponseSchema>;

type ReviewRunsFormValues = {
	owner: string;
	pullNumber: string;
	repository: string;
};

export type ReviewRunsPageData =
	| {
			apiBaseUrl: string;
			form: ReviewRunsFormValues;
			state: "idle";
	  }
	| {
			apiBaseUrl: string;
			error: string;
			form: ReviewRunsFormValues;
			state: "error";
	  }
	| {
			apiBaseUrl: string;
			data: ReviewRunsResponse;
			form: ReviewRunsFormValues;
			state: "ready";
	  };

export async function loadReviewRunsPageData(input: {
	apiBaseUrl: string;
	fetchImplementation?: typeof fetch;
	searchParams?: ReviewRunsPageSearchParams;
}): Promise<ReviewRunsPageData> {
	const form = {
		owner: readFirstSearchParam(input.searchParams?.owner),
		pullNumber: readFirstSearchParam(input.searchParams?.pullNumber),
		repository: readFirstSearchParam(input.searchParams?.repository),
	};

	if (!form.owner && !form.repository && !form.pullNumber) {
		return {
			apiBaseUrl: input.apiBaseUrl,
			form,
			state: "idle",
		};
	}

	const pullNumber = Number.parseInt(form.pullNumber, 10);

	if (
		!form.owner ||
		!form.repository ||
		!form.pullNumber ||
		Number.isNaN(pullNumber) ||
		pullNumber <= 0
	) {
		return {
			apiBaseUrl: input.apiBaseUrl,
			error: "Pull request number must be a positive integer.",
			form,
			state: "error",
		};
	}

	const fetchImplementation = input.fetchImplementation ?? fetch;
	const requestUrl = buildReviewRunsRequestUrl({
		apiBaseUrl: input.apiBaseUrl,
		owner: form.owner,
		pullNumber,
		repository: form.repository,
	});

	try {
		const response = await fetchImplementation(requestUrl, {
			cache: "no-store",
		});

		if (!response.ok) {
			return {
				apiBaseUrl: input.apiBaseUrl,
				error: `PullSense could not load review runs right now (HTTP ${response.status}).`,
				form,
				state: "error",
			};
		}

		const parsed = reviewRunsResponseSchema.safeParse(await response.json());

		if (!parsed.success) {
			return {
				apiBaseUrl: input.apiBaseUrl,
				error: "PullSense received an unexpected review history response.",
				form,
				state: "error",
			};
		}

		return {
			apiBaseUrl: input.apiBaseUrl,
			data: parsed.data,
			form,
			state: "ready",
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown request failure";

		return {
			apiBaseUrl: input.apiBaseUrl,
			error: `PullSense could not reach the API: ${message}.`,
			form,
			state: "error",
		};
	}
}

function readFirstSearchParam(value: SearchParamValue) {
	if (Array.isArray(value)) {
		return value[0] ?? "";
	}

	return value ?? "";
}

function buildReviewRunsRequestUrl(input: {
	apiBaseUrl: string;
	owner: string;
	pullNumber: number;
	repository: string;
}) {
	const apiBaseUrl = input.apiBaseUrl.replace(/\/$/, "");

	return `${apiBaseUrl}/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repository)}/pulls/${input.pullNumber}/review-runs`;
}
