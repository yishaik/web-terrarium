# Living Research Documents — implementation roadmap

Status: **planned / architecture v2**  
Parent tracking issue: #2  
Coordination dependency: PR #1 (`feat/continuous-ai-terrarium`)

## Vision

Turn every Web Terrarium Garden into a **versioned living research document** that can be consumed in several forms: web UI, grounded Q&A, normal PDF, and a self-contained **Intelligent PDF** with embedded retrieval plus an optional local LLM.

The key architectural rule remains:

> **Garden + immutable research/evidence remain the source of truth. `LivingDocument` is a rebuildable, versioned projection. Artifacts are frozen projections of a known LivingDocument version.**

The important v2 change is that PDF is no longer treated as a late side experiment. The artifact contract is designed from the LivingDocument layer onward so the same knowledge state can be exported consistently to HTML/Markdown/PDF and, later, to an offline PDF containing its own local inference runtime and model.

---

# Product model

Web Terrarium has three distinct layers:

```text
RESEARCH / KNOWLEDGE PLANE
Garden + runs + evidence + memory
             |
             v
DOCUMENT PLANE
LivingDocument vN
             |
      +------+------+----------------+
      |             |                |
      v             v                v
Web document      Q&A API      Artifact compiler
                                    |
                    +---------------+----------------+
                    |                                |
                    v                                v
               Normal PDF                   Intelligent PDF
                                               |
                                +--------------+--------------+
                                |              |              |
                           document data   search index   local LLM
```

This separation is deliberate:

- Web Terrarium performs continuous research and grows knowledge.
- `LivingDocument` expresses the current structured state of that knowledge.
- Artifact compiler freezes one exact document version into portable output.
- Intelligent PDF packages **knowledge + retrieval + runtime + model**, so local Q&A does not require the live Web Terrarium service.

The embedded LLM does **not** need to memorize or be fine-tuned on the Garden. It receives retrieved evidence from the embedded snapshot at question time.

---

# Intelligent PDF target architecture

A generated Smart/Intelligent PDF should conceptually contain:

```text
research-topic-v37.pdf
|
+-- PDF pages / document UI
+-- artifact-manifest.json
+-- living-document.json       frozen v37 snapshot
+-- retrieval-index            compact local index
+-- selected source excerpts   bounded supporting evidence
+-- assistant prompt/policy
+-- llama.cpp-derived runtime   compiled for PDF JS environment
+-- model.gguf                  compact quantized local model
```

Expected local question flow:

```text
Question
  |
  v
embedded local retrieval
  |
  v
relevant findings + source excerpts
  |
  v
small embedded LLM
  |
  v
answer grounded in snapshot + local citations
```

The PDF must remain useful if the LLM cannot start: deterministic search/retrieval is the fallback.

---

# Artifact classes

We will support three artifact levels instead of one ambiguous “PDF export”.

## 1. Normal PDF

Small, static, reproducible snapshot of one LivingDocument version.

- no executable model;
- readable in normal PDF readers;
- contains version, freshness and citations;
- canonical link back to the live Garden.

## 2. Intelligent Offline PDF

Self-contained snapshot with local interaction.

- embedded LivingDocument snapshot;
- compact retrieval index;
- local search / Ask-this-document UI;
- embedded runtime;
- optional GGUF model selected from an approved model profile;
- no API key or network required for offline Q&A;
- viewer compatibility explicitly declared.

## 3. Connected Living PDF

An Intelligent PDF that also contains a non-secret manifest identifying its live source:

```json
{
  "artifactSchemaVersion": 1,
  "gardenSlug": "browser-agents",
  "documentVersion": 37,
  "canonicalUrl": "https://.../g/browser-agents/document"
}
```

When its supported viewer/environment allows a safe version check, it may report:

```text
Embedded snapshot: v37
Live Garden:       v43
6 newer document versions are available.
```

Offline behavior always falls back to the embedded snapshot. A Connected PDF must never require live access to remain readable/useful.

---

# Artifact manifest contract

Artifact-awareness begins in the core model, even before Intelligent PDF implementation.

Proposed artifact metadata:

```ts
type ArtifactManifest = {
  artifactSchemaVersion: number;
  artifactType: "pdf" | "intelligent-pdf";
  gardenSlug: string;
  documentVersion: number;
  generatedAt: string;
  canonicalUrl?: string;
  sourceFreshness?: string;
  retrievalProfile?: {
    algorithm: string;
    chunkCount: number;
    excerptCount: number;
  };
  localInference?: {
    enabled: boolean;
    runtime?: string;
    modelId?: string;
    modelFormat?: "gguf";
    quantization?: string;
  };
};
```

The artifact compiler accepts a **specific persisted LivingDocument version**. It may never silently export “whatever is latest now” after artifact generation has started.

