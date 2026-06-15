# AI Code Review Bot Step-by-Step Execution Plan

This document turns the main project roadmap into a practical build sequence for implementing the GitHub App incrementally.

Related source plan:
- [AI_Code_Review_Bot_Project_Plan.md](/Users/nitish/ai-code-review/docs/AI_Code_Review_Bot_Project_Plan.md)

## Chosen Implementation Mode

This project will proceed with `Option A`.

That means:
- Keep the planned core stack centered on `Fastify`, `BullMQ`, `Redis`, `PostgreSQL`, and `pgvector`
- Use `Next.js` for the dashboard only
- Use Superdev selectively as a delivery aid for debugging, QA, security review, and launch audits
- Do not restructure the app around Superdev's preferred `Nest.js + Next.js` monorepo pattern unless that decision is made later

## Recommended Build Order

1. Foundation setup
2. GitHub App webhook flow
3. Repository indexing
4. Review engine
5. PR comment output
6. Dashboard and billing
7. VS Code extension later

## Why This Order

- It validates the core product risk early: whether repo-aware reviews are actually useful.
- It keeps the MVP backend-first and avoids spending time on UI before review quality is proven.
- It creates clean checkpoints where each phase can be demoed and tested independently.
- It reduces rework by putting infrastructure and repo-processing concerns in place before higher-level features.

## Recommended Adjustment to the Main Roadmap

Add a short `Phase 0` before the current Week 1 work. This phase should establish the project foundation so later phases do not require structural rework.

### Phase 0: Foundations

Build the base monorepo and developer workflow before wiring GitHub events.

Scope:
- Create the Turborepo structure
- Set up `apps/` and `packages/`
- Configure TypeScript, linting, formatting, and shared config
- Add environment variable management and validation
- Set up local PostgreSQL and Redis for development
- Define shared types between API, indexer, and reviewer packages
- Add basic CI checks for install, typecheck, lint, and tests

Output:
- A stable monorepo foundation that later phases can build on without reshuffling folders or config

## Phase-by-Phase Execution Plan

### Phase 1: GitHub App Skeleton

Goal:
- Receive `pull_request` webhooks, verify authenticity, enqueue jobs, fetch PR file changes, and normalize diff data.

Build in this phase:
- GitHub App registration and permission setup
- `/webhook` endpoint
- Signature verification
- Queue worker using BullMQ
- PR file fetch via Octokit
- Logging of normalized PR diff data

Success criteria:
- A real PR event reaches the backend
- The event is validated and queued
- The worker fetches the PR files successfully
- The app logs structured diff data for later review processing

### Phase 2: Repository Indexing

Goal:
- Build the codebase intelligence layer that powers retrieval.

Build in this phase:
- Repository sync strategy on app install
- JS/TS file filtering
- Tree-sitter parsing and chunking
- Embedding generation
- PostgreSQL + pgvector schema
- Initial indexing job
- Incremental re-indexing for changed files

Success criteria:
- A connected repository can be indexed end-to-end
- Chunks and metadata are stored in PostgreSQL
- Semantic search returns relevant code snippets for test queries

### Phase 3: Review Engine

Goal:
- Turn PR diffs plus retrieved code context into structured review output.

Build in this phase:
- Changed-symbol extraction from PR diff
- Similarity retrieval for convention checks
- Caller/import discovery for impact checks
- Sibling-file retrieval for pattern checks
- Prompt assembly
- LLM call and JSON response validation
- Basic test suite for retrieval quality and output shape

Success criteria:
- A sample PR produces structured review data with issues, conventions, and impact notes
- The output is parseable and resilient to malformed model responses
- Retrieval quality is good enough to support useful comments

### Phase 4: Delivery Layer

Goal:
- Turn review output into a usable product experience.

Build in this phase:
- Markdown PR summary comment
- Comment posting to GitHub
- Minimal dashboard
- Repo indexing status view
- Usage counting
- Onboarding flow
- Stripe checkout and simple plan limits

Success criteria:
- A user can install the app on a repo
- Initial indexing can be triggered
- PR reviews appear as a structured summary comment
- Usage and plan status are visible

### Phase 5: VS Code Extension

Goal:
- Reuse the existing indexing and retrieval backend inside a VS Code extension after the GitHub App is validated with real users.

Build in this phase:
- Extension scaffold
- Auth flow tied to existing account/subscription
- API access to retrieval and review features
- Chat sidebar for codebase questions
- Optional stretch features such as inline hints and on-save checks

Success criteria:
- The extension can ask questions against the indexed codebase
- It uses the same backend and subscription model as the GitHub App

## MVP Boundaries

Keep the first release narrow:

- GitHub.com only
- JavaScript / TypeScript only
- One summary comment per PR
- No inline comments
- No autofix PRs
- No multi-repo retrieval

## Key Risks To Account For Early

### 1. Impact Analysis Needs More Than Embeddings

Finding callers and imports will likely require a symbol/reference index or lightweight code graph, not just vector similarity.

### 2. Repo Sync and Storage Need Clear Rules

Cloning or syncing customer repositories requires a cleanup policy, storage strategy, and security boundaries.

### 3. Retrieval Quality Drives Product Quality

Chunking, metadata, and ranking quality will matter as much as the model itself.

### 4. Noise Control Is Critical

False positives and low-signal comments will hurt trust quickly, even if the system catches some real issues.

## Recommended Immediate Next Step

Start with `Phase 0: Foundations`, then move directly into `Phase 1: GitHub App Skeleton`.

That path gives the fastest route to a real end-to-end PR event flow while keeping the project structure stable enough for indexing and billing later.
