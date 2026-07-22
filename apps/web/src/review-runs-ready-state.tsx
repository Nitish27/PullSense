import type { ReviewRunsResponse } from "./review-runs";
import { ReviewRunsHistoryTable } from "./review-runs-history-table";

type ReviewRunsReadyStateProps = {
	data: ReviewRunsResponse;
	linkStyle: {
		color: string;
		textDecoration: "underline";
	};
	panelStyle: {
		background: string;
		border: string;
		borderRadius: string;
		padding: string;
	};
	secondaryPillStyle: {
		background: string;
		borderRadius: string;
		display: "inline-block";
		padding: string;
	};
	tableCellStyle: {
		borderBottom: string;
		padding: string;
		verticalAlign: "top";
	};
	tableHeaderStyle: {
		borderBottom: string;
		padding: string;
		textAlign: "left";
	};
};

export function ReviewRunsReadyState(props: ReviewRunsReadyStateProps) {
	const latest = props.data.latest;

	return (
		<div style={{ display: "grid", gap: "20px" }}>
			<section style={props.panelStyle}>
				<p style={{ color: "rgb(100 88 72)", margin: "0 0 8px" }}>
					{props.data.owner}/{props.data.repository} PR #{props.data.pullNumber}
				</p>
				<h2 style={{ fontSize: "1.7rem", margin: "0 0 16px" }}>
					Latest review run
				</h2>
				{latest ? (
					<>
						<div
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "12px",
								marginBottom: "16px",
							}}
						>
							{renderBadge(
								`Status: ${latest.status}`,
								props.secondaryPillStyle,
							)}
							{renderBadge(
								`Conclusion: ${latest.conclusion ?? "pending"}`,
								props.secondaryPillStyle,
							)}
							{renderBadge(
								`Severity: ${latest.overallSeverity ?? "n/a"}`,
								props.secondaryPillStyle,
							)}
						</div>
						<p style={{ lineHeight: 1.6, marginBottom: "16px" }}>
							{latest.summary ?? "No summary stored for this run."}
						</p>
						<p style={{ color: "rgb(100 88 72)", marginBottom: "8px" }}>
							Head SHA: <code>{latest.headSha}</code>
						</p>
						<p style={{ color: "rgb(100 88 72)", marginBottom: "16px" }}>
							Created {formatDateTime(latest.createdAt)}
							{latest.completedAt
								? ` · Completed ${formatDateTime(latest.completedAt)}`
								: ""}
						</p>
						<div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
							{latest.commentUrl ? (
								<a
									href={latest.commentUrl}
									rel="noopener"
									style={props.linkStyle}
									target="_blank"
								>
									Summary comment
								</a>
							) : null}
							{latest.inlineReviewUrl ? (
								<a
									href={latest.inlineReviewUrl}
									rel="noopener"
									style={props.linkStyle}
									target="_blank"
								>
									Inline review
								</a>
							) : null}
							{latest.checkRunId ? (
								<span style={props.secondaryPillStyle}>
									Check run #{latest.checkRunId}
								</span>
							) : null}
						</div>
						{latest.errorMessage ? (
							<p style={{ color: "rgb(150 55 36)", marginTop: "16px" }}>
								{latest.errorMessage}
							</p>
						) : null}
					</>
				) : (
					<p>No persisted runs found for this pull request yet.</p>
				)}
			</section>
			<section style={props.panelStyle}>
				<h2 style={{ fontSize: "1.7rem", margin: "0 0 16px" }}>
					Recent run history
				</h2>
				<ReviewRunsHistoryTable
					linkStyle={props.linkStyle}
					runs={props.data.runs}
					secondaryPillStyle={props.secondaryPillStyle}
					tableCellStyle={props.tableCellStyle}
					tableHeaderStyle={props.tableHeaderStyle}
				/>
			</section>
		</div>
	);
}

function renderBadge(
	label: string,
	secondaryPillStyle: ReviewRunsReadyStateProps["secondaryPillStyle"],
) {
	return <span style={secondaryPillStyle}>{label}</span>;
}

function formatDateTime(value: string) {
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
