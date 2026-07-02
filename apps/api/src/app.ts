import Fastify from "fastify";
import fastifyRawBody from "fastify-raw-body";
import {
	createNoopReviewRunStore,
	type ReviewRunStore,
} from "./db/review-runs";
import { createNoopReviewQueue, type ReviewQueue } from "./queue/review-queue";
import { registerHealthRoutes } from "./routes/health";
import { registerReviewRunRoutes } from "./routes/review-runs";
import { registerWebhookRoutes } from "./routes/webhook";

type CreateAppOptions = {
	reviewQueue?: ReviewQueue;
	reviewRunStore?: ReviewRunStore;
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
	registerReviewRunRoutes(app, {
		reviewRunStore: options.reviewRunStore ?? createNoopReviewRunStore(),
	});
	registerWebhookRoutes(app, {
		reviewQueue: options.reviewQueue ?? createNoopReviewQueue(),
		reviewRunStore: options.reviewRunStore ?? createNoopReviewRunStore(),
		webhookSecret: options.webhookSecret ?? "development-webhook-secret",
	});

	return app;
}
