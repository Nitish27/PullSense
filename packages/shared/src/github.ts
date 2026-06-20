export type GitHubPullRequestAction = "opened" | "synchronize";

export type GitHubPullRequestWebhookPayload = {
	action: string;
	installation?: {
		id: number;
	};
	pull_request: {
		number: number;
		head: {
			sha: string;
		};
	};
	repository: {
		name: string;
		owner: {
			login: string;
		};
	};
};

export type PullReviewJob = {
	action: GitHubPullRequestAction;
	installationId: number;
	owner: string;
	pullNumber: number;
	repository: string;
	headSha: string;
};
