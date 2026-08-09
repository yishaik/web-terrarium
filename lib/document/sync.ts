import { compileLivingDocument } from "./compile.ts";
import { isMeaningfulDocumentChange } from "./diff.ts";
import { getGardenState, getLivingDocument, putLivingDocument } from "../worker.ts";

export type DocumentSyncResult = {
  status: "updated" | "unchanged" | "unavailable";
  version?: number;
  error?: string;
};

export async function syncLivingDocument(slug: string, ownerId: string): Promise<DocumentSyncResult> {
  try {
    const [state, previous] = await Promise.all([
      getGardenState(slug),
      getLivingDocument(slug).catch(() => null),
    ]);
    if (state.garden.ownerId !== ownerId) return { status: "unavailable", error: "Garden ownership changed." };
    const next = compileLivingDocument(state.garden, previous);
    if (previous && !isMeaningfulDocumentChange(previous, next)) return { status: "unchanged", version: previous.documentVersion };
    if (previous && next.documentVersion === previous.documentVersion) return { status: "unchanged", version: previous.documentVersion };
    const stored = await putLivingDocument(slug, ownerId, next);
    return { status: "updated", version: stored.documentVersion };
  } catch (error) {
    return { status: "unavailable", error: error instanceof Error ? error.message : "Document synchronization failed." };
  }
}
