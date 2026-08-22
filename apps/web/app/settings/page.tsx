import { APP_NAME, APP_PHASE } from "@ai-code-review/shared";

import { getWebEnv } from "../../src/env";
import { loadSetupStatusPageData } from "../../src/review-runs";
import { SetupCenterView } from "../../src/setup-center-view";

export default async function SettingsPage() {
	const env = getWebEnv();
	const pageData = await loadSetupStatusPageData({
		apiBaseUrl: env.NEXT_PUBLIC_API_BASE_URL,
	});

	return (
		<SetupCenterView
			apiBaseUrl={env.NEXT_PUBLIC_API_BASE_URL}
			appName={APP_NAME}
			pageData={pageData}
			phase={APP_PHASE}
		/>
	);
}
