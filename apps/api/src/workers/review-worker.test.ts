import type { PullReviewJob } from "@ai-code-review/shared";
import { describe, expect, it, vi } from "vitest";

import { processReviewJob } from "./review-worker";

describe("processReviewJob", () => {
	it("fetches PR files for the queued review job", async () => {
		const fetchPullRequestFilesForInstallation = vi.fn(async () => [
			{
				filename: "src/app.ts",
				patch: "@@ -1 +1 @@",
				sha: "file-sha",
				status: "modified",
			},
		]);
		const logger = {
			info: vi.fn(),
		};
		const job: PullReviewJob = {
			action: "opened",
			headSha: "abc123",
			installationId: 42,
			owner: "Nitish27",
			pullNumber: 9,
			repository: "PullSense",
		};

		const result = await processReviewJob(job, {
			fetchPullRequestFilesForInstallation,
			logger,
		});

		expect(fetchPullRequestFilesForInstallation).toHaveBeenCalledWith({
			installationId: 42,
			owner: "Nitish27",
			pullNumber: 9,
			repository: "PullSense",
		});
		expect(result).toEqual({
			fileCount: 1,
			files: [
				{
					filename: "src/app.ts",
					patch: "@@ -1 +1 @@",
					sha: "file-sha",
					status: "modified",
				},
			],
			job,
		});
		expect(logger.info).toHaveBeenCalled();
	});
});
