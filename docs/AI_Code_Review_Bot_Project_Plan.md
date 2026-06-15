# Context-Aware AI Code Review Bot
### RAG-Powered GitHub PR Review using Codebase Intelligence
**Project Plan & Roadmap — Version 1.0 | June 2026**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Phased Plan](#3-phased-plan)
   - [Phase 1 — GitHub App Skeleton](#phase-1--github-app-skeleton-week-1)
   - [Phase 2 — Indexing Pipeline](#phase-2--indexing-pipeline-week-2)
   - [Phase 3 — Review Engine (RAG + Claude)](#phase-3--review-engine-rag--claude-week-3)
   - [Phase 4 — GitHub Comment, Dashboard & Billing](#phase-4--github-comment-dashboard--billing-week-4)
   - [Phase 5 — VS Code Extension (Post-MVP)](#phase-5--vs-code-extension-post-mvp)
4. [Core Claude Prompt Structure](#4-core-claude-prompt-structure)
5. [Scope Boundaries](#5-scope-boundaries)
6. [Launch Checklist](#6-launch-checklist)

---

## 1. Project Overview

### 1.1 Idea Summary

A GitHub App that reviews pull requests using AI — but unlike diff-only review bots, it indexes the entire codebase into a vector database. This allows the AI reviewer to understand a project's existing patterns, conventions, and dependencies, not just the changed lines.

### 1.2 The Core Problem

AI coding agents and developers now write code that is functionally correct but often inconsistent with how the rest of the codebase is built — duplicated logic, broken conventions, and unexpected breaking changes (sometimes called "Shadow Tech Debt"). Existing review bots (CodeRabbit, Greptile) mostly look only at the diff and miss this entirely.

### 1.3 What the Product Does

- Reviews PRs for bugs, security issues, and style problems (standard AI review)
- Flags **convention drift** — "You already have a similar function in `utils/money.ts`"
- Flags **impact / blast radius** — "This function is called from 3 other files; your signature change breaks them"
- Posts a single, structured summary comment on each PR

### 1.4 Target Users & Positioning

| Aspect | Details |
|---|---|
| Target users | Solo developers and small teams using JavaScript / TypeScript |
| Positioning | "Context-aware code review — your AI reviewer actually knows your codebase" |
| Differentiator | RAG over the whole repo, not just the diff — catches duplication, drift, and breakage |
| Monetization | Per-seat subscription via Stripe / GitHub Marketplace ($10–$20/seat/month) |

### 1.5 High-Level Architecture

```
GitHub (PR webhook)
   → Webhook API (Fastify)
   → Queue (BullMQ + Redis)
   → Fetch PR diff (Octokit)
   → RAG Retrieval (PostgreSQL + pgvector) — similar code, callers, sibling files
   → Claude Sonnet 4.6 (review + convention + impact analysis)
   → Post structured comment back to PR

Indexing pipeline (separate, ongoing):
   Repo files → tree-sitter chunking → Voyage embeddings → PostgreSQL (pgvector)
```

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Backend** | Node.js + TypeScript (Fastify) | Matches target codebases (JS/TS); fast to build; great GitHub SDK support |
| **Queue** | BullMQ + Redis | Async processing avoids GitHub's 10-second webhook timeout |
| **Database** | PostgreSQL | Stores installs, repo configs, usage and billing data |
| **Vector DB** | PostgreSQL + pgvector | Same instance as app DB — no extra service; sufficient at MVP scale; SQL-based metadata filtering |
| **AST Parsing** | tree-sitter (tree-sitter-typescript) | Function/class-level chunking, industry standard |
| **Embeddings** | Voyage AI (voyage-code-3) | Code-optimized embeddings, better retrieval than general models |
| **LLM** | Claude Sonnet 4.6 | Review reasoning, convention comparison, impact analysis |
| **GitHub Integration** | Octokit | Official SDK — webhooks, diffs, posting PR comments |
| **Hosting** | Railway or Fly.io | Cheap, simple deploys for early stage |
| **Billing** | Stripe + GitHub Marketplace | Stripe for direct billing, Marketplace for discovery |
| **Monorepo tooling** | Turborepo | Shared types between API, indexer, and dashboard |

### 2.1 Repository Structure

```
/apps
  /web          → Next.js dashboard + landing page
  /api          → Fastify backend (webhooks, queue workers)
/packages
  /indexer      → tree-sitter chunking + embedding logic
  /reviewer     → Claude prompt + retrieval logic
  /github       → Octokit wrappers (diff fetch, comment post)
```

### 2.2 Cost Estimates

| Item | Approx. Cost |
|---|---|
| Embeddings per PR (~5 chunks, Voyage) | ~$0.0001 |
| pgvector query per PR | Negligible — included in existing Postgres instance |
| Claude call per PR (~3–5K in, ~1K out) | ~$0.02–$0.05 |
| Total per ~100 PRs/month per team | ~$2–$5/month |
| One-time indexing (medium repo, ~2,000 functions) | ~$0.04 |

---

## 3. Phased Plan

---

### Phase 1 — GitHub App Skeleton *(Week 1)*

**Goal:** The app receives PR events from GitHub and can read the diff.

#### Tasks

- [ ] Register a new GitHub App in Developer Settings
- [ ] Configure permissions: Pull requests (Read & Write), Contents (Read), Checks (Write)
- [ ] Subscribe to webhook events: `pull_request` (opened, synchronize)
- [ ] Generate and securely store App ID + private key
- [ ] Set up Fastify project with a `/webhook` endpoint
- [ ] Verify GitHub webhook signatures on incoming requests
- [ ] Set up Redis + BullMQ; enqueue a job for each valid webhook event
- [ ] Build a worker that fetches the PR diff via `GET /repos/{owner}/{repo}/pulls/{pr}/files`
- [ ] Log the fetched diff to confirm end-to-end flow works

#### Output
A deployed app that receives PR events and logs the diff for that PR.

---

### Phase 2 — Indexing Pipeline *(Week 2)*

**Goal:** Build the vector database that powers retrieval.

#### Tasks

- [ ] On app install, clone the target repository
- [ ] Walk the file tree and filter to JS/TS files only
- [ ] Set up tree-sitter with the TypeScript grammar
- [ ] Write chunking rules to split files by function / class / method
- [ ] Generate embeddings for each chunk using Voyage AI (voyage-code-3)
- [ ] Enable the pgvector extension on the PostgreSQL database
- [ ] Create a vector column + table for code chunks with metadata: `file_path`, `function_name`, `last_modified`, `repo_id`
- [ ] Insert chunks with embeddings into PostgreSQL and create a vector index (HNSW)
- [ ] Build an incremental re-index job that runs on merge to main (changed files only)
- [ ] Add basic logging / progress tracking for indexing jobs

#### Output
A repository's codebase is fully indexed and searchable by semantic similarity in PostgreSQL (pgvector).

---

### Phase 3 — Review Engine (RAG + Claude) *(Week 3)*

**Goal:** Combine retrieval and generation to produce a structured review.

#### Tasks

- [ ] For each changed function in the PR diff, generate an embedding of the new code
- [ ] Run Retrieval Query 1: semantic similarity search (convention check)
- [ ] Run Retrieval Query 2: find files that import/call the changed function (impact analysis)
- [ ] Run Retrieval Query 3: retrieve sibling files in the same directory/layer (pattern check)
- [ ] Design the Claude system prompt (senior engineer reviewing with repo context)
- [ ] Build the combined prompt: diff + retrieved chunks + instructions
- [ ] Call Claude Sonnet 4.6 and request structured JSON output (issues, conventions, impact)
- [ ] Parse and validate the JSON response (handle malformed output gracefully)
- [ ] Write unit tests with sample diffs to sanity-check retrieval relevance

#### Output
Given a PR diff, the system returns structured review data: issues, convention notes, and impact analysis.

---

### Phase 4 — GitHub Comment, Dashboard & Billing *(Week 4)*

**Goal:** Deliver a usable product that early users can install and pay for.

#### Tasks

- [ ] Format the structured JSON review into a Markdown PR comment
- [ ] Post the comment to the PR via Octokit
- [ ] Build a minimal Next.js dashboard: list connected repos and indexing status
- [ ] Add a simple usage counter (PRs reviewed this month) per repo/org
- [ ] Build the onboarding flow: install app → select repos → trigger initial index
- [ ] Integrate Stripe Checkout for paid plans
- [ ] Add basic plan limits (e.g., free tier = 1 repo, X PRs/month)
- [ ] Write a short landing page explaining the positioning and how it works
- [ ] Deploy to production (Railway/Fly.io) and run on your own repo (dogfooding)

#### Output
A working, deployable product: install on a real repo, get context-aware PR reviews, and pay via Stripe.

---

### Phase 5 — VS Code Extension *(Post-MVP)*

**Goal:** Reuse the existing RAG/indexing pipeline as a new frontend inside VS Code, adding a discovery channel via the VS Code Marketplace. This phase begins only after the GitHub App (Phases 1–4) has real users and the retrieval pipeline is validated.

#### Tasks

- [ ] Scaffold a VS Code extension project (TypeScript)
- [ ] Add authentication: link the extension to the user's existing account/subscription
- [ ] Expose existing retrieval logic via an API endpoint the extension can call
- [ ] Build a chat sidebar panel: ask questions about the indexed codebase ("where is auth handled?")
- [ ] Wire the sidebar to `/packages/reviewer` retrieval + Claude, reusing the same RAG pipeline
- [ ] *(Stretch)* Add inline hints: "similar function exists in `utils/money.ts`" while writing code
- [ ] *(Stretch)* Add on-save convention check for the currently edited file
- [ ] Publish to the VS Code Marketplace

#### Output
A VS Code extension offering chat-with-your-codebase (MVP feature) and, as stretch goals, inline convention hints — using the same backend, RAG index, and subscription as the GitHub App.

#### Monetization Notes
- **Free tier:** basic chat/search over the indexed codebase
- **Paid tier:** full convention and impact analysis, shared with the existing GitHub App subscription
- No separate indexing pipeline — the extension is a new client for the existing API

---

## 4. Core Claude Prompt Structure

This is the central prompt used in Phase 3. It combines the PR diff with retrieved context from the vector database and asks Claude to return structured JSON.

```
System:
You are a senior engineer reviewing a pull request for a
specific codebase. You have access to relevant existing code from
this repo for context.

User:
## New/changed code:
{diff}

## Similar existing code in this repo (for convention comparison):
{retrieved_similar_chunks}

## Code that depends on the changed functions (impact analysis):
{retrieved_callers}

Respond ONLY in this JSON format:
{
  "issues": [
    { "file": "", "line": 0, "severity": "high|medium|low", "description": "" }
  ],
  "conventions": [
    { "description": "", "existing_reference": "" }
  ],
  "impact": [
    { "affected_file": "", "description": "" }
  ]
}
```

---

## 5. Scope Boundaries

### 5.1 In Scope for v1

- GitHub App (GitHub.com only)
- JavaScript / TypeScript repositories
- Single Claude call per PR producing issues, conventions, and impact
- One summary comment per PR (no inline comments)
- Stripe-based subscription billing

### 5.2 Explicitly Out of Scope for v1

- Inline PR comments (line-by-line)
- Additional languages (Python, Go, etc.)
- Multi-repo / cross-repo retrieval
- Automated fix PRs
- GitLab or other Git providers (planned as a future abstraction layer)

### 5.3 Future Roadmap (Post-Phase 5)

1. Add inline PR comments for specific lines
2. Expand language support to Python and Go (tree-sitter grammars)
3. Add multi-repo indexing for cross-service impact analysis
4. Introduce a "propose fix" agentic mode that opens follow-up PRs
5. Build a GitLab provider using the same abstraction layer

---

## 6. Launch Checklist

1. Run the tool on your own repository first (dogfooding) to validate review quality
2. Recruit 5–10 beta users from indie hacker / developer communities, offered free access
3. Collect feedback on review accuracy, noise level, and false positives
4. Iterate on prompt quality and retrieval relevance based on real PRs
5. List the app on GitHub Marketplace once stable
6. Prioritize next features based on feedback: inline comments vs. Python support vs. multi-repo

### 6.1 Success Signals to Watch

| Signal | What it indicates |
|---|---|
| Users leave the app installed after 30 days | Reviews are useful, not just novel |
| Low rate of "not helpful" reactions on comments | Convention/impact detection is accurate |
| Conversion from free to paid tier | Willingness to pay validated |
| Requests for additional languages | Signal for v2 prioritization |

---

*Context-Aware AI Code Review Bot — Project Plan v1.0*
