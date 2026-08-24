import assert from "node:assert/strict";
import test from "node:test";
import { mapBriefToSources } from "./source-map.ts";

const sources = [
  { title: "Durable execution", url: "https://example.com/durable", description: "Retries preserve completed work.", domain: "example.com" },
  { title: "Fast responses", url: "https://example.com/speed", description: "Latency fell by 35%.", domain: "example.com" },
];

test("maps synthesized findings only to matching citation URLs", () => {
  const findings = mapBriefToSources({
    headline: "Research", summary: "Summary", highlights: [{ title: "Retries are durable", detail: "Completed work survives a retry." }],
    executiveSummary: { takeaway: "Takeaway", points: [] }, aiModel: "test/model",
    citations: [{ claim: "Completed work survives retries", url: sources[0].url }],
  }, sources);
  assert.deepEqual(findings[0].sources, [sources[0]]);
  assert.equal(findings[0].evidenceStatus, "linked");
});

test("does not invent a source link for an uncited AI finding", () => {
  const findings = mapBriefToSources({
    headline: "Research", summary: "Summary", highlights: [{ title: "A new claim", detail: "No supplied citation supports it." }],
    executiveSummary: { takeaway: "Takeaway", points: [] }, aiModel: "test/model", citations: [],
  }, sources);
  assert.deepEqual(findings[0].sources, []);
  assert.equal(findings[0].evidenceStatus, "uncited");
});

test("flags numeric claims even when their evidence is linked", () => {
  const findings = mapBriefToSources({
    headline: "Research", summary: "Summary", highlights: [{ title: "Latency improvement", detail: "Latency fell by 35%." }],
    executiveSummary: { takeaway: "Takeaway", points: [] }, aiModel: "test/model",
    citations: [{ claim: "Latency fell by 35%", url: sources[1].url }],
  }, sources);
  assert.deepEqual(findings[0].sources, [sources[1]]);
  assert.equal(findings[0].evidenceStatus, "review");
});

test("preserves deterministic source order for the non-AI fallback brief", () => {
  const findings = mapBriefToSources({
    headline: "Research", summary: "Summary", highlights: sources.map((source) => ({ title: source.title, detail: source.description })),
    executiveSummary: { takeaway: "Takeaway", points: [] },
  }, sources);
  assert.deepEqual(findings.map((finding) => finding.sources[0]?.url), sources.map((source) => source.url));
});
