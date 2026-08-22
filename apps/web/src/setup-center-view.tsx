import Link from "next/link";

import type { SetupStatusPageData, SetupStatusResponse } from "./review-runs";
import { buildSetupCenterPath } from "./review-runs";
import styles from "./review-runs-dashboard.module.css";
import type { BadgeTone } from "./review-runs-presenters";

type SetupCenterViewProps = {
	apiBaseUrl: string;
	appName: string;
	pageData: SetupStatusPageData;
	phase: string;
};

type SetupServiceKey = keyof SetupStatusResponse;

const setupServices: Array<{
	description: string;
	key: SetupServiceKey;
	label: string;
}> = [
	{
		description:
			"Stores review history, GitHub artifacts, and operational diagnostics.",
		key: "database",
		label: "PostgreSQL persistence",
	},
	{
		description: "Receives signed pull request events from the GitHub App.",
		key: "webhook",
		label: "Webhook signing",
	},
	{
		description:
			"Authenticates PullSense to fetch diffs and post review output.",
		key: "githubApp",
		label: "GitHub App credentials",
	},
	{
		description:
			"Queues review work so webhook delivery stays fast and reliable.",
		key: "queue",
		label: "Redis review queue",
	},
	{
		description:
			"Generates the structured AI review summary and inline findings.",
		key: "modelProvider",
		label: "Gemini provider",
	},
];

export function SetupCenterView(props: SetupCenterViewProps) {
	return (
		<main className={styles.page}>
			<div className={styles.shell}>
				<div className={styles.detailTopBar}>
					<div className={styles.breadcrumbs}>
						<Link className={styles.breadcrumbLink} href="/">
							{props.appName}
						</Link>
						<span className={styles.breadcrumbDivider}>/</span>
						<span className={styles.breadcrumbCurrent}>Setup center</span>
					</div>
					<Link className={styles.secondaryButton} href="/">
						Back to command center
					</Link>
				</div>
				{props.pageData.state === "ready" ? (
					<SetupCenterReadyState {...props} data={props.pageData.data} />
				) : (
					<SetupCenterErrorState error={props.pageData.error} />
				)}
			</div>
		</main>
	);
}

