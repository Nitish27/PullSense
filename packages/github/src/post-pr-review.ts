import { createHash } from "node:crypto";

import type {
	PullRequestInlineFinding,
	PullRequestReviewFile,
} from "@ai-code-review/shared";

import {
	createInstallationClient,
	type GitHubAppConfig,
	type PullRequestReviewClient,
} from "./pull-request-files";

export type { PullRequestReviewClient } from "./pull-request-files";

export type PullRequestReviewComment = {
	body: string;
	line: number;
	path: string;
	side: "RIGHT";
};

export type PostPullRequestReviewInput = {
	body: string;
	comments: PullRequestReviewComment[];
	commitId: string;
	event: "COMMENT";
	owner: string;
	pullNumber: number;
	repository: string;
};

export type PostPullRequestReviewResult = {
	htmlUrl?: string;
	id: number;
};

const inlineReviewMarkerPrefix = "<!-- pullsense:inline-review:key=";

export function buildPullRequestReviewComments(
	files: PullRequestReviewFile[],
	inlineFindings: PullRequestInlineFinding[],
): PullRequestReviewComment[] {
	return inlineFindings.flatMap((finding) => {
		const file = files.find((candidate) => candidate.filename === finding.file);

		if (!file?.patch) {
			return [];
		}

		const anchor = resolveRightSideAnchor(file.patch, finding.line);

		if (!anchor) {
			return [];
		}

		return [
			{
				body: formatInlineReviewCommentBody(finding),
				line: anchor.line,
				path: finding.file,
				side: "RIGHT",
			},
		];
	});
}

export async function postPullRequestReview(
	client: PullRequestReviewClient,
	input: PostPullRequestReviewInput,
): Promise<PostPullRequestReviewResult> {
	const existingReview = await findLatestPullSenseInlineReview(client, input);
	const currentSignature = extractInlineReviewSignature(input.body);
	const existingSignature = existingReview
		? extractInlineReviewSignature(existingReview.body)
		: null;
	const response =
		existingReview &&
		existingSignature === currentSignature &&
		existingReview.body === input.body
			? {
					data: {
						html_url: existingReview.html_url,
						id: existingReview.id,
					},
				}
			: existingReview && existingSignature === currentSignature
				? await client.pulls.updateReview({
						body: input.body,
						owner: input.owner,
						pull_number: input.pullNumber,
						repo: input.repository,
						review_id: existingReview.id,
					})
				: await client.pulls.createReview({
						body: input.body,
						comments: input.comments,
						commit_id: input.commitId,
						event: input.event,
						owner: input.owner,
						pull_number: input.pullNumber,
						repo: input.repository,
					});

	return {
		htmlUrl: response.data.html_url,
		id: response.data.id,
	};
}

export async function postPullRequestReviewForInstallation(
	config: GitHubAppConfig,
	input: PostPullRequestReviewInput & { installationId: number },
) {
	const client = await createInstallationClient(config, input.installationId);

	return postPullRequestReview(client, input);
}

export function buildInlineReviewSignature(
	comments: PullRequestReviewComment[],
): string {
	const normalizedComments = comments.map((comment) => ({
		body: comment.body.trim(),
		line: comment.line,
		path: comment.path,
		side: comment.side,
	}));

	return createHash("sha256")
		.update(JSON.stringify(normalizedComments))
		.digest("hex");
}

export function formatInlineReviewBodyWithSignature(
	body: string,
	signature: string,
) {
	return [`${inlineReviewMarkerPrefix}${signature} -->`, body].join("\n");
}

function formatInlineReviewCommentBody(finding: PullRequestInlineFinding) {
	return [
		`**[${finding.severity.toUpperCase()}] ${finding.title}**`,
		"",
		finding.body,
	].join("\n");
}

function resolveRightSideAnchor(patch: string, line: number) {
	let rightLine = 0;

	for (const rawLine of patch.split("\n")) {
		if (rawLine.startsWith("@@")) {
			const nextRightLine = parseRightLineFromHunkHeader(rawLine);

			if (nextRightLine === undefined) {
				continue;
			}

			rightLine = nextRightLine;
			continue;
		}

		if (rawLine.startsWith("\\ No newline at end of file")) {
			continue;
		}

		if (rawLine.startsWith("-")) {
			continue;
		}

		if (rawLine.startsWith("+") || rawLine.startsWith(" ")) {
			if (rightLine === line) {
				return { line: rightLine };
			}

			rightLine += 1;
		}
	}

	return undefined;
}

function parseRightLineFromHunkHeader(header: string) {
	const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(header);

	if (!match) {
		return undefined;
	}

	return Number.parseInt(match[1], 10);
}

async function findLatestPullSenseInlineReview(
	client: PullRequestReviewClient,
	input: PostPullRequestReviewInput,
) {
	const response = await client.pulls.listReviews({
		owner: input.owner,
		per_page: 100,
		pull_number: input.pullNumber,
		repo: input.repository,
	});

	return [...response.data]
		.reverse()
		.find((review) => review.body?.startsWith(inlineReviewMarkerPrefix));
}

function extractInlineReviewSignature(body?: string | null) {
	if (!body?.startsWith(inlineReviewMarkerPrefix)) {
		return null;
	}

	const endIndex = body.indexOf(" -->");

	if (endIndex === -1) {
		return null;
	}

	return body.slice(inlineReviewMarkerPrefix.length, endIndex);
}
