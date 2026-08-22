import type { FastifyInstance } from "fastify";

import type { SetupStatus } from "../env";

type RegisterSetupStatusRoutesOptions = {
	setupStatus: SetupStatus;
};

export function registerSetupStatusRoutes(
	app: FastifyInstance,
	options: RegisterSetupStatusRoutesOptions,
) {
	app.get("/setup-status", async () => options.setupStatus);
}
