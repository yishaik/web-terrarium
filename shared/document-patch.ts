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

export function isDocumentPatch(value: unknown): value is DocumentPatch {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const patch = value as Partial<DocumentPatch>;
  if (patch.schemaVersion !== DOCUMENT_PATCH_SCHEMA_VERSION || typeof patch.gardenSlug !== "string") return false;
  if (!Number.isInteger(patch.fromVersion) || !Number.isInteger(patch.toVersion) || (patch.toVersion ?? 0) !== (patch.fromVersion ?? 0) + 1) return false;
  return Array.isArray(patch.operations) && patch.operations.every((operation) => {
    if (!operation || typeof operation !== "object") return false;
    const item = operation as Partial<DocumentPatchOperation> & Record<string, unknown>;
    return typeof item.op === "string"
      && typeof item.reason === "string"
      && item.reason.length > 0
      && typeof item.recordedAt === "string"
      && Array.isArray(item.sourceIds)
      && item.sourceIds.every((sourceId) => typeof sourceId === "string");
  });
}
