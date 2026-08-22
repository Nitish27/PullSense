import Link from "next/link";

import type {
	RepositoryHealthPageData,
	RepositoryReviewHealthResponse,
} from "./review-runs";
import { buildReviewRunsDetailPath } from "./review-runs";
import styles from "./review-runs-dashboard.module.css";
import {
	type BadgeTone,
	formatDateTime,
	formatPullRequestAction,
	getConclusionTone,
	getSeverityTone,
	getStatusTone,
} from "./review-runs-presenters";

type RepositoryHealthViewProps = {
	apiBaseUrl: string;
	appName: string;
	pageData: RepositoryHealthPageData;
	phase: string;
};

export function RepositoryHealthView(props: RepositoryHealthViewProps) {
	return (
		<main className={styles.page}>
			<div className={styles.shell}>
				<div className={styles.detailTopBar}>
					<div className={styles.breadcrumbs}>
						<Link className={styles.breadcrumbLink} href="/">
							{props.appName}
						</Link>
						<span className={styles.breadcrumbDivider}>/</span>
						<span className={styles.breadcrumbCurrent}>Repository health</span>
					</div>
					<Link className={styles.secondaryButton} href="/">
						Back to command center
					</Link>
				</div>
				{renderRepositoryHealthState(props)}
			</div>
		</main>
	);
}

function renderRepositoryHealthState(props: RepositoryHealthViewProps) {
	if (props.pageData.state === "error") {
		return (
			<section className={styles.statePanel}>
				<div className={styles.stateBody}>
					<div>
						<p className={styles.kicker}>Repository health unavailable</p>
						<h1 className={styles.stateTitle}>
							PullSense could not load this repository
						</h1>
						<p className={styles.stateText}>{props.pageData.error}</p>
					</div>
					<ul className={styles.ctaList}>
						<li>Verify the owner and repository in the URL.</li>
						<li>Confirm the API and PostgreSQL are running.</li>
						<li>Open a PR detail route to inspect one review run directly.</li>
					</ul>
				</div>
			</section>
		);
	}

	return <RepositoryHealthReadyState {...props} data={props.pageData.data} />;
}

