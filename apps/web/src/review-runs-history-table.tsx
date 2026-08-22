import type { ReviewRunsResponse } from "./review-runs";
import styles from "./review-runs-dashboard.module.css";
import {
	type BadgeTone,
	formatDateTime,
	formatPullRequestAction,
	getConclusionTone,
	getSeverityTone,
	getStatusTone,
} from "./review-runs-presenters";

type ReviewRunsHistoryTableProps = {
	runs: ReviewRunsResponse["runs"];
};

const tableHeadings = [
	"Run",
	"Status",
	"Conclusion",
	"Severity",
	"Action",
	"Created",
	"Links",
] as const;

export function ReviewRunsHistoryTable(props: ReviewRunsHistoryTableProps) {
	if (props.runs.length === 0) {
		return (
			<div className={styles.emptyHistory}>
				<p className={styles.panelText}>
					No runs have been persisted for this pull request yet. Once PullSense
					processes an `opened` or `synchronize` event, the history will appear
					here.
				</p>
			</div>
		);
	}

	return (
		<div className={styles.tableWrap}>
			<table className={styles.table}>
				<thead>
					<tr>
						{tableHeadings.map((heading) => (
							<th key={heading}>{heading}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{props.runs.map((run) => (
						<tr key={run.id}>
							<td>
								<div className={styles.runLabel}>
									<span className={styles.runId}>#{run.id}</span>
									<code className={styles.shaPill}>
										{run.headSha.slice(0, 12)}
									</code>
								</div>
							</td>
							<td>
								<span className={getBadgeClassName(getStatusTone(run.status))}>
									{run.status}
								</span>
							</td>
							<td>
								<span
									className={getBadgeClassName(
										getConclusionTone(run.conclusion),
									)}
								>
									{run.conclusion ?? "pending"}
								</span>
							</td>
							<td>
								<span
									className={getBadgeClassName(
										getSeverityTone(run.overallSeverity),
									)}
								>
									{run.overallSeverity ?? "n/a"}
								</span>
							</td>
							<td>{formatPullRequestAction(run.pullRequestAction)}</td>
							<td>{formatDateTime(run.createdAt)}</td>
							<td>
								<div className={styles.linksColumn}>
									{run.commentUrl ? (
										<a
											className={styles.textLink}
											href={run.commentUrl}
											rel="noopener"
											target="_blank"
										>
											Summary comment
										</a>
									) : null}
									{run.inlineReviewUrl ? (
										<a
											className={styles.textLink}
											href={run.inlineReviewUrl}
											rel="noopener"
											target="_blank"
										>
											Inline review
										</a>
									) : null}
									{run.checkRunId ? (
										<span className={getBadgeClassName("neutral")}>
											Check #{run.checkRunId}
										</span>
									) : (
										<span className={styles.mutedText}>
											No linked artifacts
										</span>
									)}
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
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
