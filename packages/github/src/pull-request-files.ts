import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export type GitHubAppConfig = {
	appId: string;
	privateKey: string;
};

export type PullRequestFilesClient = {
	pulls: {
		listFiles(input: {
			owner: string;
			page: number;
			per_page: number;
			pull_number: number;
			repo: string;
		}): Promise<{
			data: Array<{
				filename: string;
				patch?: string;
				sha: string | null;
				status: string;
			}>;
		}>;
	};
};

export type PullRequestFilesInput = {
	owner: string;
	pullNumber: number;
	repository: string;
};

export type PullRequestFilesResult = Array<{
	filename: string;
	patch?: string;
	sha: string | null;
	status: string;
}>;

export function readGitHubAppConfigFromEnv(env: {
	GITHUB_APP_ID?: string;
	GITHUB_PRIVATE_KEY?: string;
}): GitHubAppConfig {
	if (!env.GITHUB_APP_ID || !env.GITHUB_PRIVATE_KEY) {
		throw new Error("Missing GitHub App credentials");
	}

	return {
		appId: env.GITHUB_APP_ID,
		privateKey: env.GITHUB_PRIVATE_KEY.replace(/\\n/g, "\n"),
	};
}

export async function createInstallationClient(
	config: GitHubAppConfig,
	installationId: number,
): Promise<PullRequestFilesClient> {
	const auth = createAppAuth({
		appId: config.appId,
		privateKey: config.privateKey,
	});
	const installationAuthentication = await auth({
		installationId,
		type: "installation",
	});

	return new Octokit({
		auth: installationAuthentication.token,
	});
}

export async function fetchPullRequestFiles(
	client: PullRequestFilesClient,
	input: PullRequestFilesInput,
): Promise<PullRequestFilesResult> {
	const response = await client.pulls.listFiles({
		owner: input.owner,
		page: 1,
		per_page: 100,
		pull_number: input.pullNumber,
		repo: input.repository,
	});

	return response.data.map((file) => ({
		filename: file.filename,
		patch: file.patch,
		sha: file.sha,
		status: file.status,
	}));
}

export async function fetchPullRequestFilesForInstallation(
	config: GitHubAppConfig,
	input: PullRequestFilesInput & { installationId: number },
): Promise<PullRequestFilesResult> {
	const client = await createInstallationClient(config, input.installationId);

	return fetchPullRequestFiles(client, input);
}
