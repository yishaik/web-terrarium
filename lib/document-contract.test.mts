import assert from "node:assert/strict";
import test from "node:test";
import { ARTIFACT_MANIFEST_SCHEMA_VERSION, LIVING_DOCUMENT_SCHEMA_VERSION, isArtifactManifest, isLivingDocument } from "../shared/document.ts";

const document = {
  schemaVersion: LIVING_DOCUMENT_SCHEMA_VERSION,
  documentVersion: 1,
  gardenSlug: "example-garden",
  title: "Example Garden",
  executiveSummary: "A grounded summary.",
  sections: [],
  findings: [],
  openQuestions: [],
  uncertainties: [],
  changes: [],
  sourceRefs: [],
  generatedAt: "2026-08-09T00:00:00.000Z",
  basedOn: { runCount: 1, sourceFingerprint: "abc123" },
};

test("accepts the versioned LivingDocument contract", () => {
  assert.equal(isLivingDocument(document), true);
});

test("rejects invalid or backwards-looking document shapes", () => {
  assert.equal(isLivingDocument({ ...document, documentVersion: 0 }), false);
  assert.equal(isLivingDocument({ ...document, schemaVersion: 999 }), false);
  assert.equal(isLivingDocument({ ...document, sourceRefs: null }), false);
});

test("accepts a reusable artifact manifest", () => {
  assert.equal(isArtifactManifest({
    schemaVersion: ARTIFACT_MANIFEST_SCHEMA_VERSION,
    artifactType: "intelligent-pdf",
    gardenSlug: "example-garden",
    documentVersion: 1,
    generatedAt: "2026-08-09T00:00:00.000Z",
    canonicalUrl: "https://example.test/g/example-garden/document",
    documentGeneratedAt: "2026-08-09T00:00:00.000Z",
    sourceFingerprint: "abc123",
  }), true);
});
