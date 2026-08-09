import { notFound } from "next/navigation";
import { loadPublicLivingDocument } from "@/lib/document/load";
import { ExportClient } from "./export-client";

export const dynamic = "force-dynamic";

export default async function LivingDocumentExportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loaded = await loadPublicLivingDocument(slug).catch(() => null);
  if (!loaded) notFound();
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://web-terrarium.vercel.app").replace(/\/$/, "");
  const canonicalUrl = `${base}/g/${encodeURIComponent(slug)}/document`;
  return <ExportClient document={loaded.document} canonicalUrl={canonicalUrl} />;
}
