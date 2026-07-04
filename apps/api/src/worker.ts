import { closePostgresPool, createPostgresPool } from "./db/postgres";
import {
	createPostgresReviewRunStore,
	ensureReviewRunsTable,
} from "./db/review-runs";
import { getApiEnv } from "./env";
import { createReviewWorker } from "./workers/review-worker";

const env = getApiEnv();
const database = createPostgresPool(env.DATABASE_URL);
await ensureReviewRunsTable(database);
const reviewRunStore = createPostgresReviewRunStore(database);

const worker = createReviewWorker({
	reviewRunStore,
});

worker.on("completed", (job) => {
	console.info(
		{
			jobId: job.id,
			name: job.name,
		},
		"Review worker completed job",
	);
});

worker.on("failed", (job, error) => {
	console.error(
		{
			error,
			jobId: job?.id,
			name: job?.name,
		},
		"Review worker failed job",
	);
});

async function shutdown(signal: string) {
	console.info({ signal }, "Shutting down review worker");
	await worker.close();
	await closePostgresPool(database);
	process.exit(0);
}

process.on("SIGINT", () => {
	void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
	void shutdown("SIGTERM");
});
