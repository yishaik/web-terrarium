# Living Research Documents — implementation roadmap

Status: **planned**  
Parent tracking issue: #2  
Coordination dependency: PR #1 (`feat/continuous-ai-terrarium`)

## Vision

Turn every Web Terrarium Garden into a **versioned living research document**: a durable knowledge artifact that grows as new research arrives, preserves evidence and uncertainty, explains what changed, supports grounded questions, and can later be exported as a portable PDF snapshot or interactive offline artifact.

The core architectural rule is:

> **Garden + immutable research runs remain the source of truth. LivingDocument is a rebuildable, versioned projection.**

This keeps the existing product available even if document generation, AI synthesis, PDF generation, or a future document experiment fails.

---

## Current system baseline

The repository already has the key primitives needed for this work:

- Next.js public research UI on Vercel.
- Public Gardens at `/g/[slug]`.
- Research runs with source lists and summaries.
- Cloudflare Durable Object / Computer-backed Garden persistence.
- Garden `latestRun`, bounded history, watchlists and per-run persisted files.
- PR #1 is adding continuous research, durable memory/reports, AI synthesis, daily regrowth and CI.

### Production baseline captured before roadmap work

On 2026-08-09 the latest Vercel production deployment was `READY`. The latest deployment had no error/fatal runtime logs in the checked window. Four earlier `/middleware` errors with `Publishable key not valid` were observed on an older deployment; that is an existing auth/configuration signal and is **not** part of Living Document feature scope unless it reappears on the current deployment.

---

# Delivery principles

## 1. Availability first

Living Document is additive until late rollout.

- Do not replace `/g/[slug]` during initial phases.
- Add `/g/[slug]/document` as a separate route.
- A broken document compiler must not break a Garden.
- A broken Q&A endpoint must not break document rendering.
- A broken PDF exporter must not break either web experience.
- Continuous-research failure must leave the last valid document intact.

## 2. No destructive data migrations

All storage changes must be backward-compatible.

- Existing `/garden.json` keeps its meaning.
- Existing `/runs/*` remain immutable research evidence.
- PR #1 `/memory.json` and `/reports/*` remain independently useful.
- New document files are additive and versioned.
- Old code must continue to function if new files exist.
- New code must tolerate Gardens that predate LivingDocument.

## 3. Deterministic before generative

The first compiler is deterministic. AI is layered on later as validated semantic patches.

This gives us:

- a fallback during provider outages;
- a stable test oracle;
- a rebuild path if generated state is corrupted;
- a useful document before semantic mutation is ready.

## 4. Semantic patches, not full rewrites

Once AI is introduced, it should produce validated operations such as:

- `add_finding`
- `update_finding`
- `retract_finding`
- `add_evidence`
- `add_contradiction`
- `strengthen_confidence`
- `weaken_confidence`
- `add_open_question`
- `resolve_open_question`
- `update_section_summary`

Every mutation must be attributable to source evidence and a research run.

## 5. Preview before production

Every implementation phase gets its own branch, isolated worktree and PR.

No phase is merged until:

1. application checks pass;
2. Worker checks pass when Worker code changes;
3. Vercel Preview is `READY`;
4. existing-route smoke tests pass;
5. new feature smoke tests pass;
6. runtime/build errors have been reviewed;
7. rollback remains possible.

---

# Git / GitHub working model

## Branches

Use one branch per phase or small vertical slice:

```text
agent/living-doc-phase-0
agent/living-doc-phase-1
agent/living-doc-phase-2
...
```

Do not develop Living Document directly on `main`.

## Worktrees

Use a separate worktree for every active implementation branch so parallel work cannot contaminate another phase:

```bash
git fetch origin
mkdir -p ../web-terrarium-wt

git worktree add ../web-terrarium-wt/phase-1 -b agent/living-doc-phase-1 origin/main
```

For a dependent phase after its prerequisite branch has not merged yet, use an explicitly stacked worktree/branch only when necessary:

```bash
git worktree add ../web-terrarium-wt/phase-2 -b agent/living-doc-phase-2 agent/living-doc-phase-1
```

Prefer waiting for the prerequisite PR to merge over building long PR stacks. If a stacked PR is unavoidable, clearly mark its base/dependency and retarget it to `main` after the prerequisite merges.

## Pull requests

- Default implementation PRs to **draft**.
- Keep PRs phase-sized and reversible.
- Include `Closes #N` only when that PR actually completes the issue.
- Include preview validation and smoke-test results in every PR body.
- Do not enable auto-merge until the feature has stable CI/preview behavior and we explicitly choose to do so.

