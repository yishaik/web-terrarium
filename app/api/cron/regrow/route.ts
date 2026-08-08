import { NextResponse } from "next/server";
import { research } from "@/lib/research";
import { getActiveGardens, getGardenResearchContext, workerRequest } from "@/lib/worker";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batchSize = Math.max(1, Math.min(Number(process.env.CONTINUOUS_RESEARCH_BATCH_SIZE ?? "1") || 1, 3));
  const active = await getActiveGardens(batchSize).catch(() => []);
  const aiToken = request.headers.get("x-vercel-oidc-token") || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  const results: Array<{ slug: string; query?: string; status: "grown" | "skipped" | "failed"; error?: string }> = [];

  for (const garden of active) {
    const query = garden.watchlist?.[0] || garden.latestQuery;
    if (!query) {
      results.push({ slug: garden.slug, status: "skipped" });
      continue;
    }
    try {
      const context = await getGardenResearchContext(garden.slug);
      const run = await research(query, "fastcrw", undefined, context.memory, aiToken);
      await workerRequest(`/gardens/${encodeURIComponent(garden.slug)}/runs`, {
        method: "POST",
        body: JSON.stringify({ ...run, ownerId: garden.ownerId }),
      });
      results.push({ slug: garden.slug, query, status: "grown" });
    } catch (error) {
      results.push({ slug: garden.slug, query, status: "failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
