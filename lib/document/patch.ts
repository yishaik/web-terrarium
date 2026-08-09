import type { DocumentChange, LivingDocument } from "../../shared/document.ts";
import { DOCUMENT_PATCH_SCHEMA_VERSION, isDocumentPatch, type DocumentPatch, type DocumentPatchOperation } from "../../shared/document-patch.ts";

export class DocumentPatchError extends Error {}

function validateSources(document: LivingDocument, sourceIds: string[]) {
  const known = new Set(document.sourceRefs.map((source) => source.id));
  const unknown = sourceIds.filter((sourceId) => !known.has(sourceId));
  if (unknown.length) throw new DocumentPatchError(`Patch references unknown evidence: ${unknown.join(", ")}`);
}

function changeFor(operation: DocumentPatchOperation, version: number, label: string, detail: string): DocumentChange {
  return {
    id: `patch-v${version}-${operation.op}-${Math.random().toString(36).slice(2, 9)}`,
    type: operation.op === "retract_finding" ? "retracted"
      : operation.op === "add_contradiction" ? "contested"
        : operation.op === "resolve_open_question" ? "resolved"
          : operation.op === "add_evidence" ? "evidence"
            : operation.op === "add_finding" || operation.op === "add_open_question" ? "added"
              : "updated",
    label,
    detail,
    sourceIds: operation.sourceIds,
    recordedAt: operation.recordedAt,
    fromVersion: version - 1,
  };
}

function deterministicChangeId(change: DocumentChange, index: number) {
  const material = `${change.fromVersion}|${change.type}|${change.label}|${change.recordedAt}|${index}`;
  let hash = 2166136261;
  for (let i = 0; i < material.length; i += 1) {
    hash ^= material.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `change-${(hash >>> 0).toString(36)}`;
}

export function applyDocumentPatch(document: LivingDocument, patch: DocumentPatch): LivingDocument {
  if (!isDocumentPatch(patch)) throw new DocumentPatchError("Patch schema is invalid.");
  if (patch.schemaVersion !== DOCUMENT_PATCH_SCHEMA_VERSION || patch.gardenSlug !== document.gardenSlug) throw new DocumentPatchError("Patch targets a different document.");
  if (patch.fromVersion !== document.documentVersion || patch.toVersion !== document.documentVersion + 1) throw new DocumentPatchError("Patch version does not follow the current document.");

  const next: LivingDocument = structuredClone(document);
  next.documentVersion = patch.toVersion;
  next.generatedAt = patch.operations.at(-1)?.recordedAt ?? document.generatedAt;
  const emitted: DocumentChange[] = [];

  patch.operations.forEach((operation, index) => {
    validateSources(next, operation.sourceIds);

    if (operation.op === "add_finding") {
      validateSources(next, operation.finding.sourceIds);
      if (next.findings.some((finding) => finding.id === operation.finding.id)) throw new DocumentPatchError(`Finding ${operation.finding.id} already exists.`);
      next.findings.push(structuredClone(operation.finding));
      emitted.push(changeFor(operation, patch.toVersion, operation.finding.title, operation.reason));
      return;
    }

    if (operation.op === "add_open_question") {
      validateSources(next, operation.question.sourceIds);
      if (next.openQuestions.some((question) => question.id === operation.question.id)) throw new DocumentPatchError(`Question ${operation.question.id} already exists.`);
      next.openQuestions.push(structuredClone(operation.question));
      emitted.push(changeFor(operation, patch.toVersion, operation.question.question, operation.reason));
      return;
    }

    if (operation.op === "update_section_summary") {
      const section = next.sections.find((candidate) => candidate.id === operation.sectionId);
      if (!section) throw new DocumentPatchError(`Unknown section ${operation.sectionId}.`);
      section.summary = operation.summary;
      emitted.push(changeFor(operation, patch.toVersion, section.title, operation.reason));
      return;
    }

    if (operation.op === "resolve_open_question") {
      const question = next.openQuestions.find((candidate) => candidate.id === operation.questionId);
      if (!question) throw new DocumentPatchError(`Unknown question ${operation.questionId}.`);
      question.status = "resolved";
      question.resolvedAt = operation.recordedAt;
      emitted.push(changeFor(operation, patch.toVersion, question.question, operation.reason));
      return;
    }

    const findingId = "findingId" in operation ? operation.findingId : "";
    const finding = next.findings.find((candidate) => candidate.id === findingId);
    if (!finding) throw new DocumentPatchError(`Unknown finding ${findingId}.`);

    if (operation.op === "update_finding") {
      if (operation.title) finding.title = operation.title;
      if (operation.detail) finding.detail = operation.detail;
      finding.updatedAt = operation.recordedAt;
      emitted.push(changeFor(operation, patch.toVersion, finding.title, operation.reason));
    } else if (operation.op === "retract_finding") {
      finding.status = "retracted";
      finding.updatedAt = operation.recordedAt;
      emitted.push(changeFor(operation, patch.toVersion, finding.title, operation.reason));
    } else if (operation.op === "add_evidence") {
      finding.sourceIds = [...new Set([...finding.sourceIds, ...operation.sourceIds])];
      finding.updatedAt = operation.recordedAt;
      emitted.push(changeFor(operation, patch.toVersion, finding.title, operation.reason));
    } else if (operation.op === "set_confidence") {
      finding.confidence = operation.confidence;
      finding.updatedAt = operation.recordedAt;
      emitted.push(changeFor(operation, patch.toVersion, finding.title, operation.reason));
    } else if (operation.op === "add_contradiction") {
      finding.status = "contested";
      finding.detail = `${finding.detail}\n\nContradiction: ${operation.detail}`;
      finding.sourceIds = [...new Set([...finding.sourceIds, ...operation.sourceIds])];
      finding.updatedAt = operation.recordedAt;
      emitted.push(changeFor(operation, patch.toVersion, finding.title, operation.reason));
    }

    emitted[emitted.length - 1].id = deterministicChangeId(emitted[emitted.length - 1], index);
  });

  next.changes = [...emitted, ...document.changes].slice(0, 48);
  return next;
}
