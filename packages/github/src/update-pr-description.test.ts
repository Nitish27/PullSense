import { describe, expect, it, vi } from "vitest";

import {
	type PullRequestDescriptionClient,
	updatePullRequestDescription,
} from "./update-pr-description";

describe("updatePullRequestDescription", () => {
	it("appends a managed PullSense section when the PR has no existing managed block", async () => {
		const get = vi.fn(async () => ({
			data: {
				body: "## Context\n\nThis PR adds retry handling.",
				html_url: "https://github.com/Nitish27/PullSense/pull/1",
			},
		}));
		const update = vi.fn(async () => ({
			data: {
				body: "updated",
				html_url: "https://github.com/Nitish27/PullSense/pull/1",
			},
		}));
		const client: PullRequestDescriptionClient = {
			pulls: {
				get,
				update,
			},
		};

		const result = await updatePullRequestDescription(client, {
			body: [
				"## PullSense summary",
				"",
				"- Overall severity: MEDIUM",
				"- Summary comment: https://github.com/Nitish27/PullSense/pull/1#issuecomment-1",
			].join("\n"),
			owner: "Nitish27",
			pullNumber: 1,
			repository: "PullSense",
		});

		expect(get).toHaveBeenCalledWith({
			owner: "Nitish27",
			pull_number: 1,
			repo: "PullSense",
		});
		expect(update).toHaveBeenCalledWith({
			body: [
				"## Context",
				"",
				"This PR adds retry handling.",
				"",
				"<!-- pullsense:pr-description:start -->",
				"## PullSense summary",
				"",
				"- Overall severity: MEDIUM",
				"- Summary comment: https://github.com/Nitish27/PullSense/pull/1#issuecomment-1",
				"<!-- pullsense:pr-description:end -->",
			].join("\n"),
			owner: "Nitish27",
			pull_number: 1,
			repo: "PullSense",
		});
		expect(result).toEqual({
			htmlUrl: "https://github.com/Nitish27/PullSense/pull/1",
		});
	});

	it("replaces the latest managed PullSense section and preserves the user-written description", async () => {
		const get = vi.fn(async () => ({
			data: {
				body: [
					"## Context",
					"",
					"This PR adds retry handling.",
					"",
					"<!-- pullsense:pr-description:start -->",
					"## PullSense summary",
					"",
					"- Overall severity: LOW",
					"<!-- pullsense:pr-description:end -->",
				].join("\n"),
				html_url: "https://github.com/Nitish27/PullSense/pull/1",
			},
		}));
		const update = vi.fn(async () => ({
			data: {
				body: "updated",
				html_url: "https://github.com/Nitish27/PullSense/pull/1",
			},
		}));
		const client: PullRequestDescriptionClient = {
			pulls: {
				get,
				update,
			},
		};

		await updatePullRequestDescription(client, {
			body: [
				"## PullSense summary",
				"",
				"- Overall severity: MEDIUM",
				"- Summary comment: https://github.com/Nitish27/PullSense/pull/1#issuecomment-2",
			].join("\n"),
			owner: "Nitish27",
			pullNumber: 1,
			repository: "PullSense",
		});

		expect(update).toHaveBeenCalledWith({
			body: [
				"## Context",
				"",
				"This PR adds retry handling.",
				"",
				"<!-- pullsense:pr-description:start -->",
				"## PullSense summary",
				"",
				"- Overall severity: MEDIUM",
				"- Summary comment: https://github.com/Nitish27/PullSense/pull/1#issuecomment-2",
				"<!-- pullsense:pr-description:end -->",
			].join("\n"),
			owner: "Nitish27",
			pull_number: 1,
			repo: "PullSense",
		});
	});
});
