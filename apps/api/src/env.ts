import { z } from "zod";

const apiEnvSchema = z.object({
	API_PORT: z.coerce.number().int().positive().default(3001),
	DATABASE_URL: z
		.string()
		.url()
		.default("postgresql://postgres:postgres@localhost:5432/ai_code_review"),
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

export function getApiEnv(
	env: Partial<
		Record<keyof NodeJS.ProcessEnv, string | undefined>
	> = process.env,
) {
	return apiEnvSchema.parse({
		API_PORT: env.API_PORT,
		DATABASE_URL: env.DATABASE_URL,
		GEMINI_API_KEY: env.GEMINI_API_KEY,
		GEMINI_MODEL: env.GEMINI_MODEL,
		GITHUB_APP_ID: env.GITHUB_APP_ID,
		GITHUB_PRIVATE_KEY: env.GITHUB_PRIVATE_KEY,
		GITHUB_WEBHOOK_SECRET: env.GITHUB_WEBHOOK_SECRET,
		NODE_ENV: env.NODE_ENV,
		REDIS_URL: env.REDIS_URL,
	});
}
