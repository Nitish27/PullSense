import { describe, expect, it, vi } from "vitest";

import {
	fetchGitHubInstallationHealth,
	type GitHubAppInstallationsClient,
	type GitHubInstallationRepositoriesClient,
} from "./installation-health";

describe("fetchGitHubInstallationHealth", () => {
	it("returns safe installation and repository metadata", async () => {
		const listInstallations = vi.fn(async () => ({
			data: [
				{
					account: { login: "Nitish27" },
					id: 141542735,
					repository_selection: "selected" as const,
				},
			],
		}));
		const listReposAccessibleToInstallation = vi.fn(async () => ({
			data: {
				repositories: [
					{
						full_name: "Nitish27/PullSense",
						html_url: "https://github.com/Nitish27/PullSense",
						name: "PullSense",
						owner: { login: "Nitish27" },
						private: true,
					},
				],
			},
		}));
		const appClient: GitHubAppInstallationsClient = {
			apps: { listInstallations },
		};
		const installationClient: GitHubInstallationRepositoriesClient = {
			apps: { listReposAccessibleToInstallation },
		};

		const result = await fetchGitHubInstallationHealth({
			appClient,
			createInstallationClient: async () => installationClient,
		});

		expect(listInstallations).toHaveBeenCalledWith({ page: 1, per_page: 100 });
		expect(listReposAccessibleToInstallation).toHaveBeenCalledWith({
			page: 1,
			per_page: 100,
		});
		expect(result).toEqual({
			installations: [
				{
					accountLogin: "Nitish27",
					id: 141542735,
					repositories: [
						{
							fullName: "Nitish27/PullSense",
							htmlUrl: "https://github.com/Nitish27/PullSense",
							name: "PullSense",
							ownerLogin: "Nitish27",
							private: true,
						},
					],
					repositorySelection: "selected",
				},
			],
		});
	});
});
