import { createApp } from "./app";
import { getApiEnv } from "./env";
import { createBullMqReviewQueue } from "./queue/review-queue";

const env = getApiEnv();
const app = createApp({
	reviewQueue: createBullMqReviewQueue(env.REDIS_URL),
	webhookSecret: env.GITHUB_WEBHOOK_SECRET,
});

try {
	await app.listen({
		host: "0.0.0.0",
		port: env.API_PORT,
	});
} catch (error) {
	app.log.error(error);
	process.exit(1);
}
