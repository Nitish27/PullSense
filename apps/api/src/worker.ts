import { createReviewWorker } from "./workers/review-worker";

const worker = createReviewWorker();

worker.on("completed", (job) => {
	console.info(
		{
			jobId: job.id,
			name: job.name,
		},
		"Review worker completed job",
	);
});

worker.on("failed", (job, error) => {
	console.error(
		{
			error,
			jobId: job?.id,
			name: job?.name,
		},
		"Review worker failed job",
	);
});

async function shutdown(signal: string) {
	console.info({ signal }, "Shutting down review worker");
	await worker.close();
	process.exit(0);
}

process.on("SIGINT", () => {
	void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
	void shutdown("SIGTERM");
});