## Existing PR #1 coordination

PR #1 already changes the AI/memory/continuous-research architecture. Do not duplicate those systems.

For phases that need PR #1 data structures:

1. Prefer starting after #1 merges.
2. If work must start earlier, branch from `feat/continuous-ai-terrarium` and create a clearly stacked draft PR.
3. After #1 merges, rebase/retarget the feature to `main` and rerun Preview validation.

---

# Proposed architecture

```text
Open web
   │
   ▼
Research providers
   │
   ▼
ResearchRun ────────────────┐
   │                        │
   ▼                        │
Garden durable state        │
   │                        │
   ├─ /garden.json          │
   ├─ /runs/*               │
   ├─ /memory.json   (PR #1)│
   └─ /reports/*     (PR #1)│
   │                        │
   ▼                        │
Document compiler ◄─────────┘
   │
   ├─ deterministic projection
   │
   └─ validated semantic patches
   │
   ▼
LivingDocument
   │
   ├─ /document.json
   ├─ /documents/<version>.json or checkpoint strategy
   └─ patch/change history
   │
   ├─────────────┬──────────────┐
   ▼             ▼              ▼
Web document     Q&A         PDF export
/g/.../document  /ask        snapshot
```

---

# Proposed domain model

The exact schema belongs to Phase 1, but the intended shape is:

```ts
type LivingDocument = {
  schemaVersion: number;
  documentVersion: number;
  gardenSlug: string;
  title: string;
  executiveSummary: string;
  sections: DocumentSection[];
  findings: Finding[];
  openQuestions: OpenQuestion[];
  uncertainties: Uncertainty[];
  changes: DocumentChange[];
  sourceRefs: SourceReference[];
  generatedAt: string;
  basedOn: {
    latestRunAt?: string;
    runIds?: string[];
  };
};
```

Findings and questions need stable IDs so later runs can update/retract/resolve them without losing history.

---

# Roadmap and issue dependency graph

| Phase | Issue | Outcome | Production risk |
|---|---:|---|---|
| 0 | #3 | Delivery gates, compatibility and rollback contract | None / docs & checks |
| 1 | #4 | Versioned LivingDocument model + additive storage | Low |
| 2 | #5 | Deterministic document compiler | Low |
| 3 | #6 | Provenance + validated semantic patches | Medium, isolated behind fallback |
| 4 | #7 | Additive `/g/[slug]/document` experience | Low/medium |
| 5 | #8 | Grounded Ask-this-document Q&A | Medium, isolated endpoint |
| 6 | #9 | Continuous regrowth + meaningful-change detection | Medium |
| 7 | #10 | Static versioned PDF export | Low, isolated export path |
| 8 | #11 | Interactive/offline PDF proof of concept | Experimental; not production-critical |
| 9 | #12 | Security, observability, performance and rollout hardening | Risk reduction |

Suggested dependency flow:

```text
#3
 ↓
#4
 ↓
#5 ───────────────► #7 ─► #8 ─► #10 ─► #11
 ↓                    │
#6 ───────► #9        │
  └───────────────────┘

#12 hardens the production-ready subset before broad rollout.
```

---

# Phase details

## Phase 0 — delivery safety and compatibility — #3

Goal: define the operational contract before feature code lands.

Deliverables:

- branch/worktree/PR convention;
- schema compatibility rules;
- Vercel Preview validation gate;
- app + Worker CI expectations;
- existing-route smoke checklist;
- rollback/disable strategy.

Exit criterion: later phases can be merged independently without requiring downtime.

## Phase 1 — domain model and storage — #4

Goal: create a versioned, rebuildable document representation.

Likely storage:

```text
/document.json
/documents/<checkpoint-or-version>.json
```

Storage retention must be bounded; we should not store a complete duplicated document forever after every trivial change.

Exit criterion: a Garden may have no document, one document or several versions without affecting legacy reads.

## Phase 2 — deterministic compiler — #5

Goal: produce a usable LivingDocument from persisted research without an LLM.

Initial sections:

- Executive summary
- Current findings
- Open questions
- Uncertainty / contradictions
- Sources
- Timeline / growth metadata

Exit criterion: same persisted source state produces semantically stable output and works during AI-provider outage.

## Phase 3 — semantic evolution — #6

Goal: evolve documents via validated semantic operations rather than complete rewrites.

Important invariant:

> The last valid document is never overwritten until the proposed next version passes schema, provenance and citation validation.

Exit criterion: claims can be added, updated, contradicted and retracted with auditable provenance.

