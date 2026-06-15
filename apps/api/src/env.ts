import { z } from "zod";

const apiEnvSchema = z.object({
	API_PORT: z.coerce.number().int().positive().default(3001),
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
});

export function getApiEnv() {
	return apiEnvSchema.parse({
		API_PORT: process.env.API_PORT,
		NODE_ENV: process.env.NODE_ENV,
	});
}
