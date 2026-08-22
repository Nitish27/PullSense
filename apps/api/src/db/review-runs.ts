import type {
	GitHubPullRequestAction,
	PullRequestReviewSeverity,
} from "@ai-code-review/shared";

export type ReviewRunStatus = "queued" | "in_progress" | "completed" | "failed";

export type ReviewRunConclusion = "success" | "failure" | "neutral" | "skipped";

export type ReviewRunFailureCategory =
	| "gemini"
	| "github"
	| "database"
	| "queue"
	| "unknown";

export type ReviewRunRecord = {
	checkRunId: number | null;
	commentId: number | null;
	commentUrl: string | null;
	completedAt: Date | null;
	conclusion: ReviewRunConclusion | null;
	createdAt: Date;
	errorMessage: string | null;
	headSha: string;
	id: number;
	inlineReviewId: number | null;
	inlineReviewUrl: string | null;
	installationId: number;
	overallSeverity: PullRequestReviewSeverity | null;
	owner: string;
	pullNumber: number;
	pullRequestAction: GitHubPullRequestAction;
	repository: string;
	startedAt: Date | null;
	status: ReviewRunStatus;
	summary: string | null;
	updatedAt: Date;
};

type ReviewRunRow = {
	check_run_id: number | string | null;
	comment_id: number | string | null;
	comment_url: string | null;
	completed_at: string | null;
	conclusion: ReviewRunConclusion | null;
	created_at: string;
	error_message: string | null;
	head_sha: string;
	id: number | string;
	inline_review_id: number | string | null;
	inline_review_url: string | null;
	installation_id: number | string;
	overall_severity: PullRequestReviewSeverity | null;
	owner: string;
	pull_number: number | string;
	pull_request_action: GitHubPullRequestAction;
	repository: string;
	started_at: string | null;
	status: ReviewRunStatus;
	summary: string | null;
	updated_at: string;
	was_created?: boolean;
};

type RepositoryReviewHealthMetricsRow = {
	average_review_latency_ms: number | string | null;
	failed_runs: number | string;
	successful_runs: number | string;
	total_runs: number | string;
};

type RepositoryReviewFailureTrendRow = {
	count: number | string;
	failure_category: ReviewRunFailureCategory;
};

export type ReviewRunDatabaseClient = {
	query(
		text: string,
		values?: unknown[],
	): Promise<{
		rows: Record<string, unknown>[];
	}>;
};

export type CreateReviewRunInput = {
	headSha: string;
	installationId: number;
	owner: string;
	pullNumber: number;
	pullRequestAction: GitHubPullRequestAction;
	repository: string;
};

export type ReviewRunPullRequestScope = {
	owner: string;
	pullNumber: number;
	repository: string;
};

export type ReviewRunRepositoryScope = {
	owner: string;
	repository: string;
};

export type RepositoryReviewHealth = {
	failureTrends: Array<{
		category: ReviewRunFailureCategory;
		count: number;
	}>;
	metrics: {
		averageReviewLatencyMs: number | null;
		failedRuns: number;
		successfulRuns: number;
		totalRuns: number;
	};
	recentPullRequests: ReviewRunRecord[];
};

export type AttachCheckRunToReviewRunInput = {
	checkRunId: number;
	reviewRunId: number;
};

export type MarkReviewRunInProgressInput = {
	reviewRunId: number;
	startedAt?: Date;
};

export type MarkReviewRunCompletedInput = {
	commentId: number;
	commentUrl: string | null;
	completedAt?: Date;
	inlineReviewId: number | null;
	inlineReviewUrl: string | null;
	overallSeverity: PullRequestReviewSeverity;
	reviewRunId: number;
	summary: string;
};

export type MarkReviewRunFailedInput = {
	completedAt?: Date;
	errorMessage: string;
	reviewRunId: number;
};

