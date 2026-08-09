import assert from "node:assert/strict";
import test from "node:test";
import { answerLivingDocumentQuestion, retrieveDocumentEvidence } from "./document/ask.ts";
import { LIVING_DOCUMENT_SCHEMA_VERSION } from "../shared/document.ts";

const document = {
  schemaVersion: LIVING_DOCUMENT_SCHEMA_VERSION,
  documentVersion: 3,
  gardenSlug: "agents",
  title: "Agents",
  executiveSummary: "Durable execution protects completed work.",
  sections: [],
  findings: [
    { id: "f1", title: "Durable workflows", detail: "Completed steps are journaled and survive retries.", confidence: "high" as const, status: "current" as const, sourceIds: ["s1"] },
    { id: "f2", title: "Cost control", detail: "Bounded budgets prevent unbounded recursive research.", confidence: "medium" as const, status: "current" as const, sourceIds: ["s2"] },
  ],
  openQuestions: [], uncertainties: [], changes: [],
  sourceRefs: [
    { id: "s1", title: "Workflow docs", url: "https://example.com/workflow", domain: "example.com", description: "Durable workflow documentation." },
    { id: "s2", title: "Budget docs", url: "https://example.com/budget", domain: "example.com", description: "Budget controls." },
  ],
  generatedAt: "2026-08-09T00:00:00.000Z",
  basedOn: { runCount: 2, sourceFingerprint: "hash" },
};

test("retrieval ranks relevant evidence", () => {
  const hits = retrieveDocumentEvidence("How do workflow retries preserve completed steps?", document);
  assert.equal(hits[0].findingId, "f1");
});

test("Q&A refuses unsupported questions without AI", async () => {
  const answer = await answerLivingDocumentQuestion({ question: "What is the weather in Tokyo?", document, token: null });
  assert.equal(answer.coverage, "insufficient");
  assert.equal(answer.citations.length, 0);
});
