import { getWebEnv } from "../../../../../src/env";
import {
	loadReviewRunsDetailPageData,
	type ReviewRunsRouteParams,
} from "../../../../../src/review-runs";
import { ReviewRunsDetailView } from "../../../../../src/review-runs-detail-view";

type PullRequestDetailPageProps = {
	params?: Promise<ReviewRunsRouteParams>;
};

export default async function PullRequestDetailPage(
	props: PullRequestDetailPageProps,
) {
	const env = getWebEnv();
	const params = props.params ? await props.params : undefined;
	const pageData = await loadReviewRunsDetailPageData({
		apiBaseUrl: env.NEXT_PUBLIC_API_BASE_URL,
		params,
	});

	return (
		<ReviewRunsDetailView
			apiBaseUrl={env.NEXT_PUBLIC_API_BASE_URL}
			pageData={pageData}
		/>
	);
}
