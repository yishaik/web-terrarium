import assert from "node:assert/strict";
import test from "node:test";
import { applyDocumentPatch, DocumentPatchError } from "./document/patch.ts";
import { DOCUMENT_PATCH_SCHEMA_VERSION } from "../shared/document-patch.ts";
import { LIVING_DOCUMENT_SCHEMA_VERSION } from "../shared/document.ts";

const base = {
  schemaVersion: LIVING_DOCUMENT_SCHEMA_VERSION,
  documentVersion: 1,
  gardenSlug: "garden",
  title: "Garden",
  executiveSummary: "Summary",
  sections: [{ id: "current-picture", title: "Current picture", summary: "Old", findingIds: ["finding-a"] }],
  findings: [{ id: "finding-a", title: "Finding A", detail: "Initial detail", confidence: "medium" as const, status: "current" as const, sourceIds: ["src-a"] }],
  openQuestions: [{ id: "question-a", question: "Still open?", status: "open" as const, sourceIds: ["src-a"] }],
  uncertainties: [],
  changes: [],
  sourceRefs: [{ id: "src-a", title: "Source A", url: "https://example.com/a", domain: "example.com" }, { id: "src-b", title: "Source B", url: "https://example.com/b", domain: "example.com" }],
  generatedAt: "2026-08-09T00:00:00.000Z",
  basedOn: { runCount: 1, sourceFingerprint: "abc" },
};

const metadata = { reason: "New evidence changes the assessment.", recordedAt: "2026-08-10T00:00:00.000Z", sourceIds: ["src-b"] };

const patch = {
  schemaVersion: DOCUMENT_PATCH_SCHEMA_VERSION,
  gardenSlug: "garden",
  fromVersion: 1,
  toVersion: 2,
  operations: [
    { op: "add_evidence" as const, findingId: "finding-a", ...metadata },
    { op: "set_confidence" as const, findingId: "finding-a", confidence: "high" as const, ...metadata },
    { op: "resolve_open_question" as const, questionId: "question-a", ...metadata },
  ],
};

test("applies a grounded semantic patch deterministically", () => {
  const first = applyDocumentPatch(base, patch);
  const second = applyDocumentPatch(base, patch);
  assert.deepEqual(first, second);
  assert.equal(first.documentVersion, 2);
  assert.equal(first.findings[0].confidence, "high");
  assert.deepEqual(first.findings[0].sourceIds.sort(), ["src-a", "src-b"]);
  assert.equal(first.openQuestions[0].status, "resolved");
  assert.equal(first.changes.length, 3);
});

test("rejects patches that cite evidence outside the frozen source set", () => {
  assert.throws(() => applyDocumentPatch(base, {
    ...patch,
    operations: [{ ...metadata, op: "add_evidence", findingId: "finding-a", sourceIds: ["src-unknown"] }],
  }), DocumentPatchError);
});

test("retractions preserve the finding and history rather than deleting it", () => {
  const next = applyDocumentPatch(base, {
    ...patch,
    operations: [{ ...metadata, op: "retract_finding", findingId: "finding-a" }],
  });
  assert.equal(next.findings[0].status, "retracted");
  assert.equal(next.findings.length, 1);
  assert.equal(next.changes[0].type, "retracted");
});
