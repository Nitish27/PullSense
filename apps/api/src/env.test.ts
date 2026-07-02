import { describe, expect, it } from "vitest";

import { getApiEnv } from "./env";

describe("getApiEnv", () => {
	it("parses DATABASE_URL from the process environment", () => {
		const env = getApiEnv({
			API_PORT: "3001",
			DATABASE_URL:
				"postgresql://postgres:postgres@localhost:5432/ai_code_review",
			GEMINI_MODEL: "gemini-3.1-flash-lite",
			GITHUB_WEBHOOK_SECRET: "local-secret",
			REDIS_URL: "redis://localhost:6379",
		});

		expect(env.DATABASE_URL).toBe(
			"postgresql://postgres:postgres@localhost:5432/ai_code_review",
		);
	});

	it("falls back to the local postgres default when DATABASE_URL is omitted", () => {
		const env = getApiEnv({
			API_PORT: "3001",
			GEMINI_MODEL: "gemini-3.1-flash-lite",
			GITHUB_WEBHOOK_SECRET: "local-secret",
			REDIS_URL: "redis://localhost:6379",
		});

		expect(env.DATABASE_URL).toBe(
			"postgresql://postgres:postgres@localhost:5432/ai_code_review",
		);
	});
});