## Phase 4 — Living Document UI — #7

Goal: expose the document without replacing current Gardens.

New route:

```text
/g/[slug]/document
```

Key UX:

- freshness and version;
- current knowledge;
- uncertainty;
- open questions;
- evidence/source navigation;
- timeline;
- **What changed since last visit?**

The browser can store the last viewed version locally and show changes from that version to the current one.

Exit criterion: public users can consume a useful document while `/g/[slug]` remains unchanged.

## Phase 5 — Ask this document — #8

Goal: query the evolving knowledge state.

```text
question
  ↓
retrieve relevant findings / versions / source evidence
  ↓
AI synthesis
  ↓
answer + citations + document version
```

Q&A must fail independently. Rendering the document may never depend on a successful model call.

Exit criterion: answers cite known evidence and explicitly signal insufficient support instead of inventing it.

## Phase 6 — autonomous regrowth — #9

Goal: integrate with PR #1 continuous research/watchlist flow.

A new research run should not automatically equal a new document version. First classify whether it contains meaningful change:

- new evidence;
- corroboration;
- contradiction;
- changed source content;
- question resolved/opened;
- confidence shift;
- duplicate/no-op.

Exit criterion: document history reflects knowledge changes rather than crawler activity noise.

## Phase 7 — static PDF snapshot — #10

Goal: export an immutable representation of a specific document version.

Every PDF must include:

- Garden/document identity;
- version;
- generated timestamp;
- source freshness;
- citations and source links;
- canonical live URL.

Exit criterion: PDF export is reproducible and completely isolated from critical web routes.

## Phase 8 — interactive/offline PDF — #11

Goal: test the `llm.pdf`-inspired idea only after the useful product exists.

Experiments:

- embedded document state;
- compact local index;
- PDF JavaScript interaction;
- local search / retrieval;
- optional tiny embedded model;
- online version check when supported;
- offline fallback to embedded snapshot.

No arbitrary filesystem access and no embedded credentials.

Exit criterion: documented viewer compatibility, file-size/latency measurements and a go/no-go decision.

## Phase 9 — hardening / rollout — #12

Goal: make the feature safe to expose more broadly.

Focus:

- private Garden authorization;
- untrusted source content / prompt injection;
- secret leakage prevention;
- Q&A/export abuse controls;
- structured observability;
- document build latency and payload budgets;
- bounded checkpoint retention;
- tested disable/rollback procedure.

Exit criterion: we can make Living Document more prominent without making production recovery harder.

---

# Testing and release gates

## Existing-product smoke tests

Every code PR should verify as applicable:

- `/` loads;
- a known public `/g/[slug]` loads;
- `/s/[id]` behavior remains unchanged;
- research submission/fallback behavior still works;
- Worker `/health` is healthy when Worker changes are involved;
- private/public Garden visibility behavior is unchanged unless intentionally modified.

## New feature tests

Add cumulatively by phase:

- legacy Garden without document;
- empty Garden;
- one-run document;
- multi-run document;
- rebuild from source state;
- invalid AI patch;
- citation mismatch;
- source contradiction;
- provider unavailable;
- document version diff;
- Q&A with insufficient evidence;
- PDF generation failure.

## Vercel rollout

Normal flow:

```text
worktree
  ↓
feature branch
  ↓
draft PR
  ↓
CI
  ↓
Vercel Preview
  ↓
smoke tests
  ↓
ready for review
  ↓
merge to main
  ↓
production deployment
  ↓
post-deploy smoke + runtime error check
```

Do not manually deploy a feature branch to production to bypass this path.

---

# Rollback strategy

The architecture is intentionally reversible:

1. Existing Garden/Run data remains authoritative.
2. Document state is a projection and can be deleted/rebuilt if necessary.
3. UI entry points can be hidden/disabled without touching research storage.
4. Q&A and PDF endpoints are independent.
5. A bad document compiler release can be rolled back while persisted runs remain readable.
6. New storage formats carry explicit schema versions.

---

# Definition of done for the initiative

The initiative is complete when:

- every Garden can have a current versioned LivingDocument;
- the document can be rebuilt from persisted research evidence;
- every material claim/change can be traced to evidence;
- users can see what changed between versions;
- users can ask grounded questions with citations;
- watchlist/continuous research can update the document without noisy version churn;
- a static PDF snapshot can be exported from a known version;
- interactive PDF feasibility has a measured go/no-go result;
- existing Web Terrarium routes remain available throughout rollout;
- rollback does not require a destructive data migration.
