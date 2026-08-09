import { NextResponse } from "next/server";
import { selectContinuousResearchQuery } from "@/lib/continuous-research";
import { syncLivingDocument } from "@/lib/document/sync";
import { research } from "@/lib/research";
import { getActiveGardens, getGardenResearchContext, workerRequest } from "@/lib/worker";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

type RegrowResult = {
  slug: string;
  query?: string;
  status: "grown" | "skipped" | "failed";
  synthesis?: "ai" | "deterministic";
  document?: "updated" | "unchanged" | "unavailable";
  documentVersion?: number;
  error?: string;
};

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batchSize = Math.max(1, Math.min(Number(process.env.CONTINUOUS_RESEARCH_BATCH_SIZE ?? "1") || 1, 3));
  const active = await getActiveGardens(batchSize).catch(() => []);
  const aiToken = request.headers.get("x-vercel-oidc-token") || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  const results: RegrowResult[] = [];

  for (const garden of active) {
    try {
      const context = await getGardenResearchContext(garden.slug);
      if (!context.garden.continuousResearchEnabled) {
        results.push({ slug: garden.slug, status: "skipped" });
        continue;
      }

      const { query } = selectContinuousResearchQuery(
        context.garden.watchlist,
        context.memory.watchTopicCursor,
        context.memory.latestQuery ?? garden.latestQuery,
      );
      if (!query) {
        results.push({ slug: garden.slug, status: "skipped" });
        continue;
      }

      const run = await research(query, "fastcrw", undefined, context.memory, aiToken);
      await workerRequest(`/gardens/${encodeURIComponent(garden.slug)}/runs`, {
        method: "POST",
        body: JSON.stringify({ ...run, ownerId: garden.ownerId, continuousResearch: true }),
      });
      const document = await syncLivingDocument(garden.slug, garden.ownerId);
      results.push({
        slug: garden.slug,
        query,
        status: "grown",
        synthesis: run.brief.aiModel ? "ai" : "deterministic",
        document: document.status,
        documentVersion: document.version,
      });
    } catch (error) {
      results.push({ slug: garden.slug, status: "failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
