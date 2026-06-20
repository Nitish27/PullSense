import {
	fetchPullRequestFilesForInstallation,
	type PullRequestFilesInput,
	type PullRequestFilesResult,
	readGitHubAppConfigFromEnv,
} from "@ai-code-review/github";
import type { PullReviewJob } from "@ai-code-review/shared";
import { Worker } from "bullmq";

import { getApiEnv } from "../env";
import { createRedisConnection, reviewQueueName } from "../queue/review-queue";

type ReviewWorkerDependencies = {
	fetchPullRequestFilesForInstallation(
		input: PullRequestFilesInput & { installationId: number },
	): Promise<PullRequestFilesResult>;
	logger: {
		info(payload: unknown, message?: string): void;
	};
};

export async function processReviewJob(
	job: PullReviewJob,
	dependencies: ReviewWorkerDependencies,
) {
	const files = await dependencies.fetchPullRequestFilesForInstallation({
		installationId: job.installationId,
		owner: job.owner,
		pullNumber: job.pullNumber,
		repository: job.repository,
	});

	const result = {
		fileCount: files.length,
		files,
		job,
	};

	dependencies.logger.info(
		{
			fileCount: result.fileCount,
			installationId: job.installationId,
			owner: job.owner,
			pullNumber: job.pullNumber,
			repository: job.repository,
		},
		"Fetched pull request files",
	);

	return result;
}

export function createReviewWorker() {
	const env = getApiEnv();
	const githubAppConfig = readGitHubAppConfigFromEnv(env);
	const connection = createRedisConnection(env.REDIS_URL);

	return new Worker<PullReviewJob>(
		reviewQueueName,
		async (job) =>
			processReviewJob(job.data, {
				fetchPullRequestFilesForInstallation: (input) =>
					fetchPullRequestFilesForInstallation(githubAppConfig, input),
				logger: console,
			}),
		{
			connection,
		},
	);
}
