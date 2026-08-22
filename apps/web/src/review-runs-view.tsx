import Link from "next/link";

import type { ReviewRunsPageData } from "./review-runs";
import { buildSetupCenterPath } from "./review-runs";
import styles from "./review-runs-dashboard.module.css";
import { ReviewRunsReadyState } from "./review-runs-ready-state";

type ReviewRunsDashboardProps = {
	appName: string;
	apiBaseUrl: string;
	phase: string;
	pageData: ReviewRunsPageData;
};

export function ReviewRunsDashboard(props: ReviewRunsDashboardProps) {
	return (
		<main className={styles.page}>
			<div className={styles.shell}>
				<section className={styles.masthead}>
					<div className={styles.heroPanel}>
						<div className={styles.heroContent}>
							<p className={styles.eyebrow}>{props.phase}</p>
							<h1 className={styles.title}>{props.appName}</h1>
							<p className={styles.description}>
								PullSense is the review command center for AI code review runs.
								Search by repository and pull request to inspect the latest
								verdict, linked GitHub artifacts, operational health, and recent
								attempt history without digging through raw webhook logs.
							</p>
							<div className={styles.heroMetrics}>
								<div className={styles.metricTile}>
									<p className={styles.metricLabel}>Primary surface</p>
									<p className={styles.metricValue}>Review command center</p>
								</div>
								<div className={styles.metricTile}>
									<p className={styles.metricLabel}>Artifacts tracked</p>
									<p className={styles.metricValue}>Summary, inline, checks</p>
								</div>
								<div className={styles.metricTile}>
									<p className={styles.metricLabel}>Current mode</p>
									<p className={styles.metricValue}>Operational clarity</p>
								</div>
							</div>
						</div>
					</div>
					<aside className={styles.statusRail}>
						<div className={styles.statusRailHeader}>
							<h2 className={styles.statusRailTitle}>Phase A objective</h2>
							<p className={styles.statusRailText}>
								Turn the existing review lookup page into a premium, high-trust
								dashboard that feels product-ready even before repository and
								settings surfaces arrive.
							</p>
						</div>
						<div className={styles.statusGrid}>
							<div className={styles.statusCard}>
								<p className={styles.statusCardTitle}>
									What this page should do
								</p>
								<p className={styles.statusCardValue}>
									Show the latest PR state in under ten seconds.
								</p>
							</div>
							<div className={styles.statusCard}>
								<p className={styles.statusCardTitle}>
									What it should feel like
								</p>
								<p
									className={`${styles.statusCardValue} ${styles.statusCardValueStrong}`}
								>
									Calm, premium, and trustworthy.
								</p>
							</div>
							<div className={styles.statusCard}>
								<p className={styles.statusCardTitle}>Backed by</p>
								<p className={styles.statusCardValue}>
									Stored review runs, GitHub links, and operational diagnostics.
								</p>
							</div>
						</div>
						<Link
							className={styles.secondaryButton}
							href={buildSetupCenterPath()}
						>
							Open setup center
						</Link>
					</aside>
				</section>
				<form className={styles.searchPanel} method="get">
					<div className={styles.searchPanelHeader}>
						<div>
							<h2 className={styles.searchPanelTitle}>
								Inspect a pull request
							</h2>
							<p className={styles.searchPanelText}>
								Load the persisted PullSense view for a specific PR to see the
								latest review outcome, artifact links, severity, and run
								history.
							</p>
						</div>
						<div className={styles.apiMeta}>
							API base URL: <code>{props.apiBaseUrl}</code>
						</div>
					</div>
					<div className={styles.searchGrid}>
						{renderInput(
							"Owner",
							"GitHub account or organization",
							"owner",
							props.pageData.form.owner,
						)}
						{renderInput(
							"Repository",
							"Repository name exactly as installed",
							"repository",
							props.pageData.form.repository,
						)}
						{renderInput(
							"Pull number",
							"The numeric PR identifier",
							"pullNumber",
							props.pageData.form.pullNumber,
						)}
						<div className={styles.searchAction}>
							<button className={styles.button} type="submit">
								Load review runs
							</button>
						</div>
					</div>
				</form>
				{renderPageState(props.pageData)}
			</div>
		</main>
	);
}

function renderPageState(pageData: ReviewRunsPageData) {
	if (pageData.state === "idle") {
		return (
			<StateCard
				body="Enter an owner, repository, and pull request number to load the latest persisted PullSense state for a PR."
				title="No pull request selected"
			>
				<ul className={styles.ctaList}>
					<li>Use a real PR that has already triggered the GitHub App.</li>
					<li>
						Start with the latest active PR when testing new review behavior.
					</li>
					<li>
						Once loaded, this page becomes the fastest way to inspect status,
						artifacts, and failures.
					</li>
				</ul>
			</StateCard>
		);
	}

	if (pageData.state === "error") {
		return (
			<StateCard body={pageData.error} title="Review history unavailable">
				<ul className={styles.ctaList}>
					<li>Check the API process and database connection first.</li>
					<li>Confirm the PR number is a positive integer.</li>
					<li>
						Verify that the repository already has persisted `review_runs` data.
					</li>
				</ul>
			</StateCard>
		);
	}

	return <ReviewRunsReadyState data={pageData.data} />;
}

function renderInput(
	label: string,
	hint: string,
	name: string,
	defaultValue: string,
) {
	return (
		<label className={styles.field}>
			<span className={styles.fieldLabel}>{label}</span>
			<span className={styles.fieldHint}>{hint}</span>
			<input className={styles.input} defaultValue={defaultValue} name={name} />
		</label>
	);
}

function StateCard(props: {
	body: string;
	children: React.ReactNode;
	title: string;
}) {
	return (
		<section className={styles.statePanel}>
			<div className={styles.stateBody}>
				<div>
					<h2 className={styles.stateTitle}>{props.title}</h2>
					<p className={styles.stateText}>{props.body}</p>
				</div>
				{props.children}
			</div>
		</section>
	);
}
