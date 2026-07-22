import { APP_NAME, APP_PHASE } from "@ai-code-review/shared";

import { getWebEnv } from "../src/env";
import {
	loadReviewRunsPageData,
	type ReviewRunsPageSearchParams,
} from "../src/review-runs";
import { ReviewRunsDashboard } from "../src/review-runs-view";

type HomePageProps = {
	searchParams?: Promise<ReviewRunsPageSearchParams>;
};

export default async function HomePage(props: HomePageProps) {
	const env = getWebEnv();
	const searchParams = props.searchParams
		? await props.searchParams
		: undefined;
	const pageData = await loadReviewRunsPageData({
		apiBaseUrl: env.NEXT_PUBLIC_API_BASE_URL,
		searchParams,
	});

	return (
		<ReviewRunsDashboard
			apiBaseUrl={env.NEXT_PUBLIC_API_BASE_URL}
			appName={APP_NAME}
			pageData={pageData}
			phase={APP_PHASE}
		/>
	);
}
