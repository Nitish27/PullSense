import {
	createInstallationClient,
	type GitHubAppConfig,
	type PullRequestDescriptionClient,
} from "./pull-request-files";

export type { PullRequestDescriptionClient } from "./pull-request-files";

export type UpdatePullRequestDescriptionInput = {
	body: string;
	owner: string;
	pullNumber: number;
	repository: string;
};

export type UpdatePullRequestDescriptionResult = {
	htmlUrl?: string;
};

const pullSenseDescriptionStartMarker =
	"<!-- pullsense:pr-description:start -->";
const pullSenseDescriptionEndMarker = "<!-- pullsense:pr-description:end -->";
const pullSenseDescriptionBlockPattern = new RegExp(
	`${escapeRegExp(pullSenseDescriptionStartMarker)}[\\s\\S]*?${escapeRegExp(pullSenseDescriptionEndMarker)}`,
	"g",
);

export async function updatePullRequestDescription(
	client: PullRequestDescriptionClient,
	input: UpdatePullRequestDescriptionInput,
): Promise<UpdatePullRequestDescriptionResult> {
	const existingPullRequest = await client.pulls.get({
		owner: input.owner,
		pull_number: input.pullNumber,
		repo: input.repository,
	});
	const nextBody = upsertPullSenseDescriptionSection(
		existingPullRequest.data.body ?? "",
		input.body,
	);
	const response = await client.pulls.update({
		body: nextBody,
		owner: input.owner,
		pull_number: input.pullNumber,
		repo: input.repository,
	});

	return {
		htmlUrl: response.data.html_url,
	};
}

export async function updatePullRequestDescriptionForInstallation(
	config: GitHubAppConfig,
	input: UpdatePullRequestDescriptionInput & { installationId: number },
) {
	const client = await createInstallationClient(config, input.installationId);

	return updatePullRequestDescription(client, input);
}

function upsertPullSenseDescriptionSection(
	existingBody: string,
	nextSection: string,
) {
	const managedSection = [
		pullSenseDescriptionStartMarker,
		nextSection,
		pullSenseDescriptionEndMarker,
	].join("\n");
	const withoutManagedSection = existingBody
		.replace(pullSenseDescriptionBlockPattern, "")
		.trimEnd();

	if (!withoutManagedSection.trim()) {
		return managedSection;
	}

	return [withoutManagedSection, managedSection].join("\n\n");
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
