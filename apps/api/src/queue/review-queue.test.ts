import { describe, expect, it } from "vitest";

import {
	createRedisConnection,
	createReviewJobOptions,
} from "./review-queue";

describe("createRedisConnection", () => {
	it("maps a redis URL into BullMQ connection options", () => {
		const connection = createRedisConnection("redis://localhost:6379/2");

		expect(connection).toEqual({
			db: 2,
			host: "localhost",
			maxRetriesPerRequest: null,
			password: undefined,
			port: 6379,
			tls: undefined,
			username: undefined,
		});
	});
});

describe("createReviewJobOptions", () => {
	it("returns exponential retry settings for review jobs", () => {
		expect(
			createReviewJobOptions({
				attempts: 4,
				backoffMs: 8000,
			}),
		).toEqual({
			attempts: 4,
			backoff: {
				delay: 8000,
				type: "exponential",
			},
		});
	});
});
