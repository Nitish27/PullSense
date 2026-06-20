# PullSense

Context-aware AI code review bot for GitHub pull requests.

This project is being built as a GitHub App that reviews PRs with repository-aware context instead of diff-only analysis. The long-term goal is to combine:

- GitHub webhook ingestion
- asynchronous review jobs
- repository indexing with semantic retrieval
- structured AI review output
- a lightweight dashboard for onboarding, status, and billing

## Current Status

The repository is currently at `Phase 0: Foundations`.

What exists today:
- `pnpm` + `turbo` monorepo workspace
- `Fastify` API scaffold in `apps/api`
- `Next.js` web scaffold in `apps/web`
- shared internal packages for `github`, `indexer`, `reviewer`, and `shared`
- local Docker services for PostgreSQL and Redis
- baseline CI, lint, typecheck, test, and build scripts

What does not exist yet:
- GitHub App webhook processing
- repository cloning/indexing
- pgvector retrieval
- PR review generation
- PR comment posting

## Workspace Layout

```text
apps/
  api/        Fastify API foundation
  web/        Next.js dashboard foundation
packages/
  github/     GitHub integration package placeholder
  indexer/    Indexing pipeline placeholder
  reviewer/   Review engine placeholder
  shared/     Shared constants/types
docs/
  Project plan and execution docs
```

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker

### Install

```bash
pnpm install
```

### Configure

```bash
cp .env.example .env
```

### Start local infrastructure

```bash
pnpm dev:infra
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

### Run the apps

Run API:

```bash
pnpm dev:api
```

Run web app:

```bash
pnpm dev:web
```

Or run the workspace in parallel:

```bash
pnpm dev
```

## Verification

Run the baseline checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Current test coverage is intentionally minimal:
- API health route test exists
- other packages use placeholder test commands until their real behavior is implemented

## Environment Variables

Core variables are documented in [.env.example](/Users/nitish/ai-code-review/.env.example).

Important values:

- `API_PORT`
- `WEB_PORT`
- `DATABASE_URL`
- `REDIS_URL`
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

The next implementation milestone is `Phase 1: GitHub App Skeleton`:

- register the GitHub App
- add webhook verification
- enqueue PR events
- fetch changed PR files
- validate end-to-end event flow
