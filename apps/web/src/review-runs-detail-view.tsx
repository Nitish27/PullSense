import { APP_NAME, APP_PHASE } from "@ai-code-review/shared";
import Link from "next/link";

import type { ReviewRunsPageData } from "./review-runs";
import {
	buildRepositoryHealthPath,
	buildReviewRunsSearchPath,
} from "./review-runs";
import styles from "./review-runs-dashboard.module.css";
import { ReviewRunsReadyState } from "./review-runs-ready-state";

type ReviewRunsDetailViewProps = {
	apiBaseUrl: string;
	pageData: ReviewRunsPageData;
};

export function ReviewRunsDetailView(props: ReviewRunsDetailViewProps) {
	const backHref = buildReviewRunsSearchPath({
		owner: props.pageData.form.owner,
		pullNumber: props.pageData.form.pullNumber,
		repository: props.pageData.form.repository,
	});
	const repositoryHealthHref = buildRepositoryHealthPath({
		owner: props.pageData.form.owner,
		repository: props.pageData.form.repository,
	});

	return (
		<main className={styles.page}>
			<div className={styles.shell}>
				<div className={styles.detailTopBar}>
					<div className={styles.breadcrumbs}>
						<Link className={styles.breadcrumbLink} href="/">
							{APP_NAME}
						</Link>
						<span className={styles.breadcrumbDivider}>/</span>
						<span className={styles.breadcrumbCurrent}>PR detail</span>
					</div>
					<div className={styles.detailActions}>
						<Link
							className={styles.secondaryButton}
							href={repositoryHealthHref}
						>
							Repository health
						</Link>
						<Link className={styles.secondaryButton} href={backHref}>
							Back to command center
						</Link>
					</div>
				</div>
				<section className={styles.detailHero}>
					<div className={styles.detailHeroContent}>
						<p className={styles.eyebrow}>{APP_PHASE}</p>
						<h1 className={styles.detailTitle}>
							{props.pageData.form.owner || "Unknown owner"}/
							{props.pageData.form.repository || "Unknown repo"} PR #
							{props.pageData.form.pullNumber || "?"}
						</h1>
						<p className={styles.description}>
							This dedicated PullSense route is the single-PR inspection
							surface. Use it to review the latest stored verdict, GitHub
							artifacts, run history, and failure diagnostics without the
							overview page around it.
						</p>
					</div>
					<div className={styles.detailHeroAside}>
						<div className={styles.statusCard}>
							<p className={styles.statusCardTitle}>Route purpose</p>
							<p className={styles.statusCardValue}>
								Focused review intelligence for one pull request.
							</p>
						</div>
						<div className={styles.statusCard}>
							<p className={styles.statusCardTitle}>API source</p>
							<p className={styles.statusCardValue}>
								<code>{props.apiBaseUrl}</code>
							</p>
						</div>
					</div>
				</section>
				{renderDetailState(props.pageData)}
			</div>
		</main>
	);
}

function renderDetailState(pageData: ReviewRunsPageData) {
	if (pageData.state === "ready") {
		return <ReviewRunsReadyState data={pageData.data} variant="detail" />;
	}

	return (
		<section className={styles.statePanel}>
			<div className={styles.stateBody}>
				<div>
					<p className={styles.kicker}>PR detail unavailable</p>
					<h2 className={styles.stateTitle}>
						PullSense could not load this PR
					</h2>
					<p className={styles.stateText}>
						{pageData.state === "error"
							? pageData.error
							: "This route needs a valid owner, repository, and pull request number."}
					</p>
				</div>
				<ul className={styles.ctaList}>
					<li>
						Verify the URL contains the correct owner, repository, and PR
						number.
					</li>
					<li>
						Confirm the API and database are running before refreshing the page.
					</li>
					<li>
						Use the command center if you want to search for another PR quickly.
					</li>
				</ul>
			</div>
		</section>
	);
}
