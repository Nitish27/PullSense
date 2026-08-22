import Fastify from "fastify";
import fastifyRawBody from "fastify-raw-body";
import {
	createNoopReviewRunStore,
	type ReviewRunStore,
} from "./db/review-runs";
import { getApiEnv, getSetupStatusFromEnv, type SetupStatus } from "./env";
import { createNoopReviewQueue, type ReviewQueue } from "./queue/review-queue";
import { registerHealthRoutes } from "./routes/health";
import { registerReviewRunRoutes } from "./routes/review-runs";
import { registerSetupStatusRoutes } from "./routes/setup-status";
import { registerWebhookRoutes } from "./routes/webhook";

type CreateAppOptions = {
	createCheckRun?: (input: {
		headSha: string;
		installationId: number;
		owner: string;
		repository: string;
		status: "queued" | "in_progress";
		summary: string;
		title: string;
	}) => Promise<{ id: number } | null>;
	reviewQueue?: ReviewQueue;
	reviewRunStore?: ReviewRunStore;
	setupStatus?: SetupStatus;
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
	registerSetupStatusRoutes(app, {
		setupStatus: options.setupStatus ?? getSetupStatusFromEnv(getApiEnv()),
	});
	registerReviewRunRoutes(app, {
		reviewRunStore: options.reviewRunStore ?? createNoopReviewRunStore(),
	});
	registerWebhookRoutes(app, {
		createCheckRun: options.createCheckRun ?? (async () => null),
		reviewQueue: options.reviewQueue ?? createNoopReviewQueue(),
		reviewRunStore: options.reviewRunStore ?? createNoopReviewRunStore(),
		webhookSecret: options.webhookSecret ?? "development-webhook-secret",
	});

	return app;
}
