import type { GitHubInstallationHealth } from "@ai-code-review/github";
import type { FastifyInstance } from "fastify";

type RegisterGitHubInstallationRoutesOptions = {
	getGitHubInstallationHealth?: () => Promise<GitHubInstallationHealth>;
};

export function registerGitHubInstallationRoutes(
	app: FastifyInstance,
	options: RegisterGitHubInstallationRoutesOptions,
) {
	app.get("/setup/github-installations", async (_request, reply) => {
		if (!options.getGitHubInstallationHealth) {
			return {
				detail: "Add GitHub App credentials before checking installations.",
				installations: [],
				state: "missing_credentials",
			};
		}

		try {
			const githubInstallationHealth =
				await options.getGitHubInstallationHealth();

			return {
				detail: "GitHub App installations are connected.",
				installations: githubInstallationHealth.installations,
				state: "connected",
			};
		} catch {
			return reply.code(503).send({
				detail:
					"PullSense could not verify GitHub App installations. Check the App credentials and try again.",
				installations: [],
				state: "unavailable",
			});
		}
	});
}
