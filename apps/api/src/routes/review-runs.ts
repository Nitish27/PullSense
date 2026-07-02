import type { FastifyInstance } from "fastify";

import type { ReviewRunRecord, ReviewRunStore } from "../db/review-runs";

type RegisterReviewRunRoutesOptions = {
	reviewRunStore: ReviewRunStore;
};

type ReviewRunRouteParams = {
	owner: string;
	pullNumber: string;
	repository: string;
};

export function registerReviewRunRoutes(
	app: FastifyInstance,
	options: RegisterReviewRunRoutesOptions,
) {
	app.get<{ Params: ReviewRunRouteParams }>(
		"/repos/:owner/:repository/pulls/:pullNumber/review-runs",
		async (request, reply) => {
			const pullNumber = Number.parseInt(request.params.pullNumber, 10);

			if (Number.isNaN(pullNumber)) {
				return reply.code(400).send({
					error: "Invalid pull number",
				});
			}

			const scope = {
				owner: request.params.owner,
				pullNumber,
				repository: request.params.repository,
			};
			const latest =
				await options.reviewRunStore.getLatestReviewRunForPullRequest(scope);
			const runs =
				await options.reviewRunStore.listReviewRunsForPullRequest(scope);

			return {
				latest: serializeReviewRun(latest),
				owner: scope.owner,
				pullNumber: scope.pullNumber,
				repository: scope.repository,
				runs: runs.map((reviewRun) => serializeReviewRun(reviewRun)),
			};
		},
	);
}

function serializeReviewRun(reviewRun: ReviewRunRecord | null) {
	if (!reviewRun) {
		return null;
	}

	return {
		...reviewRun,
		completedAt: reviewRun.completedAt?.toISOString() ?? null,
		createdAt: reviewRun.createdAt.toISOString(),
		startedAt: reviewRun.startedAt?.toISOString() ?? null,
		updatedAt: reviewRun.updatedAt.toISOString(),
	};
}
