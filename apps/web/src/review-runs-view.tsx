import type { ReviewRunsPageData } from "./review-runs";
import { ReviewRunsReadyState } from "./review-runs-ready-state";

type ReviewRunsDashboardProps = {
	appName: string;
	apiBaseUrl: string;
	phase: string;
	pageData: ReviewRunsPageData;
};

export function ReviewRunsDashboard(props: ReviewRunsDashboardProps) {
	return (
		<main
			style={{
				background:
					"linear-gradient(180deg, rgb(250 247 240) 0%, rgb(244 240 232) 100%)",
				color: "rgb(38 31 24)",
				fontFamily: "Georgia, serif",
				minHeight: "100vh",
				padding: "48px 24px 72px",
			}}
		>
			<div style={{ margin: "0 auto", maxWidth: "1040px" }}>
				<p
					style={{
						letterSpacing: "0.08em",
						marginBottom: "12px",
						textTransform: "uppercase",
					}}
				>
					{props.phase}
				</p>
				<h1 style={{ fontSize: "3rem", margin: "0 0 16px" }}>
					{props.appName}
				</h1>
				<p
					style={{
						fontSize: "1.1rem",
						lineHeight: 1.6,
						marginBottom: "24px",
						maxWidth: "760px",
					}}
				>
					Review status and run history for PullSense pull requests. Search by
					owner, repository, and pull request number to inspect the latest AI
					review outcome, GitHub links, and recent run attempts.
				</p>
				<form
					method="get"
					style={{
						background: "rgba(255, 255, 255, 0.72)",
						border: "1px solid rgba(38, 31, 24, 0.1)",
						borderRadius: "20px",
						display: "grid",
						gap: "16px",
						gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
						marginBottom: "28px",
						padding: "20px",
					}}
				>
					{renderInput("Owner", "owner", props.pageData.form.owner)}
					{renderInput(
						"Repository",
						"repository",
						props.pageData.form.repository,
					)}
					{renderInput(
						"Pull Number",
						"pullNumber",
						props.pageData.form.pullNumber,
					)}
					<div style={{ alignSelf: "end", display: "flex", gap: "12px" }}>
						<button style={primaryButtonStyle} type="submit">
							Load review runs
						</button>
					</div>
				</form>
				<p style={{ color: "rgb(100 88 72)", marginBottom: "24px" }}>
					API base URL: <code>{props.apiBaseUrl}</code>
				</p>
				{renderPageState(props.pageData)}
			</div>
		</main>
	);
}

function renderPageState(pageData: ReviewRunsPageData) {
	if (pageData.state === "idle") {
		return (
			<StateCard title="No pull request selected">
				Enter an owner, repository, and pull request number to load the latest
				review status and recent history.
			</StateCard>
		);
	}

	if (pageData.state === "error") {
		return (
			<StateCard title="Review history unavailable">{pageData.error}</StateCard>
		);
	}

	return (
		<ReviewRunsReadyState
			data={pageData.data}
			linkStyle={linkStyle}
			panelStyle={panelStyle}
			secondaryPillStyle={secondaryPillStyle}
			tableCellStyle={tableCellStyle}
			tableHeaderStyle={tableHeaderStyle}
		/>
	);
}

function renderInput(label: string, name: string, defaultValue: string) {
	return (
		<label style={{ display: "grid", gap: "8px" }}>
			<span style={{ fontSize: "0.95rem" }}>{label}</span>
			<input defaultValue={defaultValue} name={name} style={inputStyle} />
		</label>
	);
}

function StateCard(props: { children: string; title: string }) {
	return (
		<section style={panelStyle}>
			<h2 style={{ fontSize: "1.5rem", margin: "0 0 12px" }}>{props.title}</h2>
			<p style={{ lineHeight: 1.6, margin: 0 }}>{props.children}</p>
		</section>
	);
}

const panelStyle = {
	background: "rgba(255, 255, 255, 0.82)",
	border: "1px solid rgba(38, 31, 24, 0.1)",
	borderRadius: "24px",
	padding: "24px",
} as const;

const inputStyle = {
	border: "1px solid rgba(38, 31, 24, 0.16)",
	borderRadius: "12px",
	fontFamily: "inherit",
	fontSize: "1rem",
	padding: "12px 14px",
} as const;

const primaryButtonStyle = {
	background: "rgb(38 31 24)",
	border: "none",
	borderRadius: "999px",
	color: "rgb(249 246 240)",
	cursor: "pointer",
	fontFamily: "inherit",
	fontSize: "1rem",
	padding: "12px 18px",
} as const;

const linkStyle = {
	color: "rgb(87 58 28)",
	textDecoration: "underline",
} as const;

const secondaryPillStyle = {
	background: "rgb(240 231 214)",
	borderRadius: "999px",
	display: "inline-block",
	padding: "6px 10px",
} as const;

const tableHeaderStyle = {
	borderBottom: "1px solid rgba(38, 31, 24, 0.12)",
	padding: "12px",
	textAlign: "left",
} as const;

const tableCellStyle = {
	borderBottom: "1px solid rgba(38, 31, 24, 0.08)",
	padding: "12px",
	verticalAlign: "top",
} as const;
