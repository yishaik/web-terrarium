import assert from "node:assert/strict";
import test from "node:test";
import { compileLivingDocument } from "./document/compile.ts";

const source = { title: "Docs", url: "https://example.com/docs", description: "Stable evidence", domain: "example.com" };
const brief = { headline: "Stable", summary: "The evidence is unchanged.", highlights: [{ title: "Stable finding", detail: "No material change." }], executiveSummary: { takeaway: "No material change.", points: [{ title: "Stable finding", detail: "No material change." }] }, citations: [{ claim: "Stable finding", url: source.url }], nextQuestions: [] as string[], hypotheses: [] as string[] };
const run = { query: "topic", provider: "fastcrw" as const, mode: "live" as const, note: "", sources: [source], brief, recordedAt: "2026-08-09T00:00:00.000Z" };
const garden = { slug: "garden", title: "Garden", ownerId: "owner", visibility: "public" as const, createdAt: "2026-08-08T00:00:00.000Z", latestRun: run, history: [run] };

test("duplicate research at a later timestamp does not create document churn", () => {
  const first = compileLivingDocument(garden, null, "2026-08-09T01:00:00.000Z");
  const duplicate = { ...run, recordedAt: "2026-08-10T00:00:00.000Z" };
  const repeatedGarden = { ...garden, latestRun: duplicate, history: [duplicate, run] };
  const next = compileLivingDocument(repeatedGarden, first, "2026-08-10T01:00:00.000Z");
  assert.deepEqual(next, first);
});
