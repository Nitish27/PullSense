import { z } from "zod";

const webEnvSchema = z.object({
	NEXT_PUBLIC_API_BASE_URL: z.string().url(),
	NEXT_PUBLIC_APP_NAME: z.string().min(1),
});

export function getWebEnv() {
	return webEnvSchema.parse({
		NEXT_PUBLIC_API_BASE_URL:
			process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
		NEXT_PUBLIC_APP_NAME:
			process.env.NEXT_PUBLIC_APP_NAME ?? "AI Code Review Bot",
	});
}
