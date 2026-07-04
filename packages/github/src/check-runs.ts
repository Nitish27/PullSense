import {
	createInstallationClient,
	type GitHubAppConfig,
	type PullRequestCheckRunClient,
} from "./pull-request-files";

export type { PullRequestCheckRunClient } from "./pull-request-files";

export type PullRequestCheckRunStatus = "queued" | "in_progress" | "completed";

export type PullRequestCheckRunConclusion =
	| "success"
	| "failure"
	| "neutral"
	| "skipped";

export type CreateCheckRunInput = {
	detailsUrl?: string;
	externalId?: string;
	headSha: string;
	owner: string;
	repository: string;
	status: Exclude<PullRequestCheckRunStatus, "completed">;
	summary: string;
	title: string;
};

export type UpdateCheckRunInput = {
	checkRunId: number;
	conclusion?: PullRequestCheckRunConclusion;
	detailsUrl?: string;
	owner: string;
	repository: string;
	status: PullRequestCheckRunStatus;
	summary: string;
	title: string;
};

export type PullRequestCheckRunResult = {
	htmlUrl?: string;
	id: number;
};

const pullSenseCheckRunName = "PullSense review";

export async function createCheckRun(
	client: PullRequestCheckRunClient,
	input: CreateCheckRunInput,
): Promise<PullRequestCheckRunResult> {
	const response = await client.checks.create({
		details_url: input.detailsUrl,
		external_id: input.externalId,
		head_sha: input.headSha,
		name: pullSenseCheckRunName,
		output: {
			summary: input.summary,
			title: input.title,
		},
		owner: input.owner,
		repo: input.repository,
		status: input.status,
	});

	return {
		htmlUrl: response.data.html_url ?? undefined,
		id: response.data.id,
	};
}

export async function createCheckRunForInstallation(
	config: GitHubAppConfig,
	input: CreateCheckRunInput & { installationId: number },
) {
	const client = await createInstallationClient(config, input.installationId);

	return createCheckRun(client, input);
}

export async function updateCheckRun(
	client: PullRequestCheckRunClient,
	input: UpdateCheckRunInput,
): Promise<PullRequestCheckRunResult> {
	const response = await client.checks.update({
		check_run_id: input.checkRunId,
		completed_at:
			input.status === "completed" ? new Date().toISOString() : undefined,
		conclusion: input.conclusion,
		details_url: input.detailsUrl,
		name: pullSenseCheckRunName,
		output: {
			summary: input.summary,
			title: input.title,
		},
		owner: input.owner,
		repo: input.repository,
		status: input.status,
	});

	return {
		htmlUrl: response.data.html_url ?? undefined,
		id: response.data.id,
	};
}

export async function updateCheckRunForInstallation(
	config: GitHubAppConfig,
	input: UpdateCheckRunInput & { installationId: number },
) {
	const client = await createInstallationClient(config, input.installationId);

	return updateCheckRun(client, input);
}