export type ReviewRunStore = {
	attachCheckRunToReviewRun(
		input: AttachCheckRunToReviewRunInput,
	): Promise<void>;
	createQueuedReviewRun(
		input: CreateReviewRunInput,
	): Promise<CreateQueuedReviewRunResult>;
	getLatestReviewRunForPullRequest(
		input: ReviewRunPullRequestScope,
	): Promise<ReviewRunRecord | null>;
	getRepositoryReviewHealth(
		input: ReviewRunRepositoryScope,
	): Promise<RepositoryReviewHealth>;
	getReviewRunById(reviewRunId: number): Promise<ReviewRunRecord | null>;
	listReviewRunsForPullRequest(
		input: ReviewRunPullRequestScope,
	): Promise<ReviewRunRecord[]>;
	markReviewRunCompleted(input: MarkReviewRunCompletedInput): Promise<void>;
	markReviewRunFailed(input: MarkReviewRunFailedInput): Promise<void>;
	markReviewRunInProgress(input: MarkReviewRunInProgressInput): Promise<void>;
};

export type CreateQueuedReviewRunResult = {
	reviewRun: ReviewRunRecord;
	wasCreated: boolean;
};

const reviewRunReturningColumns = `
	id,
	owner,
	repository,
	pull_number,
	head_sha,
	installation_id,
	pull_request_action,
	status,
	conclusion,
	summary,
	overall_severity,
	comment_id,
	comment_url,
	inline_review_id,
	inline_review_url,
	check_run_id,
	error_message,
	started_at,
	completed_at,
	created_at,
	updated_at
`;

const repositoryHealthFailureCategories: ReviewRunFailureCategory[] = [
	"gemini",
	"github",
	"database",
	"queue",
	"unknown",
];

const repositoryHealthRecentPullRequestLimit = 20;

export async function ensureReviewRunsTable(client: ReviewRunDatabaseClient) {
	await client.query(`
		create table if not exists review_runs (
			id bigserial primary key,
			owner text not null,
			repository text not null,
			pull_number integer not null,
			head_sha text not null,
			installation_id bigint not null,
			pull_request_action text not null,
			status text not null,
			conclusion text,
			summary text,
			overall_severity text,
			comment_id bigint,
			comment_url text,
			inline_review_id bigint,
			inline_review_url text,
			check_run_id bigint,
			error_message text,
			started_at timestamptz,
			completed_at timestamptz,
			created_at timestamptz not null default now(),
			updated_at timestamptz not null default now()
		)
	`);

	await client.query(`
		create index if not exists review_runs_repo_pr_idx
		on review_runs (owner, repository, pull_number, created_at desc)
	`);

	await client.query(`
		create index if not exists review_runs_repository_created_at_idx
		on review_runs (owner, repository, created_at desc)
	`);

	await client.query(`
		create index if not exists review_runs_head_sha_status_idx
		on review_runs (owner, repository, pull_number, head_sha, created_at desc)
		where status <> 'failed'
	`);
}

export async function createReviewRun(
	client: ReviewRunDatabaseClient,
	input: CreateReviewRunInput,
) {
	const response = await client.query(
		`
			with review_run_dedupe_lock as (
				select pg_advisory_xact_lock(
					hashtext($1),
					hashtext($2 || ':' || ($3::integer)::text || ':' || $4)
				)
			),
			existing_review_run as (
				select
					${reviewRunReturningColumns},
					false as was_created
				from review_runs, review_run_dedupe_lock
				where
					owner = $1
					and repository = $2
					and pull_number = $3::integer
					and head_sha = $4
					and status <> 'failed'
				order by created_at desc
				limit 1
			),
			inserted_review_run as (
				insert into review_runs (
					owner,
					repository,
					pull_number,
					head_sha,
					installation_id,
					pull_request_action,
					status
				)
				select
					$1,
					$2,
					$3::integer,
					$4,
					$5::bigint,
					$6,
					$7
					from review_run_dedupe_lock
					where not exists (select 1 from existing_review_run)
					returning
						${reviewRunReturningColumns}
			)
			select
				${reviewRunReturningColumns},
				true as was_created
			from inserted_review_run
			union all
			select
				${reviewRunReturningColumns},
				was_created
			from existing_review_run
			limit 1
		`,
		[
			input.owner,
			input.repository,
			input.pullNumber,
			input.headSha,
			input.installationId,
			input.pullRequestAction,
			"queued",
		],
	);

	const row = response.rows[0] as ReviewRunRow | undefined;

	if (!row) {
		throw new Error("Failed to create or reuse review run");
	}

	return {
		reviewRun: mapReviewRunRow(row),
		wasCreated: row.was_created !== false,
	};
}

