import { z } from "zod";

const apiEnvSchema = z.object({
	API_PORT: z.coerce.number().int().positive().default(3001),
	GEMINI_API_KEY: z.string().min(1).optional(),
	GEMINI_MODEL: z.string().min(1).default("gemini-3.1-flash-lite"),
	GITHUB_APP_ID: z.string().min(1).optional(),
	GITHUB_PRIVATE_KEY: z.string().min(1).optional(),
	GITHUB_WEBHOOK_SECRET: z
		.string()
		.min(1)
		.default("development-webhook-secret"),
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	REDIS_URL: z.string().url().default("redis://localhost:6379"),
});

export function getApiEnv() {
	return apiEnvSchema.parse({
		API_PORT: process.env.API_PORT,
		GEMINI_API_KEY: process.env.GEMINI_API_KEY,
		GEMINI_MODEL: process.env.GEMINI_MODEL,
		GITHUB_APP_ID: process.env.GITHUB_APP_ID,
		GITHUB_PRIVATE_KEY: process.env.GITHUB_PRIVATE_KEY,
		GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
		NODE_ENV: process.env.NODE_ENV,
		REDIS_URL: process.env.REDIS_URL,
	});
}
