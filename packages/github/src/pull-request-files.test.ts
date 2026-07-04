import { describe, expect, it, vi } from "vitest";

import {
	fetchPullRequestFiles,
	type GitHubAppConfig,
	type PullRequestFilesClient,
	readGitHubAppConfigFromEnv,
} from "./pull-request-files";

describe("fetchPullRequestFiles", () => {
	it("returns a normalized pull request file list", async () => {
		const listFiles = vi.fn(async () => ({
			data: [
				{
					filename: "src/app.ts",
					patch: "@@ -1 +1 @@",
					sha: "abc",
					status: "modified",
				},
			],
		}));
		const client: PullRequestFilesClient = {
			pulls: {
				listFiles,
			},
		};

		const files = await fetchPullRequestFiles(client, {
			owner: "Nitish27",
			pullNumber: 18,
			repository: "PullSense",
		});

		expect(listFiles).toHaveBeenCalledWith({
			owner: "Nitish27",
			page: 1,
			per_page: 100,
			pull_number: 18,
			repo: "PullSense",
		});
		expect(files).toEqual([
			{
				filename: "src/app.ts",
				patch: "@@ -1 +1 @@",
				sha: "abc",
				status: "modified",
			},
		]);
	});
});

describe("readGitHubAppConfigFromEnv", () => {
	it("normalizes escaped private key newlines from environment variables", () => {
		const config = readGitHubAppConfigFromEnv({
			GITHUB_APP_ID: "12345",
			GITHUB_PRIVATE_KEY: "line1\\nline2",
		});

		expect(config).toEqual<GitHubAppConfig>({
			appId: "12345",
			privateKey: "line1\nline2",
		});
	});
});