export async function listReviewRunsForPullRequest(
	client: ReviewRunDatabaseClient,
	input: ReviewRunPullRequestScope,
) {
	const response = await client.query(
		`
			select
				${reviewRunReturningColumns}
			from review_runs
			where owner = $1 and repository = $2 and pull_number = $3
			order by created_at desc
		`,
		[input.owner, input.repository, input.pullNumber],
	);

	return response.rows.map((row) => mapReviewRunRow(row as ReviewRunRow));
}

export async function getLatestReviewRunForPullRequest(
	client: ReviewRunDatabaseClient,
	input: ReviewRunPullRequestScope,
) {
	const response = await client.query(
		`
			select
				${reviewRunReturningColumns}
			from review_runs
			where owner = $1 and repository = $2 and pull_number = $3
			order by created_at desc
			limit 1
		`,
		[input.owner, input.repository, input.pullNumber],
	);

	const row = response.rows[0] as ReviewRunRow | undefined;

	return row ? mapReviewRunRow(row) : null;
}

export async function getRepositoryReviewHealth(
	client: ReviewRunDatabaseClient,
	input: ReviewRunRepositoryScope,
): Promise<RepositoryReviewHealth> {
	const metricsResponse = await client.query(
		`
			select
				count(*)::text as total_runs,
				count(*) filter (where conclusion = 'success')::text as successful_runs,
				count(*) filter (
					where status = 'failed' or conclusion = 'failure'
				)::text as failed_runs,
				avg(
					extract(epoch from (completed_at - started_at)) * 1000
				) filter (
					where
						started_at is not null
						and completed_at is not null
						and completed_at >= started_at
				) as average_review_latency_ms
			from review_runs
			where
				owner = $1
				and repository = $2
				and created_at >= now() - interval '30 days'
		`,
		[input.owner, input.repository],
	);
	const failureTrendsResponse = await client.query(
		`
			select
				case
					when lower(error_message) like '%gemini%' then 'gemini'
					when lower(error_message) like '%github%'
						or lower(error_message) like '%octokit%' then 'github'
					when lower(error_message) like '%postgres%'
						or lower(error_message) like '%database%'
						or lower(error_message) like '%sql%' then 'database'
					when lower(error_message) like '%bullmq%'
						or lower(error_message) like '%redis%'
						or lower(error_message) like '%queue%' then 'queue'
					else 'unknown'
				end as failure_category,
				count(*)::text as count
			from review_runs
			where
				owner = $1
				and repository = $2
				and error_message is not null
				and (status = 'failed' or conclusion = 'failure')
				and created_at >= now() - interval '30 days'
			group by failure_category
		`,
		[input.owner, input.repository],
	);
	const recentPullRequestsResponse = await client.query(
		`
			select
				${reviewRunReturningColumns}
			from (
				select distinct on (pull_number)
					${reviewRunReturningColumns}
				from review_runs
				where
					owner = $1
					and repository = $2
					and created_at >= now() - interval '30 days'
				order by pull_number, created_at desc
			) as latest_review_runs
			order by created_at desc
			limit $3::integer
		`,
		[input.owner, input.repository, repositoryHealthRecentPullRequestLimit],
	);

	const metricsRow = metricsResponse.rows[0] as
		| RepositoryReviewHealthMetricsRow
		| undefined;
	const failureTrendCounts = new Map<ReviewRunFailureCategory, number>();

	for (const row of failureTrendsResponse.rows) {
		const failureTrend = row as RepositoryReviewFailureTrendRow;
		failureTrendCounts.set(
			failureTrend.failure_category,
			normalizeRequiredIntegerField(
				failureTrend.count,
				"repository failure trend count",
			),
		);
	}

	return {
		failureTrends: repositoryHealthFailureCategories.map((category) => ({
			category,
			count: failureTrendCounts.get(category) ?? 0,
		})),
		metrics: {
			averageReviewLatencyMs: normalizeDecimalField(
				metricsRow?.average_review_latency_ms ?? null,
			),
			failedRuns: normalizeRequiredIntegerField(
				metricsRow?.failed_runs ?? 0,
				"failed_runs",
			),
			successfulRuns: normalizeRequiredIntegerField(
				metricsRow?.successful_runs ?? 0,
				"successful_runs",
			),
			totalRuns: normalizeRequiredIntegerField(
				metricsRow?.total_runs ?? 0,
				"total_runs",
			),
		},
		recentPullRequests: recentPullRequestsResponse.rows.map((row) =>
			mapReviewRunRow(row as ReviewRunRow),
		),
	};
}

