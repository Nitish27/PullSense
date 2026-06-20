import Fastify from "fastify";
import fastifyRawBody from "fastify-raw-body";
import { createNoopReviewQueue, type ReviewQueue } from "./queue/review-queue";
import { registerHealthRoutes } from "./routes/health";
import { registerWebhookRoutes } from "./routes/webhook";

type CreateAppOptions = {
	reviewQueue?: ReviewQueue;
	webhookSecret?: string;
};

export function createApp(options: CreateAppOptions = {}) {
	const app = Fastify();

	app.register(fastifyRawBody, {
		encoding: "utf8",
		field: "rawBody",
		global: false,
		runFirst: true,
	});

	registerHealthRoutes(app);
	registerWebhookRoutes(app, {
		reviewQueue: options.reviewQueue ?? createNoopReviewQueue(),
		webhookSecret: options.webhookSecret ?? "development-webhook-secret",
	});

	return app;
}
