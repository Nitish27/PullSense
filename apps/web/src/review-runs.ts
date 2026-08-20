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

export type ReviewRunsRouteParams = {
	owner?: string;
	pullNumber?: string;
	repository?: string;
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
	const form = readReviewRunsFormValues(input.searchParams);

	if (!form.owner && !form.repository && !form.pullNumber) {
		return {
			apiBaseUrl: input.apiBaseUrl,
			form,
			state: "idle",
		};
	}

	const lookup = parseReviewRunsLookup(form);

	if (!lookup.success) {
		return {
			apiBaseUrl: input.apiBaseUrl,
			error: lookup.error,
			form,
			state: "error",
		};
	}

	return loadReadyReviewRunsPageData({
		apiBaseUrl: input.apiBaseUrl,
		fetchImplementation: input.fetchImplementation,
		form,
		lookup: lookup.data,
	});
}

export async function loadReviewRunsDetailPageData(input: {
	apiBaseUrl: string;
	fetchImplementation?: typeof fetch;
	params?: ReviewRunsRouteParams;
}): Promise<ReviewRunsPageData> {
	const form = {
		owner: input.params?.owner ?? "",
		pullNumber: input.params?.pullNumber ?? "",
		repository: input.params?.repository ?? "",
	};

	const lookup = parseReviewRunsLookup(form);

	if (!lookup.success) {
		return {
			apiBaseUrl: input.apiBaseUrl,
			error: lookup.error,
			form,
			state: "error",
		};
	}

	return loadReadyReviewRunsPageData({
		apiBaseUrl: input.apiBaseUrl,
		fetchImplementation: input.fetchImplementation,
		form,
		lookup: lookup.data,
	});
}

export function buildReviewRunsDetailPath(input: {
	owner: string;
	pullNumber: number | string;
	repository: string;
}) {
	return `/pull-requests/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repository)}/${input.pullNumber}`;
}

export function buildReviewRunsSearchPath(input: {
	owner: string;
	pullNumber: number | string;
	repository: string;
}) {
	const searchParams = new URLSearchParams({
		owner: input.owner,
		pullNumber: String(input.pullNumber),
		repository: input.repository,
	});

	return `/?${searchParams.toString()}`;
}

async function loadReadyReviewRunsPageData(input: {
	apiBaseUrl: string;
	fetchImplementation?: typeof fetch;
	form: ReviewRunsFormValues;
	lookup: ReviewRunsLookupSuccess["data"];
}): Promise<ReviewRunsPageData> {
	const fetchImplementation = input.fetchImplementation ?? fetch;
	const requestUrl = buildReviewRunsRequestUrl({
		apiBaseUrl: input.apiBaseUrl,
		owner: input.lookup.owner,
		pullNumber: input.lookup.pullNumber,
		repository: input.lookup.repository,
	});

	try {
		const response = await fetchImplementation(requestUrl, {
			cache: "no-store",
		});

		if (!response.ok) {
			return {
				apiBaseUrl: input.apiBaseUrl,
				error: `PullSense could not load review runs right now (HTTP ${response.status}).`,
				form: input.form,
				state: "error",
			};
		}

		const parsed = reviewRunsResponseSchema.safeParse(await response.json());

		if (!parsed.success) {
			return {
				apiBaseUrl: input.apiBaseUrl,
				error: "PullSense received an unexpected review history response.",
				form: input.form,
				state: "error",
			};
		}

		return {
			apiBaseUrl: input.apiBaseUrl,
			data: parsed.data,
			form: input.form,
			state: "ready",
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown request failure";

		return {
			apiBaseUrl: input.apiBaseUrl,
			error: `PullSense could not reach the API: ${message}.`,
			form: input.form,
			state: "error",
		};
	}
}

type ReviewRunsLookup =
	| {
			data: {
				owner: string;
				pullNumber: number;
				repository: string;
			};
			success: true;
	  }
	| {
			error: string;
			success: false;
	  };

type ReviewRunsLookupSuccess = Extract<ReviewRunsLookup, { success: true }>;

function readReviewRunsFormValues(
	searchParams?: ReviewRunsPageSearchParams,
): ReviewRunsFormValues {
	return {
		owner: readFirstSearchParam(searchParams?.owner),
		pullNumber: readFirstSearchParam(searchParams?.pullNumber),
		repository: readFirstSearchParam(searchParams?.repository),
	};
}

function parseReviewRunsLookup(form: ReviewRunsFormValues): ReviewRunsLookup {
	const pullNumber = Number.parseInt(form.pullNumber, 10);

	if (
		!form.owner ||
		!form.repository ||
		!form.pullNumber ||
		Number.isNaN(pullNumber) ||
		pullNumber <= 0
	) {
		return {
			error: "Pull request number must be a positive integer.",
			success: false,
		};
	}

	return {
		data: {
			owner: form.owner,
			pullNumber,
			repository: form.repository,
		},
		success: true,
	};
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
