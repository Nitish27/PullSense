import { describe, expect, it, vi } from "vitest";

import {
	type PullRequestCommentClient,
	postPullRequestComment,
} from "./post-pr-comment";

describe("postPullRequestComment", () => {
	it("posts a pull request summary comment to the PR conversation", async () => {
		const createComment = vi.fn(async () => ({
			data: {
				html_url: "https://github.com/Nitish27/PullSense/pull/1#issuecomment-1",
				id: 1,
			},
		}));
		const client: PullRequestCommentClient = {
			issues: {
				createComment,
			},
		};

		const comment = await postPullRequestComment(client, {
			body: "## PullSense review\n\nLooks good overall.",
			owner: "Nitish27",
			pullNumber: 1,
			repository: "PullSense",
		});

		expect(createComment).toHaveBeenCalledWith({
			body: "## PullSense review\n\nLooks good overall.",
			issue_number: 1,
			owner: "Nitish27",
			repo: "PullSense",
		});
		expect(comment).toEqual({
			htmlUrl: "https://github.com/Nitish27/PullSense/pull/1#issuecomment-1",
			id: 1,
		});
	});
});