export async function getReviewRunById(
	client: ReviewRunDatabaseClient,
	reviewRunId: number,
) {
	const response = await client.query(
		`
			select
				${reviewRunReturningColumns}
			from review_runs
			where id = $1
		`,
		[reviewRunId],
	);

	const row = response.rows[0] as ReviewRunRow | undefined;

	return row ? mapReviewRunRow(row) : null;
}

export async function attachCheckRunToReviewRun(
	client: ReviewRunDatabaseClient,
	input: AttachCheckRunToReviewRunInput,
) {
	await client.query(
		`
			update review_runs
			set
				check_run_id = $1,
				updated_at = now()
			where id = $2
		`,
		[input.checkRunId, input.reviewRunId],
	);
}

export async function markReviewRunInProgress(
	client: ReviewRunDatabaseClient,
	input: MarkReviewRunInProgressInput,
) {
	await client.query(
		`
			update review_runs
			set
				status = $1,
				started_at = $2,
				updated_at = now()
			where id = $3
		`,
		["in_progress", input.startedAt ?? new Date(), input.reviewRunId],
	);
}

export async function markReviewRunCompleted(
	client: ReviewRunDatabaseClient,
	input: MarkReviewRunCompletedInput,
) {
	await client.query(
		`
			update review_runs
			set
				status = $1,
				conclusion = $2,
				summary = $3,
				overall_severity = $4,
				comment_id = $5,
				comment_url = $6,
				inline_review_id = $7,
				inline_review_url = $8,
				completed_at = $9,
				updated_at = now()
			where id = $10
		`,
		[
			"completed",
			"success",
			input.summary,
			input.overallSeverity,
			input.commentId,
			input.commentUrl,
			input.inlineReviewId,
			input.inlineReviewUrl,
			input.completedAt ?? new Date(),
			input.reviewRunId,
		],
	);
}

export async function markReviewRunFailed(
	client: ReviewRunDatabaseClient,
	input: MarkReviewRunFailedInput,
) {
	await client.query(
		`
			update review_runs
			set
				status = $1,
				conclusion = $2,
				error_message = $3,
				completed_at = $4,
				updated_at = now()
			where id = $5
		`,
		[
			"failed",
			"failure",
			input.errorMessage,
			input.completedAt ?? new Date(),
			input.reviewRunId,
		],
	);
}

export function createPostgresReviewRunStore(
	client: ReviewRunDatabaseClient,
): ReviewRunStore {
	return {
		attachCheckRunToReviewRun: (input) =>
			attachCheckRunToReviewRun(client, input),
		createQueuedReviewRun: (input) => createReviewRun(client, input),
		getLatestReviewRunForPullRequest: (input) =>
			getLatestReviewRunForPullRequest(client, input),
		getRepositoryReviewHealth: (input) =>
			getRepositoryReviewHealth(client, input),
		getReviewRunById: (reviewRunId) => getReviewRunById(client, reviewRunId),
		listReviewRunsForPullRequest: (input) =>
			listReviewRunsForPullRequest(client, input),
		markReviewRunCompleted: (input) => markReviewRunCompleted(client, input),
		markReviewRunFailed: (input) => markReviewRunFailed(client, input),
		markReviewRunInProgress: (input) => markReviewRunInProgress(client, input),
	};
}