function SetupCenterReadyState(
	props: SetupCenterViewProps & { data: SetupStatusResponse },
) {
	const readyServices = setupServices.filter(
		(service) => props.data[service.key].state === "ready",
	).length;
	const attentionServices = setupServices.length - readyServices;
	const isReadyForFirstReview = attentionServices === 0;

	return (
		<div className={styles.contentStack}>
			<section className={styles.setupHero}>
				<div className={styles.detailHeroContent}>
					<p className={styles.eyebrow}>{props.phase}</p>
					<h1 className={styles.detailTitle}>Setup center</h1>
					<p className={styles.description}>
						A calm, read-only preflight for PullSense. See what is configured,
						what still needs attention, and the shortest path to your first
						successful review.
					</p>
				</div>
				<div className={styles.detailHeroAside}>
					<div className={styles.statusCard}>
						<p className={styles.statusCardTitle}>Setup readiness</p>
						<p className={styles.statusCardValue}>
							{readyServices} of {setupServices.length} checks ready
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

			<section className={`${styles.panel} ${styles.setupReadinessPanel}`}>
				<div className={styles.historyPanelHeader}>
					<div>
						<p className={styles.kicker}>Integration readiness</p>
						<h2 className={styles.panelTitle}>
							What PullSense can verify locally
						</h2>
						<p className={styles.panelText}>
							These are safe configuration signals from the running API. They do
							not reveal secrets or make changes to GitHub.
						</p>
					</div>
					<span
						className={getBadgeClassName(
							isReadyForFirstReview ? "success" : "warning",
						)}
					>
						{isReadyForFirstReview
							? "Ready for a first review"
							: `${attentionServices} checks need attention`}
					</span>
				</div>
				<div className={styles.setupReadinessGrid}>
					{setupServices.map((service) => {
						const status = props.data[service.key];

						return (
							<article className={styles.setupStatusCard} key={service.key}>
								<div className={styles.setupStatusHeader}>
									<div>
										<p className={styles.metaLabel}>{service.label}</p>
										<h3 className={styles.setupStatusTitle}>
											{getSetupStateLabel(status.state)}
										</h3>
									</div>
									<span
										className={getBadgeClassName(
											getSetupStateTone(status.state),
										)}
									>
										{status.state}
									</span>
								</div>
								<p className={styles.setupStatusDetail}>{status.detail}</p>
								<p className={styles.setupStatusCaption}>
									{service.description}
								</p>
							</article>
						);
					})}
				</div>
			</section>

			<section className={`${styles.panel} ${styles.setupOnboardingPanel}`}>
				<div className={styles.historyPanelHeader}>
					<div>
						<p className={styles.kicker}>First successful review</p>
						<h2 className={styles.panelTitle}>Your shortest onboarding path</h2>
						<p className={styles.panelText}>
							Complete these steps in order. PullSense will persist the run,
							post the summary, and link all available GitHub artifacts.
						</p>
					</div>
					<Link
						className={styles.secondaryButton}
						href={buildSetupCenterPath()}
					>
						Refresh setup status
					</Link>
				</div>
				<ol className={styles.setupChecklist}>
					<OnboardingStep
						detail="Confirm GitHub App credentials and a non-default webhook secret are ready above."
						number="01"
						title="Configure safe credentials"
					/>
					<OnboardingStep
						detail="Run PostgreSQL, Redis, the API, and the worker before sending an event."
						number="02"
						title="Start local PullSense services"
					/>
					<OnboardingStep
						detail="Expose the API with ngrok and point the GitHub App webhook at its /webhook endpoint."
						number="03"
						title="Connect GitHub delivery"
					/>
					<OnboardingStep
						detail="Install the GitHub App on a test repository with Contents, Pull requests, and Checks permissions."
						number="04"
						title="Install PullSense on a repository"
					/>
					<OnboardingStep
						detail="Open a PR or push a commit to an existing PR, then inspect the summary, inline review, check run, and stored history."
						number="05"
						title="Trigger the first review"
					/>
				</ol>
			</section>

			<section className={styles.setupTrustCard}>
				<div>
					<p className={styles.kicker}>Trust boundary</p>
					<h2 className={styles.statusRailTitle}>
						A setup view without secret exposure
					</h2>
				</div>
				<p className={styles.darkCardText}>
					This page only shows configuration posture and guidance. It never
					displays API keys, webhook secrets, private keys, database URLs, or
					controls that modify your GitHub App.
				</p>
			</section>
		</div>
	);
}

function SetupCenterErrorState(props: { error: string }) {
	return (
		<section className={styles.statePanel}>
			<div className={styles.stateBody}>
				<div>
					<p className={styles.kicker}>Setup status unavailable</p>
					<h1 className={styles.stateTitle}>
						PullSense could not load the setup center
					</h1>
					<p className={styles.stateText}>{props.error}</p>
				</div>
				<ul className={styles.ctaList}>
					<li>Confirm the API process is running and reachable.</li>
					<li>Restart the API after changing local environment variables.</li>
					<li>
						Use the command center to inspect persisted review runs directly.
					</li>
				</ul>
			</div>
		</section>
	);
}

function OnboardingStep(props: {
	detail: string;
	number: string;
	title: string;
}) {
	return (
		<li className={styles.setupStep}>
			<span className={styles.setupStepNumber}>{props.number}</span>
			<div>
				<h3 className={styles.setupStepTitle}>{props.title}</h3>
				<p className={styles.setupStepDetail}>{props.detail}</p>
			</div>
		</li>
	);
}

function getBadgeClassName(tone: BadgeTone) {
	if (tone === "success") {
		return `${styles.badge} ${styles.badgeSuccess}`;
	}

	if (tone === "warning") {
		return `${styles.badge} ${styles.badgeWarning}`;
	}

	return `${styles.badge} ${styles.badgeNeutral}`;
}

function getSetupStateLabel(
	state: SetupStatusResponse[SetupServiceKey]["state"],
) {
	if (state === "ready") {
		return "Configured";
	}

	if (state === "attention") {
		return "Needs attention";
	}

	return "Missing configuration";
}

function getSetupStateTone(
	state: SetupStatusResponse[SetupServiceKey]["state"],
): BadgeTone {
	if (state === "ready") {
		return "success";
	}

	if (state === "attention") {
		return "warning";
	}

	return "danger";
}