---

# Current system baseline

The repository already has the important primitives needed for this work:

- Next.js public research UI on Vercel.
- public Gardens at `/g/[slug]`;
- persisted research runs and source lists;
- Cloudflare Computer/Durable Object Garden persistence;
- Garden history/watchlist primitives;
- continuous-research work in PR #1;
- roadmap work under Epic #2.

The existing Garden experience remains production-critical. All LivingDocument and artifact paths are additive until separately approved for broader rollout.

---

# Delivery principles

## Availability first

- Do not replace `/g/[slug]` in early phases.
- Add `/g/[slug]/document` independently.
- A document compiler failure must not break a Garden.
- Q&A failure must not break document rendering.
- Artifact/PDF generation failure must not break either web route.
- Intelligent-PDF tooling must never enter the critical Garden request path.
- Last valid LivingDocument remains available when research or semantic updates fail.

## No destructive migration

- `/garden.json`, `/runs/*`, evidence and source state keep their meaning.
- LivingDocument storage is additive/versioned.
- artifact output is disposable/rebuildable from persisted document versions.
- no PDF becomes a source of truth for the Garden.

## Deterministic before generative

The deterministic document compiler and local retrieval path exist before semantic mutation or embedded LLM inference. This provides test oracles and fallback behavior.

## Semantic patches, not full rewrites

AI evolution operates through validated changes such as add/update/retract finding, evidence, contradiction, confidence and open-question changes. The last valid version is only replaced after validation.

## Artifact isolation

Heavy PDF/runtime/model work stays behind explicit export actions or artifact jobs. It is never required to serve `/`, `/g/[slug]`, `/g/[slug]/document` or regular research APIs.

## Preview before production

Every code phase uses a dedicated branch/worktree/PR. CI, Worker checks where relevant, Vercel Preview and smoke tests are required before merge.

---

# Git / GitHub working model

Use one branch/worktree per implementation phase:

```text
agent/living-doc-phase-0
agent/living-doc-phase-1
...
agent/living-doc-artifact-compiler
agent/living-doc-intelligent-pdf
agent/living-doc-model-packaging
agent/living-doc-connected-pdf
```

Example:

```bash
git fetch origin
mkdir -p ../web-terrarium-wt
git worktree add ../web-terrarium-wt/artifact-compiler \
  -b agent/living-doc-artifact-compiler origin/main
```

Implementation PRs default to draft. Stacked PRs are allowed only when a dependency genuinely has not merged; they must state their base and be retargeted after the prerequisite merges.

---

# Core LivingDocument architecture

```text
Research providers
      |
      v
ResearchRun / evidence
      |
      v
Garden durable state
      |
      +-- /garden.json
      +-- /runs/*
      +-- /memory.json
      +-- /reports/*
      |
      v
Document compiler
      |
      +-- deterministic projection
      +-- validated semantic patches
      |
      v
LivingDocument
      |
      +-- /document.json
      +-- /documents/<version>.json or checkpoints
      +-- patch/change history
      |
      +------------+-------------+--------------------+
      |            |             |                    |
      v            v             v                    v
Web document      Q&A      Artifact compiler     diff/timeline
                                   |
                      +------------+------------+
                      |                         |
                      v                         v
                 Normal PDF              Intelligent PDF
```

---

# Proposed LivingDocument model

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
  artifactHints?: {
    preferredCitationStyle?: string;
    exportableSectionIds?: string[];
    sensitiveSectionIds?: string[];
  };
};
```

`artifactHints` are advisory only. Artifact generation still performs its own authorization/redaction and never blindly embeds sensitive/private data.

---

# Roadmap and dependency graph

| Phase | Issue | Outcome | Production risk |
|---|---:|---|---|
| 0 | #3 | Delivery gates, compatibility and rollback contract | None / docs & checks |
| 1 | #4 | Versioned LivingDocument + artifact-aware contract | Low |
| 2 | #5 | Deterministic LivingDocument compiler | Low |
| 3 | #6 | Provenance + validated semantic patches | Medium, fallback isolated |
| 4 | #7 | `/g/[slug]/document`, timeline and What Changed | Low/medium |
| 5 | #8 | Grounded Ask-this-document Q&A | Medium, isolated endpoint |
| 6 | #9 | Continuous regrowth + meaningful-change detection | Medium |
| 7 | #10 | General artifact compiler + reproducible normal PDF | Low, explicit export path |
| 8 | #11 | Intelligent PDF runtime + embedded retrieval | Experimental/isolated |
| 9 | #36 | Embedded GGUF model packaging + local inference benchmarks | Experimental/isolated |
| 10 | #37 | Connected Living PDF version-awareness | Experimental/isolated |
| 11 | #12 | Security, observability, performance and rollout hardening | Risk reduction |

Suggested critical flow:

```text
#3 -> #4 -> #5 -> #7 -> #8
             |
             +-> #10 -> #11 -> #36 -> #37
             |
