import { createApp } from "./app";
import { getApiEnv } from "./env";

const env = getApiEnv();
const app = createApp();

try {
	await app.listen({
		host: "0.0.0.0",
		port: env.API_PORT,
	});
} catch (error) {
	app.log.error(error);
	process.exit(1);
}
