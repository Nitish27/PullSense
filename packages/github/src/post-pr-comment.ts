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

const pullSenseSummaryMarker = "<!-- pullsense:summary -->";

export async function postPullRequestComment(
	client: PullRequestCommentClient,
	input: PostPullRequestCommentInput,
): Promise<PostPullRequestCommentResult> {
	const existingComment = await findExistingPullSenseSummaryComment(
		client,
		input,
	);
	const response = existingComment
		? await client.issues.updateComment({
				body: input.body,
				comment_id: existingComment.id,
				owner: input.owner,
				repo: input.repository,
			})
		: await client.issues.createComment({
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

async function findExistingPullSenseSummaryComment(
	client: PullRequestCommentClient,
	input: PostPullRequestCommentInput,
) {
	const response = await client.issues.listComments({
		issue_number: input.pullNumber,
		owner: input.owner,
		per_page: 100,
		repo: input.repository,
	});

	return [...response.data]
		.reverse()
		.find((comment) => comment.body?.includes(pullSenseSummaryMarker));
}
