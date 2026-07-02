import { createApp } from "./app";
import { closePostgresPool, createPostgresPool } from "./db/postgres";
import {
	createPostgresReviewRunStore,
	ensureReviewRunsTable,
} from "./db/review-runs";
import { getApiEnv } from "./env";
import { createBullMqReviewQueue } from "./queue/review-queue";

const env = getApiEnv();
const database = createPostgresPool(env.DATABASE_URL);
await ensureReviewRunsTable(database);
const reviewRunStore = createPostgresReviewRunStore(database);

const app = createApp({
	reviewQueue: createBullMqReviewQueue(env.REDIS_URL),
	reviewRunStore,
	webhookSecret: env.GITHUB_WEBHOOK_SECRET,
});

app.addHook("onClose", async () => {
	await closePostgresPool(database);
});

try {
	await app.listen({
		host: "0.0.0.0",
		port: env.API_PORT,
	});
} catch (error) {
	app.log.error(error);
	await closePostgresPool(database);
	process.exit(1);
}
