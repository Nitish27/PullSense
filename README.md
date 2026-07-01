# PullSense

Context-aware AI code review bot for GitHub pull requests.

This project is being built as a GitHub App that reviews PRs with repository-aware context instead of diff-only analysis. The long-term goal is to combine:

- GitHub webhook ingestion
- asynchronous review jobs
- repository indexing with semantic retrieval
- structured AI review output
- a lightweight dashboard for onboarding, status, and billing

## Current Status

The repository is currently in `Phase 1: summary-plus-inline review MVP`.

What exists today:
- `pnpm` + `turbo` monorepo workspace
- `Fastify` API scaffold in `apps/api`
- `Next.js` web scaffold in `apps/web`
- GitHub App webhook verification and PR event enqueueing
- BullMQ worker flow for PR review jobs
- changed-file fetch from GitHub pull requests
- Gemini-powered structured PR review generation
- one markdown summary comment posted back to the PR conversation
- one grouped pull request review for high-confidence inline diff findings
- baseline CI, lint, typecheck, test, and build scripts

What does not exist yet:
- repository cloning/indexing
- pgvector retrieval
- check runs / review status UI
- comment deduping or persistent review history

## Workspace Layout

```text
apps/
  api/        Fastify API foundation
  web/        Next.js dashboard foundation
packages/
  github/     GitHub integration helpers
  indexer/    Indexing pipeline placeholder
  reviewer/   Gemini review generation
  shared/     Shared constants/types
docs/
  Project plan and execution docs
```

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10+
- Redis
- Docker optional for local Redis/PostgreSQL if you do not run them directly

### Install

```bash
pnpm install
```

### Configure

```bash
cp .env.example .env
```

Fill in:

- `GITHUB_APP_ID`
- `GITHUB_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

Keep API keys local only. Do not commit them.

### Start local infrastructure

```bash
pnpm dev:infra
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

If Docker is unavailable, you only need a reachable Redis instance for the current PR review flow.

### Run the apps

Run API:

```bash
pnpm dev:api
```

Run worker:

```bash
pnpm dev:worker
```

Run web app:

```bash
pnpm dev:web
```

## Local PR Review Test

1. Start Redis, the API, and the worker.
2. Start `ngrok` against the API port, for example `ngrok http 3001`.
3. Set the GitHub App webhook URL to `https://<your-ngrok-domain>/webhook`.
4. Confirm `https://<your-ngrok-domain>/health` returns `{"service":"api","status":"ok"}`.
5. Install the GitHub App on the repo you want to test.
6. Push a commit to a branch with an open PR, or open a fresh PR.
7. Watch GitHub App recent deliveries for `pull_request` events.
8. Watch the worker logs for the queued review job.
9. Confirm PullSense posts a `## PullSense review` summary comment in the PR conversation.
10. If high-confidence findings were anchored successfully, confirm GitHub also shows a grouped inline review in the PR review / Files changed UI.

Current visible output:

- one PR summary comment in the GitHub conversation
- optional grouped inline review comments on anchored diff lines
- structured severity plus findings from Gemini

Not in this slice yet:

- review approval/request-changes actions
- RAG or vector retrieval

## Verification

Run the workspace checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Current automated coverage includes:

- webhook parsing and queueing
- GitHub PR file fetch normalization
- GitHub grouped review submission and diff anchoring
- Gemini review package behavior
- worker-level review generation, summary comment posting, and inline review flow

## Environment Variables

Core variables are documented in [.env.example](/Users/nitish/ai-code-review/.env.example).

Important values:

- `API_PORT`
- `REDIS_URL`
- `GITHUB_APP_ID`
- `GITHUB_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_NAME`

## Development Notes

- The repo uses repo-local git identity for this project.
- `superdev/` is intentionally ignored and is not part of the product source tree.
- The current implementation path follows `Option A`, which keeps the core stack centered on `Fastify`, `BullMQ`, `Redis`, `PostgreSQL`, and `pgvector`, while using Superdev selectively for debugging, QA, and audits.

## Project Docs

- [Project Plan](docs/AI_Code_Review_Bot_Project_Plan.md)
- [Step-by-Step Execution Plan](docs/AI_Code_Review_Bot_Step_By_Step_Execution_Plan.md)
- [Superdev Option A Workflow](docs/AI_Code_Review_Bot_Superdev_Option_A_Workflow.md)

## Next Step

The next implementation milestones are:

- improve review quality and prompt shaping
- add comment update/deduping for both summary comments and inline reviews
- add check runs / richer review status UI
- add repository indexing and RAG-backed context
- add persistence and review history