#6 -> #9 ----+

#12 hardens whichever subset is approved for production exposure.
```

The important change from architecture v1 is:

> **`#10 -> #11 -> #36 -> #37` is a real product/artifact pipeline, not one optional llm.pdf experiment.**

---

# Phase details

## Phase 0 — delivery safety and compatibility — #3

Define branch/worktree/PR conventions, backwards-compatible schemas, Vercel Preview gate, smoke tests and rollback procedure.

## Phase 1 — LivingDocument and artifact contract — #4

Create the versioned rebuildable document representation and define artifact metadata/manifest inputs early enough that later exports do not require a parallel knowledge model.

Likely storage:

```text
/document.json
/documents/<version-or-checkpoint>.json
```

No artifact bytes are stored as authoritative Garden state.

## Phase 2 — deterministic compiler — #5

Build a useful LivingDocument without an LLM: executive summary, findings, questions, uncertainty, sources and timeline metadata.

## Phase 3 — semantic evolution — #6

Introduce validated evidence-backed semantic patches. Invalid AI output leaves the last valid document untouched.

## Phase 4 — Living Document UI — #7

Add `/g/[slug]/document` with version/freshness, current knowledge, uncertainty, source navigation, timeline and What Changed.

## Phase 5 — Ask this document — #8

Ground server-side answers in LivingDocument findings/versions/source evidence. Q&A remains independent from rendering.

## Phase 6 — autonomous regrowth — #9

Only meaningful changes generate document evolution/version churn. Duplicate crawler activity does not.

## Phase 7 — Artifact compiler and normal PDF — #10

Build a generic artifact pipeline rather than a PDF-only one-off.

Proposed modules:

```text
lib/artifacts/
  manifest.ts
  select-content.ts
  redact.ts
  build.ts
  pdf/
    render.ts
```

Potential endpoint:

```text
POST /api/gardens/[slug]/artifacts/pdf
```

Requirements:

- freeze explicit document version;
- build artifact manifest;
- select bounded evidence/source excerpts;
- apply authorization/redaction;
- generate reproducible normal PDF;
- include canonical live URL and version metadata;
- failure isolated from the live document.

This phase establishes the artifact input contract later reused by Intelligent PDF.

## Phase 8 — Intelligent PDF runtime and retrieval — #11

Implement the self-contained PDF shell before adding an embedded LLM.

Target contents:

```text
PDF UI
+ living-document snapshot
+ artifact manifest
+ compact search/retrieval index
+ selected source excerpts
+ PDF JavaScript interaction/runtime shell
```

Required behavior:

- local search works with no network;
- “Ask this document” can retrieve useful context even before LLM inference exists;
- unsupported viewers show a clear compatibility message while document pages remain readable where possible;
- no filesystem privileges, secrets or arbitrary host access.

This phase proves the portable runtime/container and retrieval path independently of model performance.

## Phase 9 — Embedded model packaging and local inference — #36

Add the actual `llm.pdf`-inspired model path.

Build pipeline concept:

```text
approved GGUF model
       +
llama.cpp-compatible runtime
       |
 Emscripten / PDF-compatible JS build
       |
       v
artifact packager
       |
       +-- model.gguf
       +-- runtime
       +-- prompt/policy
       +-- retrieval adapter
       v
Intelligent PDF
```

The LLM is used only after retrieval. It is not trusted as the evidence store.

Benchmarks must record:

- final PDF size;
- model size and quantization;
- startup/load time;
- first-token latency;
- tokens/sec or sec/token;
- peak memory where measurable;
- answer quality on a frozen document Q&A set;
- viewer/platform compatibility.

Model profiles should be configurable rather than hard-coded:

```text
Normal PDF            smallest, no model
Smart PDF             compact local model
Smart+ PDF            optional larger model only if benchmarks justify it
```

No model should be shipped by default until its license, redistribution terms and artifact size are explicitly reviewed.

## Phase 10 — Connected Living PDF — #37

Add optional live-version awareness while preserving offline-first behavior.

Requirements:

- embed non-secret `gardenSlug`, `documentVersion`, `canonicalUrl`;
- detect a newer live document only through an explicitly supported/safe mechanism;
- show “new growth available” rather than silently rewriting the PDF;
- provide See changes / Open latest when supported;
- never require connectivity;
- no embedded authentication/API secrets;
- clearly document viewer/network limitations.

The PDF itself remains an immutable versioned snapshot. “Living” means it can discover that its source Garden has grown, not that it secretly mutates its own bytes.

## Phase 11 — hardening / rollout — #12

