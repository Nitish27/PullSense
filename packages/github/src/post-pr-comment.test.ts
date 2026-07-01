import { describe, expect, it, vi } from "vitest";

import {
	type PullRequestCommentClient,
	postPullRequestComment,
} from "./post-pr-comment";

describe("postPullRequestComment", () => {
	it("posts a pull request summary comment to the PR conversation", async () => {
		const listComments = vi.fn(async () => ({
			data: [],
		}));
		const createComment = vi.fn(async () => ({
			data: {
				html_url: "https://github.com/Nitish27/PullSense/pull/1#issuecomment-1",
				id: 1,
			},
		}));
		const updateComment = vi.fn();
		const client: PullRequestCommentClient = {
			issues: {
				createComment,
				listComments,
				updateComment,
			},
		};

		const comment = await postPullRequestComment(client, {
			body: [
				"<!-- pullsense:summary -->",
				"## PullSense review",
				"",
				"Looks good overall.",
			].join("\n"),
			owner: "Nitish27",
			pullNumber: 1,
			repository: "PullSense",
		});

		expect(listComments).toHaveBeenCalledWith({
			issue_number: 1,
			owner: "Nitish27",
			per_page: 100,
			repo: "PullSense",
		});
		expect(createComment).toHaveBeenCalledWith({
			body: [
				"<!-- pullsense:summary -->",
				"## PullSense review",
				"",
				"Looks good overall.",
			].join("\n"),
			issue_number: 1,
			owner: "Nitish27",
			repo: "PullSense",
		});
		expect(comment).toEqual({
			htmlUrl: "https://github.com/Nitish27/PullSense/pull/1#issuecomment-1",
			id: 1,
		});
	});

	it("updates the latest PullSense-managed summary comment when one already exists", async () => {
		const listComments = vi.fn(async () => ({
			data: [
				{
					body: "A human comment that should be left alone.",
					html_url:
						"https://github.com/Nitish27/PullSense/pull/1#issuecomment-1",
					id: 1,
				},
				{
					body: [
						"<!-- pullsense:summary -->",
						"## PullSense review",
						"",
						"Older summary body.",
					].join("\n"),
					html_url:
						"https://github.com/Nitish27/PullSense/pull/1#issuecomment-2",
					id: 2,
				},
			],
		}));
		const createComment = vi.fn();
		const updateComment = vi.fn(async () => ({
			data: {
				html_url: "https://github.com/Nitish27/PullSense/pull/1#issuecomment-2",
				id: 2,
			},
		}));
		const client: PullRequestCommentClient = {
			issues: {
				createComment,
				listComments,
				updateComment,
			},
		};

		const comment = await postPullRequestComment(client, {
			body: [
				"<!-- pullsense:summary -->",
				"## PullSense review",
				"",
				"Updated summary body.",
			].join("\n"),
			owner: "Nitish27",
			pullNumber: 1,
			repository: "PullSense",
		});

		expect(updateComment).toHaveBeenCalledWith({
			body: [
				"<!-- pullsense:summary -->",
				"## PullSense review",
				"",
				"Updated summary body.",
			].join("\n"),
			comment_id: 2,
			owner: "Nitish27",
			repo: "PullSense",
		});
		expect(createComment).not.toHaveBeenCalled();
		expect(comment).toEqual({
			htmlUrl: "https://github.com/Nitish27/PullSense/pull/1#issuecomment-2",
			id: 2,
		});
	});
});
