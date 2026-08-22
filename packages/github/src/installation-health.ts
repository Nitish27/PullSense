import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

import {
	createInstallationClient,
	type GitHubAppConfig,
	type GitHubInstallationRepositoriesClient,
} from "./pull-request-files";

export type GitHubAppInstallationsClient = {
	apps: {
		listInstallations: (input: { page: number; per_page: number }) => Promise<{
			data: Array<{
				account: { login: string } | null;
				id: number;
				repository_selection: "all" | "selected";
			}>;
		}>;
	};
};

export type { GitHubInstallationRepositoriesClient };

export type GitHubInstallationHealth = {
	installations: Array<{
		accountLogin: string;
		id: number;
		repositories: Array<{
			fullName: string;
			htmlUrl: string;
			name: string;
			ownerLogin: string;
			private: boolean;
		}>;
		repositorySelection: "all" | "selected";
	}>;
};

export async function createGitHubAppInstallationsClient(
	config: GitHubAppConfig,
): Promise<GitHubAppInstallationsClient> {
	const auth = createAppAuth({
		appId: config.appId,
		privateKey: config.privateKey,
	});
	const authentication = await auth({ type: "app" });

	return new Octokit({ auth: authentication.token });
}

export async function fetchGitHubInstallationHealth(input: {
	appClient: GitHubAppInstallationsClient;
	createInstallationClient: (
		installationId: number,
	) => Promise<GitHubInstallationRepositoriesClient>;
}): Promise<GitHubInstallationHealth> {
	const installationsResponse = await input.appClient.apps.listInstallations({
		page: 1,
		per_page: 100,
	});
	const installations = await Promise.all(
		installationsResponse.data.map(async (installation) => {
			const client = await input.createInstallationClient(installation.id);
			const repositoriesResponse =
				await client.apps.listReposAccessibleToInstallation({
					page: 1,
					per_page: 100,
				});

			return {
				accountLogin: installation.account?.login ?? "Unknown account",
				id: installation.id,
				repositories: repositoriesResponse.data.repositories.map(
					(repository) => ({
						fullName: repository.full_name,
						htmlUrl: repository.html_url,
						name: repository.name,
						ownerLogin: repository.owner.login,
						private: repository.private,
					}),
				),
				repositorySelection: installation.repository_selection,
			};
		}),
	);

	return { installations };
}

export async function fetchGitHubInstallationHealthForApp(
	config: GitHubAppConfig,
): Promise<GitHubInstallationHealth> {
	const appClient = await createGitHubAppInstallationsClient(config);

	return fetchGitHubInstallationHealth({
		appClient,
		createInstallationClient: (installationId) =>
			createInstallationClient(config, installationId),
	});
}
