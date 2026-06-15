import { describe, expect, it } from "vitest";

import { createApp } from "./app";

describe("createApp", () => {
	it("returns a healthy response from /health", async () => {
		const app = createApp();

		const response = await app.inject({
			method: "GET",
			url: "/health",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			service: "api",
			status: "ok",
		});
	});
});