export function createNoopReviewRunStore(): ReviewRunStore {
	return {
		async attachCheckRunToReviewRun() {
			return undefined;
		},
		async createQueuedReviewRun(input) {
			const now = new Date();

			return {
				reviewRun: {
					checkRunId: null,
					commentId: null,
					commentUrl: null,
					completedAt: null,
					conclusion: null,
					createdAt: now,
					errorMessage: null,
					headSha: input.headSha,
					id: 0,
					inlineReviewId: null,
					inlineReviewUrl: null,
					installationId: input.installationId,
					overallSeverity: null,
					owner: input.owner,
					pullNumber: input.pullNumber,
					pullRequestAction: input.pullRequestAction,
					repository: input.repository,
					startedAt: null,
					status: "queued",
					summary: null,
					updatedAt: now,
				},
				wasCreated: true,
			};
		},
		async getLatestReviewRunForPullRequest() {
			return null;
		},
		async getRepositoryReviewHealth() {
			return {
				failureTrends: repositoryHealthFailureCategories.map((category) => ({
					category,
					count: 0,
				})),
				metrics: {
					averageReviewLatencyMs: null,
					failedRuns: 0,
					successfulRuns: 0,
					totalRuns: 0,
				},
				recentPullRequests: [],
			};
		},
		async getReviewRunById() {
			return null;
		},
		async listReviewRunsForPullRequest() {
			return [];
		},
		async markReviewRunCompleted() {
			return undefined;
		},
		async markReviewRunFailed() {
			return undefined;
		},
		async markReviewRunInProgress() {
			return undefined;
		},
	};
}

function mapReviewRunRow(row: ReviewRunRow): ReviewRunRecord {
	return {
		checkRunId: normalizeIntegerField(row.check_run_id),
		commentId: normalizeIntegerField(row.comment_id),
		commentUrl: row.comment_url,
		completedAt: row.completed_at ? new Date(row.completed_at) : null,
		conclusion: row.conclusion,
		createdAt: new Date(row.created_at),
		errorMessage: row.error_message,
		headSha: row.head_sha,
		id: normalizeRequiredIntegerField(row.id, "id"),
		inlineReviewId: normalizeIntegerField(row.inline_review_id),
		inlineReviewUrl: row.inline_review_url,
		installationId: normalizeRequiredIntegerField(
			row.installation_id,
			"installation_id",
		),
		overallSeverity: row.overall_severity,
		owner: row.owner,
		pullNumber: normalizeRequiredIntegerField(row.pull_number, "pull_number"),
		pullRequestAction: row.pull_request_action,
		repository: row.repository,
		startedAt: row.started_at ? new Date(row.started_at) : null,
		status: row.status,
		summary: row.summary,
		updatedAt: new Date(row.updated_at),
	};
}

function normalizeIntegerField(value: number | string | null) {
	if (value === null) {
		return null;
	}

	return normalizeRequiredIntegerField(value, "review run numeric field");
}

function normalizeRequiredIntegerField(
	value: number | string,
	fieldName: string,
) {
	if (typeof value === "number") {
		return value;
	}

	const parsed = Number.parseInt(value, 10);

	if (Number.isNaN(parsed)) {
		throw new Error(`Invalid integer value for ${fieldName}: ${value}`);
	}

	return parsed;
}

function normalizeDecimalField(value: number | string | null) {
	if (value === null) {
		return null;
	}

	const parsed = typeof value === "number" ? value : Number.parseFloat(value);

	if (Number.isNaN(parsed)) {
		throw new Error(`Invalid decimal value for review run metric: ${value}`);
	}

	return Math.round(parsed);
}
