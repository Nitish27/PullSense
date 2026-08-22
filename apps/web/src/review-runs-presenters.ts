import type { ReviewRunsResponse } from "./review-runs";

export type BadgeTone = "danger" | "neutral" | "success" | "warning";

type ReviewRun = ReviewRunsResponse["runs"][number];

export function formatDateTime(value: string) {
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

export function formatPullRequestAction(value: ReviewRun["pullRequestAction"]) {
	return value === "opened" ? "Opened" : "Synchronized";
}

export function getStatusTone(value: ReviewRun["status"]): BadgeTone {
	if (value === "completed") {
		return "success";
	}

	if (value === "failed") {
		return "danger";
	}

	if (value === "in_progress") {
		return "warning";
	}

	return "neutral";
}

export function getConclusionTone(value: ReviewRun["conclusion"]): BadgeTone {
	if (value === "success") {
		return "success";
	}

	if (value === "failure") {
		return "danger";
	}

	if (value === "neutral" || value === "skipped") {
		return "neutral";
	}

	return "warning";
}

export function getSeverityTone(
	value: ReviewRun["overallSeverity"],
): BadgeTone {
	if (value === "high") {
		return "danger";
	}

	if (value === "medium") {
		return "warning";
	}

	if (value === "low") {
		return "success";
	}

	return "neutral";
}

export function getRunHealthLabel(run: ReviewRunsResponse["latest"]) {
	if (!run) {
		return "Awaiting first recorded review";
	}

	if (run.status === "failed") {
		return "Needs attention";
	}

	if (run.status === "completed") {
		return "Healthy";
	}

	if (run.status === "in_progress") {
		return "Actively processing";
	}

	return "Queued";
}