function RepositoryHealthReadyState(
	props: RepositoryHealthViewProps & {
		data: RepositoryReviewHealthResponse;
	},
) {
	const { data } = props;
	const successRate = getPercentage(
		data.metrics.successfulRuns,
		data.metrics.totalRuns,
	);
	const failureRate = getPercentage(
		data.metrics.failedRuns,
		data.metrics.totalRuns,
	);

	return (
		<div className={styles.contentStack}>
			<section className={styles.repositoryHero}>
				<div className={styles.repositoryHeroContent}>
					<p className={styles.eyebrow}>{props.phase}</p>
					<h1 className={styles.detailTitle}>
						{data.owner}/{data.repository}
					</h1>
					<p className={styles.description}>
						A 30-day operational view of PullSense review throughput, quality,
						and the failure signals that need attention before they affect the
						team.
					</p>
				</div>
				<div className={styles.detailHeroAside}>
					<div className={styles.statusCard}>
						<p className={styles.statusCardTitle}>Health window</p>
						<p className={styles.statusCardValue}>Last 30 days</p>
					</div>
					<div className={styles.statusCard}>
						<p className={styles.statusCardTitle}>Data source</p>
						<p className={styles.statusCardValue}>
							<code>{props.apiBaseUrl}</code>
						</p>
					</div>
				</div>
			</section>

			<section className={styles.healthMetricGrid}>
				<MetricCard label="Review runs" value={data.metrics.totalRuns} />
				<MetricCard label="Success rate" value={successRate} tone="success" />
				<MetricCard label="Failure rate" value={failureRate} tone="danger" />
				<MetricCard
					label="Average review time"
					value={formatLatency(data.metrics.averageReviewLatencyMs)}
				/>
			</section>

			<section className={`${styles.panel} ${styles.healthOpsPanel}`}>
				<div className={styles.historyPanelHeader}>
					<div>
						<p className={styles.kicker}>Failure intelligence</p>
						<h2 className={styles.panelTitle}>Where review runs fail</h2>
						<p className={styles.panelText}>
							Failure categories are derived from stored operational errors, so
							you can see whether attention belongs with the model, GitHub, or
							local infrastructure.
						</p>
					</div>
					<div className={styles.historyStats}>
						<span className={getBadgeClassName("neutral")}>
							{data.metrics.failedRuns} failed runs
						</span>
					</div>
				</div>
				<div className={styles.failureTrendGrid}>
					{data.failureTrends.map((trend) => (
						<div className={styles.failureTrendCard} key={trend.category}>
							<p className={styles.metaLabel}>{trend.category}</p>
							<p className={styles.failureTrendCount}>{trend.count}</p>
							<p className={styles.failureTrendCaption}>
								{trend.count === 1 ? "recorded failure" : "recorded failures"}
							</p>
						</div>
					))}
				</div>
			</section>

			<section className={`${styles.panel} ${styles.repositoryActivityPanel}`}>
				<div className={styles.historyPanelHeader}>
					<div>
						<p className={styles.kicker}>Recent pull requests</p>
						<h2 className={styles.panelTitle}>Latest review state by PR</h2>
						<p className={styles.panelText}>
							Open a PR to inspect its summary, artifacts, retry history, and
							failure diagnostics.
						</p>
					</div>
					<div className={styles.historyStats}>
						<span className={getBadgeClassName("neutral")}>
							{data.recentPullRequests.length} active records
						</span>
					</div>
				</div>
				{data.recentPullRequests.length > 0 ? (
					<div className={styles.repositoryActivityGrid}>
						{data.recentPullRequests.map((reviewRun) => (
							<Link
								className={styles.repositoryActivityCard}
								href={buildReviewRunsDetailPath({
									owner: reviewRun.owner,
									pullNumber: reviewRun.pullNumber,
									repository: reviewRun.repository,
								})}
								key={reviewRun.pullNumber}
							>
								<div className={styles.repositoryActivityCardHeader}>
									<div>
										<p className={styles.kicker}>Pull request</p>
										<h3 className={styles.repositoryActivityTitle}>
											PR #{reviewRun.pullNumber}
										</h3>
									</div>
									<span
										className={getBadgeClassName(
											getStatusTone(reviewRun.status),
										)}
									>
										{reviewRun.status}
									</span>
								</div>
								<div className={styles.badgeRow}>
									<span
										className={getBadgeClassName(
											getConclusionTone(reviewRun.conclusion),
										)}
									>
										{reviewRun.conclusion ?? "pending"}
									</span>
									<span
										className={getBadgeClassName(
											getSeverityTone(reviewRun.overallSeverity),
										)}
									>
										{reviewRun.overallSeverity ?? "n/a"}
									</span>
								</div>
								<p className={styles.repositoryActivitySummary}>
									{reviewRun.summary ??
										reviewRun.errorMessage ??
										"No final review narrative has been stored yet."}
								</p>
								<div className={styles.repositoryActivityMeta}>
									<span>
										{formatPullRequestAction(reviewRun.pullRequestAction)}
									</span>
									<span>{formatDateTime(reviewRun.createdAt)}</span>
								</div>
							</Link>
						))}
					</div>
				) : (
					<div className={styles.emptyHistory}>
						<p className={styles.panelText}>
							No review runs were recorded in the last 30 days. Install
							PullSense on the repository and open or update a pull request to
							populate this view.
						</p>
					</div>
				)}
			</section>
		</div>
	);
}

function MetricCard(props: {
	label: string;
	tone?: "danger" | "success";
	value: number | string;
}) {
	return (
		<div
			className={`${styles.healthMetricCard} ${
				props.tone === "danger"
					? styles.healthMetricCardDanger
					: props.tone === "success"
						? styles.healthMetricCardSuccess
						: ""
			}`}
		>
			<p className={styles.metaLabel}>{props.label}</p>
			<p className={styles.healthMetricValue}>{props.value}</p>
		</div>
	);
}

function formatLatency(value: number | null) {
	if (value === null) {
		return "Awaiting data";
	}

	if (value < 1_000) {
		return `${value} ms`;
	}

	return `${(value / 1_000).toFixed(1)} sec`;
}

function getPercentage(value: number, total: number) {
	if (total === 0) {
		return "No data";
	}

	return `${Math.round((value / total) * 100)}%`;
}

function getBadgeClassName(tone: BadgeTone) {
	if (tone === "success") {
		return `${styles.badge} ${styles.badgeSuccess}`;
	}

	if (tone === "warning") {
		return `${styles.badge} ${styles.badgeWarning}`;
	}

	if (tone === "danger") {
		return `${styles.badge} ${styles.badgeDanger}`;
	}

	return `${styles.badge} ${styles.badgeNeutral}`;
}
