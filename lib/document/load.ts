import { compileLivingDocument } from "./compile.ts";
import { getPublicGarden, getPublicLivingDocument } from "../worker.ts";
import type { LivingDocument } from "../../shared/document.ts";

export type LoadedLivingDocument = {
  document: LivingDocument;
  persisted: boolean;
};

export async function loadPublicLivingDocument(slug: string): Promise<LoadedLivingDocument | null> {
  try {
    const persisted = await getPublicLivingDocument(slug);
    if (persisted) return { document: persisted, persisted: true };
  } catch {
    // Older Worker deployments may not expose the document endpoint yet.
    // The Garden remains the source of truth, so rebuild locally instead of failing the page.
  }

  const garden = await getPublicGarden(slug);
  if (!garden) return null;
  return { document: compileLivingDocument(garden), persisted: false };
}
