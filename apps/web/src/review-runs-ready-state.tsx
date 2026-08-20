import Link from "next/link";

import type { ReviewRunsResponse } from "./review-runs";
import { buildReviewRunsDetailPath } from "./review-runs";
import styles from "./review-runs-dashboard.module.css";
import { ReviewRunsHistoryTable } from "./review-runs-history-table";
import {
	type BadgeTone,
	formatDateTime,
	formatPullRequestAction,
	getConclusionTone,
	getRunHealthLabel,
	getSeverityTone,
	getStatusTone,
} from "./review-runs-presenters";

type ReviewRunsReadyStateProps = {
	data: ReviewRunsResponse;
	variant?: "dashboard" | "detail";
};

export function ReviewRunsReadyState(props: ReviewRunsReadyStateProps) {
	const latest = props.data.latest;
	const totalRuns = props.data.runs.length;
	const successfulRuns = props.data.runs.filter(
		(run) => run.conclusion === "success",
	).length;
	const failedRuns = props.data.runs.filter(
		(run) => run.conclusion === "failure" || run.status === "failed",
	).length;
	const variant = props.variant ?? "dashboard";
	const detailHref = buildReviewRunsDetailPath({
		owner: props.data.owner,
		pullNumber: props.data.pullNumber,
		repository: props.data.repository,
	});

	return (
		<div className={styles.contentStack}>
			<section className={`${styles.panel} ${styles.latestPanel}`}>
				<div className={styles.latestSummary}>
					<div className={styles.summaryHeader}>
						<div>
							<p className={styles.kicker}>
								{props.data.owner}/{props.data.repository} PR #
								{props.data.pullNumber}
							</p>
							<h2 className={styles.summaryTitle}>Review command center</h2>
						</div>
						<div className={styles.badgeRow}>
							<span
								className={getBadgeClassName(
									getStatusTone(latest?.status ?? "queued"),
								)}
							>
								{latest ? `Status: ${latest.status}` : "Status: awaiting run"}
							</span>
							<span
								className={getBadgeClassName(
									getConclusionTone(latest?.conclusion ?? null),
								)}
							>
								{`Conclusion: ${latest?.conclusion ?? "pending"}`}
							</span>
							<span
								className={getBadgeClassName(
									getSeverityTone(latest?.overallSeverity ?? null),
								)}
							>
								{`Severity: ${latest?.overallSeverity ?? "n/a"}`}
							</span>
						</div>
					</div>
					<p className={styles.summaryLead}>
						The latest PullSense state for this pull request, including the
						editorial summary, linked GitHub artifacts, and enough diagnostics
						to understand whether the system is healthy or needs intervention.
					</p>
					<div className={styles.summaryText}>
						<p className={styles.panelText}>
							{latest?.summary ??
								"No summary has been persisted yet. Once a run completes, PullSense will surface the stored review narrative here."}
						</p>
					</div>
					<div className={styles.summaryMetaGrid}>
						<div className={styles.metaCard}>
							<p className={styles.metaLabel}>Head SHA</p>
							<p className={styles.metaValue}>
								<code>{latest?.headSha ?? "Not recorded yet"}</code>
							</p>
						</div>
						<div className={styles.metaCard}>
							<p className={styles.metaLabel}>Review Action</p>
							<p className={styles.metaValue}>
								{latest
									? formatPullRequestAction(latest.pullRequestAction)
									: "Unknown"}
							</p>
						</div>
						<div className={styles.metaCard}>
							<p className={styles.metaLabel}>Run Timing</p>
							<p className={styles.metaValue}>
								{latest
									? `Started ${formatDateTime(latest.createdAt)}${
											latest.completedAt
												? ` · Completed ${formatDateTime(latest.completedAt)}`
												: ""
										}`
									: "Waiting for the first persisted run"}
							</p>
						</div>
						<div className={styles.metaCard}>
							<p className={styles.metaLabel}>Operational Health</p>
							<p className={styles.metaValue}>{getRunHealthLabel(latest)}</p>
						</div>
					</div>
					{variant === "dashboard" ? (
						<div className={styles.inlineActionRow}>
							<Link className={styles.secondaryButton} href={detailHref}>
								Open dedicated PR route
							</Link>
						</div>
					) : null}
				</div>
				<div className={styles.railStack}>
					<section className={styles.artifactCard}>
						<p className={styles.kicker}>GitHub artifacts</p>
						<h3 className={styles.statusRailTitle}>Linked review output</h3>
						<p className={styles.darkCardText}>
							Open the exact PullSense artifacts that were created for the
							latest run without hunting through the PR conversation.
						</p>
						<div className={styles.artifactList}>
							{latest?.commentUrl ? (
								<a
									className={styles.artifactLink}
									href={latest.commentUrl}
									rel="noopener"
									target="_blank"
								>
									<span className={styles.artifactLabel}>Summary comment</span>
									<span className={styles.artifactMeta}>GitHub discussion</span>
								</a>
							) : null}
							{latest?.inlineReviewUrl ? (
								<a
									className={styles.artifactLink}
									href={latest.inlineReviewUrl}
									rel="noopener"
									target="_blank"
								>
									<span className={styles.artifactLabel}>Inline review</span>
									<span className={styles.artifactMeta}>
										Anchored code comments
									</span>
								</a>
							) : null}
							{latest?.checkRunId ? (
								<div className={styles.artifactLink}>
									<span className={styles.artifactLabel}>Check run</span>
									<span className={styles.artifactMeta}>
										#{latest.checkRunId}
									</span>
								</div>
							) : null}
							{!latest?.commentUrl &&
							!latest?.inlineReviewUrl &&
							!latest?.checkRunId ? (
								<p className={styles.darkCardText}>
									No GitHub artifacts have been linked to the latest run yet.
								</p>
							) : null}
						</div>
					</section>
					<section className={styles.diagnosticCard}>
						<p className={styles.kicker}>Run diagnostics</p>
						<h3 className={styles.statusRailTitle}>Operational snapshot</h3>
						<div className={styles.detailList}>
							<div className={styles.detailRow}>
								<span className={styles.detailLabel}>Persisted runs</span>
								<span className={styles.detailValue}>{totalRuns}</span>
							</div>
							<div className={styles.detailRow}>
								<span className={styles.detailLabel}>Successful runs</span>
								<span className={styles.detailValue}>{successfulRuns}</span>
							</div>
							<div className={styles.detailRow}>
								<span className={styles.detailLabel}>Failed runs</span>
								<span className={styles.detailValue}>{failedRuns}</span>
							</div>
							<div className={styles.detailRow}>
								<span className={styles.detailLabel}>Installation</span>
								<span className={styles.detailValue}>
									{latest?.installationId ?? "Unknown"}
								</span>
							</div>
						</div>
						{latest?.errorMessage ? (
							<p className={styles.errorText}>{latest.errorMessage}</p>
						) : (
							<p className={styles.darkCardText}>
								No failure message is stored for the latest run.
							</p>
						)}
					</section>
				</div>
			</section>
			<section className={styles.panel}>
				<div className={styles.historyPanelHeader}>
					<div>
						<p className={styles.kicker}>Recent attempts</p>
						<h2 className={styles.panelTitle}>Run history</h2>
						<p className={styles.panelText}>
							A timeline-friendly record of every persisted PullSense attempt
							for this pull request, including status, action type, severity,
							and linked GitHub output.
						</p>
					</div>
					<div className={styles.historyStats}>
						<span className={getBadgeClassName("neutral")}>
							Total runs: {totalRuns}
						</span>
						<span className={getBadgeClassName("success")}>
							Successful: {successfulRuns}
						</span>
						<span
							className={getBadgeClassName(
								failedRuns > 0 ? "danger" : "neutral",
							)}
						>
							Failed: {failedRuns}
						</span>
					</div>
				</div>
				<ReviewRunsHistoryTable runs={props.data.runs} />
			</section>
		</div>
	);
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
