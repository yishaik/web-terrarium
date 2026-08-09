import assert from "node:assert/strict";
import test from "node:test";
import { compileLivingDocument } from "./document/compile.ts";

const run = {
  query: "durable agents",
  provider: "fastcrw" as const,
  mode: "live" as const,
  note: "fresh",
  recordedAt: "2026-08-09T00:00:00.000Z",
  sources: [
    { title: "Primary docs", url: "https://example.com/docs", description: "Durable execution persists completed steps.", domain: "example.com" },
    { title: "Independent analysis", url: "https://analysis.example.org/a", description: "Retries should be idempotent.", domain: "analysis.example.org" },
  ],
  brief: {
    headline: "Durability is becoming standard",
    summary: "Durable runtimes journal completed work.",
    highlights: [{ title: "Journal completed work", detail: "Completed steps survive retries." }],
    executiveSummary: { takeaway: "Persist completed work and make writes idempotent.", points: [{ title: "Journal completed work", detail: "Completed steps survive retries." }] },
    citations: [{ claim: "Journal completed work", url: "https://example.com/docs" }],
    hypotheses: ["Durable workflows will become the default."],
    nextQuestions: ["What is the cost of long-lived runs?"],
  },
};

const garden = {
  slug: "durable-agents",
  title: "Durable Agents",
  ownerId: "user_test",
  visibility: "public" as const,
  createdAt: "2026-08-08T00:00:00.000Z",
  latestRun: run,
  history: [run],
};

test("same input compiles to the same semantic document", () => {
  const first = compileLivingDocument(garden, null, "2026-08-09T01:00:00.000Z");
  const second = compileLivingDocument(garden, null, "2026-08-09T02:00:00.000Z");
  assert.equal(first.basedOn.sourceFingerprint, second.basedOn.sourceFingerprint);
  assert.deepEqual(first.findings, second.findings);
  assert.deepEqual(first.sourceRefs, second.sourceRefs);
  assert.equal(first.executiveSummary, second.executiveSummary);
});

test("rebuild with unchanged source state does not create a new version", () => {
  const first = compileLivingDocument(garden, null, "2026-08-09T01:00:00.000Z");
  const rebuilt = compileLivingDocument(garden, first, "2026-08-09T02:00:00.000Z");
  assert.equal(rebuilt.documentVersion, first.documentVersion);
  assert.equal(rebuilt.generatedAt, first.generatedAt);
});

test("new evidence increments version and produces traceable changes", () => {
  const first = compileLivingDocument(garden, null, "2026-08-09T01:00:00.000Z");
  const nextRun = {
    ...run,
    recordedAt: "2026-08-10T00:00:00.000Z",
    sources: [...run.sources, { title: "New source", url: "https://new.example.net", description: "New evidence.", domain: "new.example.net" }],
    brief: {
      ...run.brief,
      executiveSummary: { takeaway: "The evidence base strengthened.", points: [...run.brief.executiveSummary.points, { title: "New evidence", detail: "A new source corroborates the direction." }] },
      highlights: [...run.brief.highlights, { title: "New evidence", detail: "A new source corroborates the direction." }],
    },
  };
  const nextGarden = { ...garden, latestRun: nextRun, history: [nextRun, run] };
  const second = compileLivingDocument(nextGarden, first, "2026-08-10T01:00:00.000Z");
  assert.equal(second.documentVersion, 2);
  assert.equal(second.sourceRefs.length, 3);
  assert.ok(second.changes.some((change) => change.type === "added"));
});
