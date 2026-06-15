import { APP_NAME, APP_PHASE } from "@ai-code-review/shared";

import { getWebEnv } from "../src/env";

export default function HomePage() {
	const env = getWebEnv();

	return (
		<main
			style={{
				margin: "0 auto",
				maxWidth: "720px",
				padding: "64px 24px",
				fontFamily: "Georgia, serif",
			}}
		>
			<p style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}>
				{APP_PHASE}
			</p>
			<h1>{APP_NAME}</h1>
			<p>
				The workspace foundation is in place. Next steps are the GitHub App
				webhook flow, indexing pipeline, and review engine.
			</p>
			<p>
				API base URL: <code>{env.NEXT_PUBLIC_API_BASE_URL}</code>
			</p>
		</main>
	);
}
