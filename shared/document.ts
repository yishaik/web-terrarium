export const LIVING_DOCUMENT_SCHEMA_VERSION = 1 as const;
export const ARTIFACT_MANIFEST_SCHEMA_VERSION = 1 as const;
export const WORKER_CONTRACT_VERSION = "living-document-v1" as const;

export type ConfidenceBand = "high" | "medium" | "low";
export type FindingStatus = "current" | "contested" | "retracted";
export type QuestionStatus = "open" | "resolved";
export type DocumentChangeType = "added" | "updated" | "contested" | "resolved" | "retracted" | "evidence";
export type ArtifactType = "pdf" | "intelligent-pdf" | "connected-pdf";

export type SourceReference = {
  id: string;
  title: string;
  url: string;
  domain: string;
  description?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
};

export type DocumentFinding = {
  id: string;
  title: string;
  detail: string;
  confidence: ConfidenceBand;
  status: FindingStatus;
  sourceIds: string[];
  firstSeenAt?: string;
  updatedAt?: string;
};

export type OpenQuestion = {
  id: string;
  question: string;
  status: QuestionStatus;
  sourceIds: string[];
  firstSeenAt?: string;
  resolvedAt?: string;
};

export type Uncertainty = {
  id: string;
  label: string;
  detail: string;
  sourceIds: string[];
};

export type DocumentSection = {
  id: string;
  title: string;
  summary: string;
  findingIds: string[];
};

export type DocumentChange = {
  id: string;
  type: DocumentChangeType;
  label: string;
  detail: string;
  sourceIds: string[];
  recordedAt: string;
  fromVersion?: number;
};

export type LivingDocument = {
  schemaVersion: typeof LIVING_DOCUMENT_SCHEMA_VERSION;
  documentVersion: number;
  gardenSlug: string;
  title: string;
  executiveSummary: string;
  sections: DocumentSection[];
  findings: DocumentFinding[];
  openQuestions: OpenQuestion[];
  uncertainties: Uncertainty[];
  changes: DocumentChange[];
  sourceRefs: SourceReference[];
  generatedAt: string;
  basedOn: {
    latestRunAt?: string;
    runCount: number;
    sourceFingerprint: string;
  };
};

export type ArtifactManifest = {
  schemaVersion: typeof ARTIFACT_MANIFEST_SCHEMA_VERSION;
  artifactType: ArtifactType;
  gardenSlug: string;
  documentVersion: number;
  generatedAt: string;
  canonicalUrl: string;
  documentGeneratedAt: string;
  sourceFingerprint: string;
  retrievalProfile?: {
    algorithm: "lexical-v1";
    evidenceCount: number;
  };
  localInferenceProfile?: {
    runtime: "llama.cpp-asmjs";
    modelId: string;
    format: "gguf";
    quantization?: string;
  };
};

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isLivingDocument(value: unknown): value is LivingDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const document = value as Partial<LivingDocument>;
  return document.schemaVersion === LIVING_DOCUMENT_SCHEMA_VERSION
    && Number.isInteger(document.documentVersion)
    && (document.documentVersion ?? 0) > 0
    && isString(document.gardenSlug)
    && isString(document.title)
    && typeof document.executiveSummary === "string"
    && Array.isArray(document.sections)
    && Array.isArray(document.findings)
    && Array.isArray(document.openQuestions)
    && Array.isArray(document.uncertainties)
    && Array.isArray(document.changes)
    && Array.isArray(document.sourceRefs)
    && isString(document.generatedAt)
    && Boolean(document.basedOn)
    && typeof document.basedOn?.runCount === "number"
    && isString(document.basedOn?.sourceFingerprint);
}

export function isArtifactManifest(value: unknown): value is ArtifactManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const manifest = value as Partial<ArtifactManifest>;
  return manifest.schemaVersion === ARTIFACT_MANIFEST_SCHEMA_VERSION
    && (manifest.artifactType === "pdf" || manifest.artifactType === "intelligent-pdf" || manifest.artifactType === "connected-pdf")
    && isString(manifest.gardenSlug)
    && Number.isInteger(manifest.documentVersion)
    && (manifest.documentVersion ?? 0) > 0
    && isString(manifest.generatedAt)
    && isString(manifest.canonicalUrl)
    && isString(manifest.documentGeneratedAt)
    && isString(manifest.sourceFingerprint);
}
