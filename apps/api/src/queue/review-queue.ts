import type { PullReviewJob } from "@ai-code-review/shared";
import { type ConnectionOptions, type JobsOptions, Queue } from "bullmq";

export type ReviewQueue = {
	enqueueReviewJob(job: PullReviewJob): Promise<void>;
};

export type ReviewJobRetryOptions = {
	attempts: number;
	backoffMs: number;
};

export const reviewQueueName = "pullsense-review-jobs";
export const reviewJobName = "review-pr";

export function createRedisConnection(redisUrl: string): ConnectionOptions {
	const url = new URL(redisUrl);
	const database = url.pathname.replace("/", "");

	return {
		db: database ? Number(database) : 0,
		host: url.hostname,
		maxRetriesPerRequest: null,
		password: url.password || undefined,
		port: url.port ? Number(url.port) : 6379,
		tls: url.protocol === "rediss:" ? {} : undefined,
		username: url.username || undefined,
	};
}

export function createNoopReviewQueue(): ReviewQueue {
	return {
		async enqueueReviewJob() {
			return undefined;
		},
	};
}

export function createReviewJobOptions(
	options: ReviewJobRetryOptions,
): JobsOptions {
	return {
		attempts: options.attempts,
		backoff: {
			delay: options.backoffMs,
			type: "exponential",
		},
	};
}

export function createBullMqReviewQueue(
	redisUrl: string,
	retryOptions: ReviewJobRetryOptions = {
		attempts: 3,
		backoffMs: 5_000,
	},
): ReviewQueue {
	const queue = new Queue<PullReviewJob, void, typeof reviewJobName>(
		reviewQueueName,
		{
			connection: createRedisConnection(redisUrl),
		},
	);

	return {
		async enqueueReviewJob(job) {
			await queue.add(reviewJobName, job, createReviewJobOptions(retryOptions));
		},
	};
}
