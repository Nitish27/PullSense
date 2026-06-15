import Fastify from "fastify";

import { registerHealthRoutes } from "./routes/health";

export function createApp() {
	const app = Fastify();

	registerHealthRoutes(app);

	return app;
}