Harden the production-ready subset:

- authorization/private Garden exports;
- source prompt-injection boundaries;
- artifact redaction and secret scanning;
- malicious links/content handling;
- model/runtime supply-chain and redistribution review;
- PDF active-content security disclosure;
- Q&A/export abuse controls;
- artifact size/latency limits;
- structured observability;
- rollback/disable controls.

Normal PDF may be approved for production while Intelligent PDF remains experimental. Rollout decisions are independent per artifact class.

---

# Proposed implementation layout

```text
lib/
  document/
    types.ts
    compile.ts
    patch.ts
    diff.ts
    retrieval.ts

  artifacts/
    manifest.ts
    select-content.ts
    redact.ts
    build.ts
    pdf/
      render.ts
    intelligent-pdf/
      build.ts
      index.ts
      model-profile.ts

packages/
  pdf-runtime/
    retrieval/
    ui/
    llama/

app/api/gardens/[slug]/
  document/
  ask/
  artifacts/
    pdf/
    intelligent-pdf/
```

The final paths can change, but the dependency direction must not: artifact code consumes LivingDocument state and never becomes required by core Garden routes.

---

# Testing and release gates

## Core regression tests

Every implementation PR verifies applicable existing behavior:

- `/` loads;
- public `/g/[slug]` loads;
- `/s/[id]` remains unchanged;
- research submission/fallback remains usable;
- Worker health passes when Worker changes are involved;
- private/public visibility does not regress.

## LivingDocument tests

- legacy Garden without a document;
- empty/one-run/multi-run document;
- deterministic rebuild;
- invalid semantic patch;
- citation mismatch;
- source contradiction;
- provider unavailable;
- version diff;
- Q&A insufficient-evidence behavior.

## Artifact tests

- explicit document version is frozen;
- artifact manifest matches embedded content;
- normal PDF is reproducible;
- artifact generation failure is isolated;
- private/sensitive content is not exported without authorization;
- no server/API secrets enter artifact bytes;
- retrieval-only Intelligent PDF works offline;
- invalid/missing model degrades to retrieval-only behavior;
- embedded model answers only supplied retrieved context under the document assistant policy;
- model/runtime file-size budget is enforced;
- supported viewer matrix is tested;
- Connected PDF remains useful when version check/network fails.

## Vercel release flow

```text
worktree
 -> feature branch
 -> draft PR
 -> CI
 -> Vercel Preview
 -> existing-route smoke
 -> feature/artifact smoke
 -> ready for review
 -> merge
 -> production
 -> post-deploy runtime check
```

Do not manually promote experimental Intelligent PDF work to production to bypass the normal preview/approval path.

---

# Security boundaries

An Intelligent PDF is active content and must be treated accordingly.

Never embed:

- API keys;
- Worker internal token;
- Clerk secrets/session material;
- crawler credentials;
- private source material not authorized for export;
- arbitrary filesystem/network privileges.

Source text and model output remain untrusted. Retrieval references must map to the frozen artifact evidence set.

Connected mode must use only mechanisms supported by the target viewer/environment; generic PDF JavaScript must not be assumed to have unrestricted HTTP/localhost/filesystem access.

---

# Size and performance policy

Artifact generation must expose size before download where practical.

Illustrative target classes, to be validated rather than assumed:

```text
Normal PDF          few MB
Smart PDF           tens to low hundreds of MB
Smart+ PDF          only if explicitly selected and benchmarked
```

The build pipeline should reject or warn on artifact/model profiles that exceed configured limits. Model selection is a packaging policy, not a Garden-level knowledge decision.

---

# Rollback strategy

1. Garden/research/evidence stays authoritative.
2. LivingDocument is rebuildable.
3. Artifact files are disposable and reproducible from a known version.
4. Normal PDF, Intelligent PDF and Connected features have independent feature gates.
5. Q&A/API failures do not affect document rendering.
6. Intelligent PDF runtime/model failures fall back to normal document content or retrieval-only mode where possible.
7. Disabling artifact generation never requires a data migration.

---

# Definition of done

The initiative is complete when:

- every Garden can have a versioned rebuildable LivingDocument;
- material claims/changes are traceable to evidence;
- users can inspect changes and ask grounded questions;
- continuous research grows documents without noisy version churn;
- an artifact compiler freezes an explicit document version;
- normal PDF export is reproducible and safe;
- Intelligent PDF works offline with embedded snapshot + retrieval;
- at least one approved embedded GGUF/local-runtime profile has measured size/latency/quality and documented compatibility;
- local LLM Q&A is grounded through embedded retrieval rather than model memory;
- Connected PDF can report newer Garden growth where supported without losing offline usability;
- no PDF/runtime/model path is required for availability of the core Web Terrarium;
- rollback remains non-destructive.
