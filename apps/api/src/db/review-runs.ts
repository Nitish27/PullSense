import type {
	GitHubPullRequestAction,
	PullRequestReviewSeverity,
} from "@ai-code-review/shared";

export type ReviewRunStatus = "queued" | "in_progress" | "completed" | "failed";

export type ReviewRunConclusion = "success" | "failure" | "neutral" | "skipped";

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
	check_run_id: number | null;
	comment_id: number | null;
	comment_url: string | null;
	completed_at: string | null;
	conclusion: ReviewRunConclusion | null;
	created_at: string;
	error_message: string | null;
	head_sha: string;
	id: number;
	inline_review_id: number | null;
	inline_review_url: string | null;
	installation_id: number;
	overall_severity: PullRequestReviewSeverity | null;
	owner: string;
	pull_number: number;
	pull_request_action: GitHubPullRequestAction;
	repository: string;
	started_at: string | null;
	status: ReviewRunStatus;
	summary: string | null;
	updated_at: string;
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
	createQueuedReviewRun(input: CreateReviewRunInput): Promise<ReviewRunRecord>;
	getLatestReviewRunForPullRequest(
		input: ReviewRunPullRequestScope,
	): Promise<ReviewRunRecord | null>;
	getReviewRunById(reviewRunId: number): Promise<ReviewRunRecord | null>;
	listReviewRunsForPullRequest(
		input: ReviewRunPullRequestScope,
	): Promise<ReviewRunRecord[]>;
	markReviewRunCompleted(input: MarkReviewRunCompletedInput): Promise<void>;
	markReviewRunFailed(input: MarkReviewRunFailedInput): Promise<void>;
	markReviewRunInProgress(input: MarkReviewRunInProgressInput): Promise<void>;
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
}

export async function createReviewRun(
	client: ReviewRunDatabaseClient,
	input: CreateReviewRunInput,
) {
	const response = await client.query(
		`
			insert into review_runs (
				owner,
				repository,
				pull_number,
				head_sha,
				installation_id,
				pull_request_action,
				status
			)
			values ($1, $2, $3, $4, $5, $6, $7)
			returning
				${reviewRunReturningColumns}
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

	return mapReviewRunRow(response.rows[0] as ReviewRunRow);
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
			};
		},
		async getLatestReviewRunForPullRequest() {
			return null;
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
		checkRunId: row.check_run_id,
		commentId: row.comment_id,
		commentUrl: row.comment_url,
		completedAt: row.completed_at ? new Date(row.completed_at) : null,
		conclusion: row.conclusion,
		createdAt: new Date(row.created_at),
		errorMessage: row.error_message,
		headSha: row.head_sha,
		id: row.id,
		inlineReviewId: row.inline_review_id,
		inlineReviewUrl: row.inline_review_url,
		installationId: row.installation_id,
		overallSeverity: row.overall_severity,
		owner: row.owner,
		pullNumber: row.pull_number,
		pullRequestAction: row.pull_request_action,
		repository: row.repository,
		startedAt: row.started_at ? new Date(row.started_at) : null,
		status: row.status,
		summary: row.summary,
		updatedAt: new Date(row.updated_at),
	};
}
