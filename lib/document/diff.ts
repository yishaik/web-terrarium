import type { DocumentChange, LivingDocument } from "@/shared/document";

function sameStrings(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function diffLivingDocuments(previous: LivingDocument | null, next: LivingDocument, recordedAt = next.generatedAt): DocumentChange[] {
  if (!previous) {
    return next.findings.slice(0, 8).map((finding) => ({
      id: `change-bootstrap-${finding.id}`,
      type: "added" as const,
      label: finding.title,
      detail: finding.detail,
      sourceIds: finding.sourceIds,
      recordedAt,
    }));
  }

  const changes: DocumentChange[] = [];
  const previousFindings = new Map(previous.findings.map((finding) => [finding.id, finding]));
  const nextFindings = new Map(next.findings.map((finding) => [finding.id, finding]));

  for (const finding of next.findings) {
    const before = previousFindings.get(finding.id);
    if (!before) {
      changes.push({ id: `change-v${next.documentVersion}-add-${finding.id}`, type: "added", label: finding.title, detail: finding.detail, sourceIds: finding.sourceIds, recordedAt, fromVersion: previous.documentVersion });
      continue;
    }
    if (before.status !== finding.status) {
      changes.push({
        id: `change-v${next.documentVersion}-${finding.status}-${finding.id}`,
        type: finding.status === "retracted" ? "retracted" : "contested",
        label: finding.title,
        detail: finding.detail,
        sourceIds: finding.sourceIds,
        recordedAt,
        fromVersion: previous.documentVersion,
      });
      continue;
    }
    if (before.detail !== finding.detail || before.confidence !== finding.confidence) {
      changes.push({ id: `change-v${next.documentVersion}-update-${finding.id}`, type: "updated", label: finding.title, detail: finding.detail, sourceIds: finding.sourceIds, recordedAt, fromVersion: previous.documentVersion });
      continue;
    }
    if (!sameStrings([...before.sourceIds].sort(), [...finding.sourceIds].sort())) {
      changes.push({ id: `change-v${next.documentVersion}-evidence-${finding.id}`, type: "evidence", label: finding.title, detail: "The evidence base for this finding changed.", sourceIds: finding.sourceIds, recordedAt, fromVersion: previous.documentVersion });
    }
  }

  for (const finding of previous.findings) {
    if (!nextFindings.has(finding.id)) {
      changes.push({ id: `change-v${next.documentVersion}-retract-${finding.id}`, type: "retracted", label: finding.title, detail: "This finding is no longer part of the current document projection.", sourceIds: finding.sourceIds, recordedAt, fromVersion: previous.documentVersion });
    }
  }

  const previousQuestions = new Map(previous.openQuestions.map((question) => [question.id, question]));
  for (const question of next.openQuestions) {
    const before = previousQuestions.get(question.id);
    if (before?.status === "open" && question.status === "resolved") {
      changes.push({ id: `change-v${next.documentVersion}-resolved-${question.id}`, type: "resolved", label: question.question, detail: "An open research question was resolved.", sourceIds: question.sourceIds, recordedAt, fromVersion: previous.documentVersion });
    }
  }

  return changes.slice(0, 24);
}

export function isMeaningfulDocumentChange(previous: LivingDocument | null, next: LivingDocument) {
  if (!previous) return true;
  return previous.basedOn.sourceFingerprint !== next.basedOn.sourceFingerprint
    || previous.executiveSummary !== next.executiveSummary
    || diffLivingDocuments(previous, next).length > 0;
}
