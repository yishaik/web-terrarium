import { ARTIFACT_MANIFEST_SCHEMA_VERSION, type ArtifactManifest, type ArtifactType, type LivingDocument } from "../../shared/document.ts";

export function buildArtifactManifest({ document, artifactType, canonicalUrl, generatedAt = new Date().toISOString() }: {
  document: LivingDocument;
  artifactType: ArtifactType;
  canonicalUrl: string;
  generatedAt?: string;
}): ArtifactManifest {
  return {
    schemaVersion: ARTIFACT_MANIFEST_SCHEMA_VERSION,
    artifactType,
    gardenSlug: document.gardenSlug,
    documentVersion: document.documentVersion,
    generatedAt,
    canonicalUrl,
    documentGeneratedAt: document.generatedAt,
    sourceFingerprint: document.basedOn.sourceFingerprint,
    retrievalProfile: artifactType === "pdf" ? undefined : { algorithm: "lexical-v1", evidenceCount: document.findings.length },
  };
}
