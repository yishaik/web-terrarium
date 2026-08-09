import assert from "node:assert/strict";
import test from "node:test";
import { buildArtifactManifest } from "./artifacts/manifest.ts";
import { LIVING_DOCUMENT_SCHEMA_VERSION } from "../shared/document.ts";

const document = {
  schemaVersion: LIVING_DOCUMENT_SCHEMA_VERSION,
  documentVersion: 7,
  gardenSlug: "artifact-garden",
  title: "Artifact Garden",
  executiveSummary: "A frozen research state.",
  sections: [], findings: [], openQuestions: [], uncertainties: [], changes: [], sourceRefs: [],
  generatedAt: "2026-08-09T01:00:00.000Z",
  basedOn: { runCount: 3, sourceFingerprint: "fp-seven" },
};

test("artifact manifest freezes one explicit document version", () => {
  const manifest = buildArtifactManifest({ document, artifactType: "pdf", canonicalUrl: "https://example.test/g/artifact-garden/document", generatedAt: "2026-08-09T02:00:00.000Z" });
  assert.equal(manifest.documentVersion, 7);
  assert.equal(manifest.documentGeneratedAt, document.generatedAt);
  assert.equal(manifest.sourceFingerprint, "fp-seven");
  assert.equal(manifest.retrievalProfile, undefined);
});

test("intelligent artifacts advertise retrieval without changing the knowledge model", () => {
  const manifest = buildArtifactManifest({ document: { ...document, findings: [{ id: "f", title: "F", detail: "D", confidence: "high", status: "current", sourceIds: [] }] }, artifactType: "intelligent-pdf", canonicalUrl: "https://example.test/g/artifact-garden/document" });
  assert.equal(manifest.retrievalProfile?.algorithm, "lexical-v1");
  assert.equal(manifest.retrievalProfile?.evidenceCount, 1);
});
