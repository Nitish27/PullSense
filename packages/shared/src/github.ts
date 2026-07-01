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

export type PullRequestReviewSeverity = "high" | "medium" | "low";
export type PullRequestReviewConfidence = "high" | "medium" | "low";

export type PullRequestReviewFile = {
	filename: string;
	patch?: string;
	sha: string | null;
	status: string;
};

export type PullRequestReviewInput = {
	files: PullRequestReviewFile[];
	headSha: string;
	owner: string;
	pullNumber: number;
	repository: string;
};

export type PullRequestReviewIssue = {
	body: string;
	file?: string;
	severity: PullRequestReviewSeverity;
	title: string;
};

export type PullRequestInlineFinding = {
	body: string;
	confidence: PullRequestReviewConfidence;
	file: string;
	line: number;
	severity: PullRequestReviewSeverity;
	title: string;
};

export type PullRequestReview = {
	inlineFindings: PullRequestInlineFinding[];
	issues: PullRequestReviewIssue[];
	overallSeverity: PullRequestReviewSeverity;
	summary: string;
};
