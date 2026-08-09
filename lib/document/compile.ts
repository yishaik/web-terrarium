import type { Garden, StoredRun } from "../worker.ts";
import { diffLivingDocuments } from "./diff.ts";
import {
  LIVING_DOCUMENT_SCHEMA_VERSION,
  type ConfidenceBand,
  type DocumentFinding,
  type LivingDocument,
  type OpenQuestion,
  type SourceReference,
  type Uncertainty,
} from "../../shared/document.ts";

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sourceId(url: string) { return `src-${hashText(url.toLowerCase())}`; }
function findingId(title: string) { return `finding-${hashText(normalized(title))}`; }
function questionId(question: string) { return `question-${hashText(normalized(question))}`; }
function uncertaintyId(label: string) { return `uncertainty-${hashText(normalized(label))}`; }

function confidenceForRun(run: StoredRun, citationCount: number): ConfidenceBand {
  if (run.mode === "demo") return "low";
  if (citationCount >= 2) return "high";
  if (citationCount === 1 || run.brief?.aiModel) return "medium";
  return "low";
}

function runsForGarden(garden: Garden) {
  const history = garden.history ?? [];
  if (history.length) return [...history].reverse();
  return garden.latestRun ? [garden.latestRun] : [];
}

function sourceIdsForPoint(run: StoredRun, title: string) {
  const citations = run.brief?.citations ?? [];
  const needle = normalized(title).split(" ").filter((word) => word.length > 3).slice(0, 4);
  const matching = citations.filter((citation) => {
    const claim = normalized(citation.claim);
    return needle.length === 0 || needle.some((word) => claim.includes(word));
  });
  const urls = matching.length ? matching.map((citation) => citation.url) : run.sources.slice(0, 3).map((source) => source.url);
  return [...new Set(urls)].map(sourceId);
}

function sourceFingerprint(runs: StoredRun[]) {
  const material = runs.map((run) => ({
    sources: run.sources.map((source) => ({ url: source.url, description: source.description })).sort((a, b) => a.url.localeCompare(b.url)),
    summary: run.brief?.summary,
    takeaway: run.brief?.executiveSummary?.takeaway,
    points: run.brief?.executiveSummary?.points ?? run.brief?.highlights ?? [],
    questions: run.brief?.nextQuestions ?? [],
    hypotheses: run.brief?.hypotheses ?? [],
  }));
  const unique = [...new Map(material.map((entry) => [JSON.stringify(entry), entry])).values()];
  return hashText(JSON.stringify(unique));
}

function compileSources(runs: StoredRun[]) {
  const sources = new Map<string, SourceReference>();
  for (const run of runs) for (const source of run.sources) {
    const id = sourceId(source.url);
    const current = sources.get(id);
    sources.set(id, { id, title: source.title, url: source.url, domain: source.domain, description: source.description, firstSeenAt: current?.firstSeenAt ?? run.recordedAt, lastSeenAt: run.recordedAt });
  }
  return [...sources.values()];
}

function compileFindings(runs: StoredRun[]) {
  const findings = new Map<string, DocumentFinding>();
  for (const run of runs) {
    const points = run.brief?.executiveSummary?.points?.length ? run.brief.executiveSummary.points : run.brief?.highlights ?? [];
    for (const point of points) {
      const id = findingId(point.title);
      const ids = sourceIdsForPoint(run, point.title);
      const previous = findings.get(id);
      findings.set(id, { id, title: point.title, detail: point.detail, confidence: confidenceForRun(run, run.brief?.citations?.length ?? 0), status: "current", sourceIds: [...new Set([...(previous?.sourceIds ?? []), ...ids])].slice(0, 8), firstSeenAt: previous?.firstSeenAt ?? run.recordedAt, updatedAt: run.recordedAt });
    }
  }
  return [...findings.values()].slice(-18);
}

function compileQuestions(runs: StoredRun[], sourceRefs: SourceReference[]) {
  const questions = new Map<string, OpenQuestion>();
  const fallbackSourceIds = sourceRefs.slice(-3).map((source) => source.id);
  for (const run of runs) for (const question of run.brief?.nextQuestions ?? []) {
    const id = questionId(question); const previous = questions.get(id);
    questions.set(id, { id, question, status: previous?.status ?? "open", sourceIds: previous?.sourceIds ?? fallbackSourceIds, firstSeenAt: previous?.firstSeenAt ?? run.recordedAt });
  }
  return [...questions.values()].slice(-10);
}

function compileUncertainties(runs: StoredRun[], sourceRefs: SourceReference[]) {
  const uncertainties = new Map<string, Uncertainty>();
  const fallbackSourceIds = sourceRefs.slice(-3).map((source) => source.id);
  for (const run of runs) for (const hypothesis of run.brief?.hypotheses ?? []) {
    const id = uncertaintyId(hypothesis);
    uncertainties.set(id, { id, label: hypothesis, detail: "This remains a hypothesis or unresolved interpretation rather than a settled finding.", sourceIds: fallbackSourceIds });
  }
  return [...uncertainties.values()].slice(-8);
}

export function compileLivingDocument(garden: Garden, previous: LivingDocument | null = null, now = new Date().toISOString()): LivingDocument {
  const runs = runsForGarden(garden);
  const fingerprint = sourceFingerprint(runs);
  if (previous && previous.basedOn.sourceFingerprint === fingerprint) return structuredClone(previous);

  const sourceRefs = compileSources(runs);
  const findings = compileFindings(runs);
  const openQuestions = compileQuestions(runs, sourceRefs);
  const uncertainties = compileUncertainties(runs, sourceRefs);
  const latest = runs.at(-1);
  const documentVersion = previous ? previous.documentVersion + 1 : 1;
  const executiveSummary = latest?.brief?.executiveSummary?.takeaway ?? latest?.brief?.summary ?? (runs.length ? `Research is accumulating across ${runs.length} growth cycles.` : "This garden is waiting for its first research run.");

  const current: LivingDocument = {
    schemaVersion: LIVING_DOCUMENT_SCHEMA_VERSION,
    documentVersion,
    gardenSlug: garden.slug,
    title: garden.title,
    executiveSummary,
    sections: [
      { id: "current-picture", title: "Current picture", summary: latest?.brief?.summary ?? executiveSummary, findingIds: findings.filter((finding) => finding.status === "current").map((finding) => finding.id) },
      { id: "evidence-base", title: "Evidence base", summary: sourceRefs.length ? `${sourceRefs.length} distinct sources currently support this document.` : "No source evidence has been recorded yet.", findingIds: findings.map((finding) => finding.id) },
    ],
    findings, openQuestions, uncertainties, changes: [], sourceRefs, generatedAt: now,
    basedOn: { latestRunAt: latest?.recordedAt, runCount: runs.length, sourceFingerprint: fingerprint },
  };
  current.changes = diffLivingDocuments(previous, current, latest?.recordedAt ?? now);
  return current;
}
