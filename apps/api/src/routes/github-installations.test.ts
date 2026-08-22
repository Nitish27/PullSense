import { describe, expect, it } from "vitest";

import { createApp } from "../app";

describe("GET /setup/github-installations", () => {
	it("returns safe connected installation and repository metadata", async () => {
		const app = createApp({
			getGitHubInstallationHealth: async () => ({
				installations: [
					{
						accountLogin: "Nitish27",
						id: 141542735,
						repositories: [
							{
								fullName: "Nitish27/PullSense",
								htmlUrl: "https://github.com/Nitish27/PullSense",
								name: "PullSense",
								ownerLogin: "Nitish27",
								private: true,
							},
						],
						repositorySelection: "selected",
					},
				],
			}),
		});

		const response = await app.inject({
			method: "GET",
			url: "/setup/github-installations",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			detail: "GitHub App installations are connected.",
			installations: [
				{
					accountLogin: "Nitish27",
					id: 141542735,
					repositories: [
						{
							fullName: "Nitish27/PullSense",
							htmlUrl: "https://github.com/Nitish27/PullSense",
							name: "PullSense",
							ownerLogin: "Nitish27",
							private: true,
						},
					],
					repositorySelection: "selected",
				},
			],
			state: "connected",
		});
	});

	it("reports missing credentials without returning sensitive values", async () => {
		const app = createApp();

		const response = await app.inject({
			method: "GET",
			url: "/setup/github-installations",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			detail: "Add GitHub App credentials before checking installations.",
			installations: [],
			state: "missing_credentials",
		});
		expect(response.body).not.toContain("private-key-value");
	});

	it("returns a safe unavailable state when GitHub rejects the request", async () => {
		const app = createApp({
			getGitHubInstallationHealth: async () => {
				throw new Error("Bad credentials: private-key-value");
			},
		});

		const response = await app.inject({
			method: "GET",
			url: "/setup/github-installations",
		});

		expect(response.statusCode).toBe(503);
		expect(response.json()).toEqual({
			detail:
				"PullSense could not verify GitHub App installations. Check the App credentials and try again.",
			installations: [],
			state: "unavailable",
		});
		expect(response.body).not.toContain("private-key-value");
	});
});
