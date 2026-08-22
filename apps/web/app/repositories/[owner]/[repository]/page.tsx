import { APP_NAME, APP_PHASE } from "@ai-code-review/shared";

import { getWebEnv } from "../../../../src/env";
import { RepositoryHealthView } from "../../../../src/repository-health-view";
import {
	loadRepositoryReviewHealthPageData,
	type RepositoryHealthRouteParams,
} from "../../../../src/review-runs";

type RepositoryHealthPageProps = {
	params?: Promise<RepositoryHealthRouteParams>;
};

export default async function RepositoryHealthPage(
	props: RepositoryHealthPageProps,
) {
	const env = getWebEnv();
	const params = props.params ? await props.params : undefined;
	const pageData = await loadRepositoryReviewHealthPageData({
		apiBaseUrl: env.NEXT_PUBLIC_API_BASE_URL,
		params,
	});

	return (
		<RepositoryHealthView
			apiBaseUrl={env.NEXT_PUBLIC_API_BASE_URL}
			appName={APP_NAME}
			pageData={pageData}
			phase={APP_PHASE}
		/>
	);
}
