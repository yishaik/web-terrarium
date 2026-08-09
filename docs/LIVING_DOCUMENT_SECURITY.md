# LivingDocument production security and rollout

## Trust model

Garden research content and crawled source text are untrusted data. They may influence findings only through the research/evidence pipeline; they never gain authority to change system instructions, tool scope, credentials, authorization policy, or artifact runtime behavior.

`Garden + persisted research evidence` is authoritative. `LivingDocument` is a rebuildable projection. PDF artifacts are immutable snapshots and are never accepted back as trusted Garden state.

## Authorization

- Public LivingDocument routes consume only public Gardens.
- Private Garden operational/document state remains behind owner/internal-token checks.
- Artifact export uses the same public document loader; private data is not made public through an export shortcut.
- Continuous research is opt-in per Garden.

## Q&A

- Retrieval happens before model synthesis.
- AI receives only bounded retrieved findings and allowlisted source metadata.
- Returned citation IDs must exist in the frozen source set.
- Unsupported questions return insufficient-evidence instead of outside knowledge.
- Public Q&A is capped to 320 characters and has a per-instance request limiter; Vercel Firewall remains the correct distributed abuse-control layer for high-volume attacks.
- Logs contain Garden/version/coverage counts, not raw source bodies or credentials.

## PDF artifact classes

### Research PDF
Static visual snapshot. No active runtime required.

### Intelligent Offline PDF
Contains frozen findings, source metadata, AcroForm fields, and local lexical retrieval JavaScript. It has no credentials, network dependency, filesystem bridge, or privileged host integration.

### Smart PDF
Contains the same frozen evidence plus a JavaScript-only llama.cpp runtime and an open GGUF model. The model is downloaded only after explicit user selection and its SHA-256 is verified before packaging. The runtime/model may consume significant memory and CPU, so this artifact is an explicit desktop-oriented export rather than a critical web path.

The Smart PDF model sees only evidence selected from the embedded snapshot. If the viewer cannot execute the active runtime, the PDF remains a frozen artifact and should fail toward retrieval/readability rather than toward external calls.

### Connected Living PDF
The artifact does not rewrite itself or perform privileged networking. Its canonical link carries the non-secret frozen document version back to Web Terrarium. The live page then compares that version with current state and reports newer growth.

## Secrets

The following must never enter LivingDocument payloads, client bundles, logs, or generated artifacts:

- Clerk secret/session material
- `AGENT_WORKER_TOKEN` / Cloudflare internal token
- crawler provider credentials
- AI Gateway credentials / OIDC tokens
- cron secret
- deployment credentials

Generated PDFs contain only public/frozen document content, source URLs, non-secret artifact metadata, and explicitly approved open runtime/model assets.

## Performance budgets

- Core Garden and LivingDocument rendering must not wait for PDF generation.
- Research PDF and Intelligent PDF generation occurs in the browser and is isolated from server request limits.
- Smart PDF model/runtime downloads happen only after explicit selection.
- Current Smart profile: SmolLM2 135M Instruct Q2_K, ~88 MB GGUF before PDF/base64 packaging.
- Long-lived Gardens use bounded findings/questions/change history rather than loading unbounded raw run history into every page.

## Rollback

Each layer can be disabled independently:

1. hide artifact entry points;
2. disable Smart PDF while keeping normal/Intelligent PDF;
3. disable Q&A while retaining document rendering;
4. fall back to deterministic document compilation;
5. fall back from persisted document projection to public Garden evidence;
6. roll back Vercel UI and Cloudflare Worker independently.

No rollback requires deleting or rewriting persisted Garden/Run evidence.

## Production verification

Before considering the initiative production-ready:

- GitHub CI green for web app and Worker;
- Smart runtime/model smoke test green;
- production Worker deployment workflow green;
- Vercel production deployment READY;
- `/`, `/api/topics`, `/api/health/storage`, a public Garden, LivingDocument, export route, and Q&A smoke-tested;
- production runtime error clusters reviewed after deployment;
- no unresolved Vercel toolbar feedback;
- production dependency audit has no high/critical vulnerabilities.
