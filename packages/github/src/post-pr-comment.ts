import {
	createInstallationClient,
	type GitHubAppConfig,
	type PullRequestCommentClient,
} from "./pull-request-files";

export type { PullRequestCommentClient } from "./pull-request-files";

export type PostPullRequestCommentInput = {
	body: string;
	owner: string;
	pullNumber: number;
	repository: string;
};

export type PostPullRequestCommentResult = {
	htmlUrl?: string;
	id: number;
};

export async function postPullRequestComment(
	client: PullRequestCommentClient,
	input: PostPullRequestCommentInput,
): Promise<PostPullRequestCommentResult> {
	const response = await client.issues.createComment({
		body: input.body,
		issue_number: input.pullNumber,
		owner: input.owner,
		repo: input.repository,
	});

	return {
		htmlUrl: response.data.html_url,
		id: response.data.id,
	};
}

export async function postPullRequestCommentForInstallation(
	config: GitHubAppConfig,
	input: PostPullRequestCommentInput & { installationId: number },
) {
	const client = await createInstallationClient(config, input.installationId);

	return postPullRequestComment(client, input);
}
