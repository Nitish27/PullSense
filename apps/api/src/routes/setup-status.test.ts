import { describe, expect, it } from "vitest";

import { createApp } from "../app";

describe("GET /setup-status", () => {
	it("returns a safe read-only readiness snapshot", async () => {
		const app = createApp({
			setupStatus: {
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
					detail: "Webhook signing is configured.",
					state: "ready",
				},
			},
		});

		const response = await app.inject({
			method: "GET",
			url: "/setup-status",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
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
				detail: "Webhook signing is configured.",
				state: "ready",
			},
		});
	});

	it("does not expose secret values when setup needs attention", async () => {
		const app = createApp({
			setupStatus: {
				database: {
					detail: "Review-run persistence is ready.",
					state: "ready",
				},
				githubApp: {
					detail: "Add the GitHub App ID and private key before testing.",
					state: "missing",
				},
				modelProvider: {
					detail: "Add a Gemini API key before requesting AI reviews.",
					state: "missing",
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
			},
		});

		const response = await app.inject({
			method: "GET",
			url: "/setup-status",
		});
		const body = response.body;

		expect(response.statusCode).toBe(200);
		expect(body).toContain("Development webhook secret is active.");
		expect(body).not.toContain("super-secret-webhook-value");
		expect(body).not.toContain("super-secret-private-key");
		expect(body).not.toContain("postgresql://");
	});
});
