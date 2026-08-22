import { APP_NAME } from "@ai-code-review/shared";

import { getWebEnv } from "../../src/env";
import {
	loadGitHubInstallationHealthPageData,
	loadSetupStatusPageData,
} from "../../src/review-runs";
import { SetupCenterView } from "../../src/setup-center-view";

export default async function SettingsPage() {
	const env = getWebEnv();
	const [pageData, githubInstallationHealthPageData] = await Promise.all([
		loadSetupStatusPageData({
			apiBaseUrl: env.NEXT_PUBLIC_API_BASE_URL,
		}),
		loadGitHubInstallationHealthPageData({
			apiBaseUrl: env.NEXT_PUBLIC_API_BASE_URL,
		}),
	]);

	return (
		<SetupCenterView
			apiBaseUrl={env.NEXT_PUBLIC_API_BASE_URL}
			appName={APP_NAME}
			githubInstallationHealthPageData={githubInstallationHealthPageData}
			pageData={pageData}
			phase="Setup & onboarding"
		/>
	);
}
