import { describe, expect, it } from "vitest";

import { getApiEnv, getSetupStatusFromEnv } from "./env";

describe("getApiEnv", () => {
	it("parses DATABASE_URL from the process environment", () => {
		const env = getApiEnv({
			API_PORT: "3001",
			DATABASE_URL:
				"postgresql://postgres:postgres@localhost:5432/ai_code_review",
			GEMINI_MODEL: "gemini-3.1-flash-lite",
			GITHUB_WEBHOOK_SECRET: "local-secret",
			REDIS_URL: "redis://localhost:6379",
			REVIEW_JOB_ATTEMPTS: "4",
			REVIEW_JOB_BACKOFF_MS: "8000",
		});

		expect(env.DATABASE_URL).toBe(
			"postgresql://postgres:postgres@localhost:5432/ai_code_review",
		);
		expect(env.REVIEW_JOB_ATTEMPTS).toBe(4);
		expect(env.REVIEW_JOB_BACKOFF_MS).toBe(8000);
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
		expect(env.REVIEW_JOB_ATTEMPTS).toBe(3);
		expect(env.REVIEW_JOB_BACKOFF_MS).toBe(5000);
	});

	it("returns sanitized setup status without exposing configuration values", () => {
		const setupStatus = getSetupStatusFromEnv(
			getApiEnv({
				GEMINI_API_KEY: "super-secret-gemini-key",
				GITHUB_APP_ID: "12345",
				GITHUB_PRIVATE_KEY: "super-secret-private-key",
				GITHUB_WEBHOOK_SECRET: "development-webhook-secret",
			}),
		);

		expect(setupStatus).toEqual({
			database: {
				detail: "Review-run persistence is ready.",
				state: "ready",
			},
			githubApp: {
				detail: "GitHub App credentials are configured.",
				state: "ready",
			},
			modelProvider: {
				detail: "Gemini review generation is configured.",
				state: "ready",
			},
			queue: {
				detail: "Redis queue configuration is present.",
				state: "ready",
			},
			webhook: {
				detail:
					"Development webhook secret is active. Replace it before sharing PullSense.",
				state: "attention",
			},
		});
		expect(JSON.stringify(setupStatus)).not.toContain("super-secret");
	});
});
