import type { ConfidenceBand, DocumentFinding, OpenQuestion } from "./document";

export const DOCUMENT_PATCH_SCHEMA_VERSION = 1 as const;

export type DocumentPatchMetadata = {
  reason: string;
  recordedAt: string;
  sourceIds: string[];
  runRecordedAt?: string;
  model?: string;
  provider?: string;
};

export type DocumentPatchOperation =
  | ({ op: "add_finding"; finding: DocumentFinding } & DocumentPatchMetadata)
  | ({ op: "update_finding"; findingId: string; title?: string; detail?: string } & DocumentPatchMetadata)
  | ({ op: "retract_finding"; findingId: string } & DocumentPatchMetadata)
  | ({ op: "add_evidence"; findingId: string } & DocumentPatchMetadata)
  | ({ op: "set_confidence"; findingId: string; confidence: ConfidenceBand } & DocumentPatchMetadata)
  | ({ op: "add_contradiction"; findingId: string; detail: string } & DocumentPatchMetadata)
  | ({ op: "add_open_question"; question: OpenQuestion } & DocumentPatchMetadata)
  | ({ op: "resolve_open_question"; questionId: string } & DocumentPatchMetadata)
  | ({ op: "update_section_summary"; sectionId: string; summary: string } & DocumentPatchMetadata);

export type DocumentPatch = {
  schemaVersion: typeof DOCUMENT_PATCH_SCHEMA_VERSION;
  gardenSlug: string;
  fromVersion: number;
  toVersion: number;
  operations: DocumentPatchOperation[];
};

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validMetadata(item: Record<string, unknown>) {
  return nonEmpty(item.reason)
    && nonEmpty(item.recordedAt)
    && Array.isArray(item.sourceIds)
    && item.sourceIds.every((sourceId) => nonEmpty(sourceId));
}

function validFinding(value: unknown): value is DocumentFinding {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const finding = value as Record<string, unknown>;
  return nonEmpty(finding.id) && nonEmpty(finding.title) && typeof finding.detail === "string"
    && (finding.confidence === "high" || finding.confidence === "medium" || finding.confidence === "low")
    && (finding.status === "current" || finding.status === "contested" || finding.status === "retracted")
    && Array.isArray(finding.sourceIds) && finding.sourceIds.every((sourceId) => nonEmpty(sourceId));
}

function validQuestion(value: unknown): value is OpenQuestion {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const question = value as Record<string, unknown>;
  return nonEmpty(question.id) && nonEmpty(question.question)
    && (question.status === "open" || question.status === "resolved")
    && Array.isArray(question.sourceIds) && question.sourceIds.every((sourceId) => nonEmpty(sourceId));
}

function validOperation(operation: unknown): operation is DocumentPatchOperation {
  if (!operation || typeof operation !== "object" || Array.isArray(operation)) return false;
  const item = operation as Record<string, unknown>;
  if (!validMetadata(item) || !nonEmpty(item.op)) return false;
  switch (item.op) {
    case "add_finding": return validFinding(item.finding);
    case "update_finding": return nonEmpty(item.findingId) && (nonEmpty(item.title) || nonEmpty(item.detail));
    case "retract_finding":
    case "add_evidence": return nonEmpty(item.findingId);
    case "set_confidence": return nonEmpty(item.findingId) && (item.confidence === "high" || item.confidence === "medium" || item.confidence === "low");
    case "add_contradiction": return nonEmpty(item.findingId) && nonEmpty(item.detail);
    case "add_open_question": return validQuestion(item.question);
    case "resolve_open_question": return nonEmpty(item.questionId);
    case "update_section_summary": return nonEmpty(item.sectionId) && nonEmpty(item.summary);
    default: return false;
  }
}

export function isDocumentPatch(value: unknown): value is DocumentPatch {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const patch = value as Partial<DocumentPatch>;
  if (patch.schemaVersion !== DOCUMENT_PATCH_SCHEMA_VERSION || !nonEmpty(patch.gardenSlug)) return false;
  if (!Number.isInteger(patch.fromVersion) || !Number.isInteger(patch.toVersion) || (patch.toVersion ?? 0) !== (patch.fromVersion ?? 0) + 1) return false;
  return Array.isArray(patch.operations) && patch.operations.length > 0 && patch.operations.every(validOperation);
}
