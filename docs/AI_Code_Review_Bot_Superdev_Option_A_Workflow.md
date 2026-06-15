# AI Code Review Bot Superdev Workflow

This document explains how to use Superdev with `Option A` for this project.

`Option A` means:
- Keep the product's planned stack
- Build the core GitHub App and indexing pipeline with the project's own architecture
- Use Superdev selectively where it adds the most value

Related docs:
- [AI_Code_Review_Bot_Project_Plan.md](/Users/nitish/ai-code-review/docs/AI_Code_Review_Bot_Project_Plan.md)
- [AI_Code_Review_Bot_Step_By_Step_Execution_Plan.md](/Users/nitish/ai-code-review/docs/AI_Code_Review_Bot_Step_By_Step_Execution_Plan.md)

## Option A Summary

Keep these architectural choices as the source of truth:

- `Fastify` for the webhook/API backend
- `BullMQ + Redis` for asynchronous job processing
- `PostgreSQL + pgvector` for app data and code retrieval
- `Next.js` for the dashboard and onboarding UI
- `Octokit` for GitHub integration

Use Superdev as:
- a debugging workflow
- a security review workflow
- a QA workflow
- a product-completeness workflow
- a final pre-launch audit workflow

Do not use Superdev as:
- the primary architecture owner for this project
- a reason to rewrite the backend into `Nest.js`
- a reason to force the full `prd-design-build-orchestrator` flow on this repo

## Where Superdev Fits Best

### 1. During Build: Debugging and Recovery

Use Superdev when implementation gets stuck or behavior is unclear.

Best skill:
- `$systematic-debugging`

Use it for:
- failing webhook signature verification
- GitHub App authentication issues
- queue jobs not processing
- PR file fetch failures
- indexing failures
- retrieval quality regressions
- malformed LLM output handling

Prompt examples:

```text
Use $systematic-debugging to find why my GitHub webhook signature verification is failing in the Fastify webhook handler.
```

```text
Use $systematic-debugging to investigate why BullMQ jobs are not processing after GitHub pull_request events are received.
```

```text
Use $systematic-debugging to find why pgvector retrieval is returning low-relevance code chunks for changed functions.
```

### 2. Before Beta: Security Review

Use Superdev once the MVP flow works end-to-end.

Best skill:
- `$security-review-and-fix`

Focus the audit on:
- webhook signature validation
- GitHub App private key handling
- installation token handling
- repo cloning and local repo storage
- tenant isolation between repos/orgs
- prompt injection risk from repository content
- secret exposure in logs
- dashboard auth and billing routes

Prompt example:

```text
Use $security-review-and-fix to audit this GitHub App before beta launch.
Focus on webhook auth, GitHub token handling, repo sync/storage, tenant isolation, prompt injection risk, and secret leakage.
```

### 3. Before Early Users: End-to-End QA

Use Superdev after the main user flows are working.

Best skill:
- `$exploratory-qa`

Target flows:
- install GitHub App
- receive PR webhook
- enqueue review job
- fetch PR diff
- run retrieval and review
- post PR summary comment
- trigger or inspect indexing status
- basic dashboard flow

Prompt example:

```text
Use $exploratory-qa to test the end-to-end MVP flows for this GitHub App:
install flow, webhook intake, queue processing, indexing, review generation, PR comment posting, and dashboard status views.
```

### 4. After MVP Works: Completeness Audit

Use Superdev to distinguish "demo works" from "product is complete enough."

Best skill:
- `$product-completeness-audit`

This is especially useful for checking:
- repo onboarding gaps
- retry/error recovery gaps
- missing progress states for indexing
- weak review failure messaging
- billing and plan-limit edge cases
- missing operational/admin visibility

Prompt example:

```text
Use $product-completeness-audit on this AI code review bot MVP.
Check whether install flow, indexing, review generation, comment posting, usage tracking, and billing are complete as a product, not just working as a demo.
```

### 5. Before Production Launch: Final Audit

Run a final whole-product pass only when the system is close to launch.

Best skill:
- `$brutal-exhaustive-audit`

Use it for:
- final route and flow validation
- operational gaps
- edge-case review
- end-to-end release confidence

Prompt example:

```text
Use $brutal-exhaustive-audit on this repository before production launch.
Validate the GitHub App flow, indexing pipeline, review engine, dashboard, billing, and launch readiness.
```

## Recommended Superdev Usage By Phase

### Phase 0: Foundations

Use Superdev lightly.

Recommended use:
- none by default
- `$systematic-debugging` only if setup goes wrong

Avoid:
- orchestration-heavy Superdev workflows

### Phase 1: GitHub App Skeleton

Use Superdev only for implementation blockers.

Recommended use:
- `$systematic-debugging`

Example focus:
- signature verification
- GitHub App auth
- webhook payload handling
- queue integration

### Phase 2: Indexing Pipeline

Use Superdev mainly for failure analysis.

Recommended use:
- `$systematic-debugging`

Example focus:
- tree-sitter chunking bugs
- file filtering mistakes
- embedding pipeline issues
- pgvector query quality issues

### Phase 3: Review Engine

Use Superdev when review quality or reliability drops.

Recommended use:
- `$systematic-debugging`

Example focus:
- bad changed-function extraction
- weak retrieval
- invalid JSON output
- noisy or low-signal reviews

### Phase 4: GitHub Comment, Dashboard, Billing

Use Superdev more heavily here.

Recommended use:
- `$systematic-debugging`
- `$exploratory-qa`
- `$security-review-and-fix`
- `$product-completeness-audit`

### Phase 5: Post-MVP Hardening

Use Superdev for launch confidence.

Recommended use:
- `$security-review-and-fix`
- `$product-completeness-audit`
- `$brutal-exhaustive-audit`

## What Not To Use In This Project

These Superdev skills are not the default fit for the current architecture:

- `$prd-design-build-orchestrator`
- `$nestjs-enterprise-backend`
- `$prototype-to-saas`

Reason:
- they are optimized for a more opinionated `Next.js + Nest.js` full-stack build flow
- this project already has a chosen architecture and execution plan

They should only be reconsidered if the project is intentionally re-scoped around a Nest.js monorepo.

## Suggested Working Rhythm

Use this loop during implementation:

1. Build the next project phase directly from the project plan.
2. If blocked, invoke `$systematic-debugging`.
3. Once the phase works end-to-end, verify manually and with tests.
4. After MVP is assembled, run `$exploratory-qa`.
5. Before beta, run `$security-review-and-fix`.
6. Before launch, run `$product-completeness-audit`.
7. Just before production release, run `$brutal-exhaustive-audit`.

## Recommended Next Step

Proceed with:
- `Phase 0: Foundations`

Use Superdev only as support during this phase, not as the main implementation driver.
