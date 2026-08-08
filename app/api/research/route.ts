import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { research, type Provider, type ResearchRun } from "@/lib/research";
import { getGardenResearchContext, workerRequest } from "@/lib/worker";

export const runtime = "nodejs";

function isProvider(value: unknown): value is Provider {
  return value === "fastcrw" || value === "firecrawl";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { query?: unknown; provider?: unknown; gardenSlug?: unknown; contextQuery?: unknown } | null;
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query || query.length > 240) {
    return NextResponse.json({ error: "Enter a research seed of up to 240 characters." }, { status: 400 });
  }
  const provider = isProvider(body?.provider) ? body.provider : "fastcrw";
  const contextQuery = typeof body?.contextQuery === "string" ? body.contextQuery.trim().slice(0, 240) : undefined;
  const gardenSlug = typeof body?.gardenSlug === "string" ? body.gardenSlug : "";
  const aiToken = request.headers.get("x-vercel-oidc-token") || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

  let userId: string | null = null;
  let durableContext: Awaited<ReturnType<typeof getGardenResearchContext>> | null = null;
  if (gardenSlug) {
    ({ userId } = await auth());
    if (!userId) return NextResponse.json({ error: "Sign in to grow a saved garden." }, { status: 401 });
    try {
      durableContext = await getGardenResearchContext(gardenSlug);
      if (durableContext.garden.ownerId !== userId) return NextResponse.json({ error: "This garden belongs to another owner." }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "Could not load this garden's durable memory." }, { status: 503 });
    }
  }

  const run = await research(query, provider, contextQuery, durableContext?.memory, aiToken);
  if (gardenSlug && userId) {
    try {
      const saved = await workerRequest(`/gardens/${encodeURIComponent(gardenSlug)}/runs`, { method: "POST", body: JSON.stringify({ ...run, ownerId: userId }) });
      const payload = await saved.json() as { run?: ResearchRun };
      if (payload.run) return NextResponse.json(payload.run);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Research completed but could not be saved." }, { status: 503 });
    }
  }
  return NextResponse.json(run);
}
