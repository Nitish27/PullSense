import type { ReviewRunsResponse } from "./review-runs";

type ReviewRunsHistoryTableProps = {
	linkStyle: {
		color: string;
		textDecoration: "underline";
	};
	runs: ReviewRunsResponse["runs"];
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
	return (
		<div style={{ overflowX: "auto" }}>
			<table
				style={{
					borderCollapse: "collapse",
					minWidth: "880px",
					width: "100%",
				}}
			>
				<thead>
					<tr>
						{tableHeadings.map((heading) => (
							<th key={heading} style={props.tableHeaderStyle}>
								{heading}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{props.runs.map((run) => (
						<tr key={run.id}>
							<td style={props.tableCellStyle}>
								#{run.id}
								<br />
								<code>{run.headSha.slice(0, 12)}</code>
							</td>
							<td style={props.tableCellStyle}>{run.status}</td>
							<td style={props.tableCellStyle}>
								{run.conclusion ?? "pending"}
							</td>
							<td style={props.tableCellStyle}>
								{run.overallSeverity ?? "n/a"}
							</td>
							<td style={props.tableCellStyle}>{run.pullRequestAction}</td>
							<td style={props.tableCellStyle}>
								{formatDateTime(run.createdAt)}
							</td>
							<td style={props.tableCellStyle}>
								<div style={{ display: "grid", gap: "6px" }}>
									{run.commentUrl ? (
										<a
											href={run.commentUrl}
											rel="noopener"
											style={props.linkStyle}
											target="_blank"
										>
											Comment
										</a>
									) : null}
									{run.inlineReviewUrl ? (
										<a
											href={run.inlineReviewUrl}
											rel="noopener"
											style={props.linkStyle}
											target="_blank"
										>
											Inline review
										</a>
									) : null}
									{run.checkRunId ? (
										<span style={props.secondaryPillStyle}>
											Check #{run.checkRunId}
										</span>
									) : null}
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function formatDateTime(value: string) {
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
