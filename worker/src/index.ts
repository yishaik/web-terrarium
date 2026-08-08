import { DurableObject } from "cloudflare:workers";
import { getWorkspace, withWorkspace, type DurableObjectStorageLike, type WorkspaceHandle } from "@cloudflare/computer";

type Visibility = "public" | "private";
type Source = { title: string; url: string; description: string; domain: string };
type Brief = { headline: string; summary: string; highlights: Array<{ title: string; detail: string }>; executiveSummary?: { takeaway: string; points: Array<{ title: string; detail: string }> }; newSources?: number };
type Run = { query: string; provider?: "fastcrw" | "firecrawl"; mode?: "live" | "demo"; note?: string; sources: Source[]; brief?: Brief; recordedAt?: string };
type StoredRun = Omit<Run, "recordedAt"> & { recordedAt: string };
type Garden = { slug: string; title: string; ownerId: string; visibility: Visibility; createdAt: string; latestRun?: StoredRun; history?: StoredRun[]; watchlist?: string[] };
type GardenSummary = Pick<Garden, "slug" | "title" | "visibility" | "createdAt" | "watchlist"> & { latestRun?: Pick<StoredRun, "query" | "recordedAt"> };
type Topic = { query: string; count: number; lastSeen: string };
type Share = { id: string; run: StoredRun; createdAt: string };

interface Env { AGENT_WORKSPACE: DurableObjectNamespace; INTERNAL_TOKEN: string; }

export class AgentWorkspace extends withWorkspace(
  class extends DurableObject {},
  (self) => ({ storage: (self as unknown as { ctx: DurableObjectState }).ctx.storage as unknown as DurableObjectStorageLike }),
) {}

function allowedSlug(slug: string) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 45; }
function unauthorized() { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

async function readGarden(workspace: Awaited<ReturnType<typeof getWorkspace>>): Promise<Garden | null> {
  try { return JSON.parse(await workspace.fs.readFile("/garden.json", "utf8")) as Garden; }
  catch { return null; }
}

async function readGardenIndex(workspace: Awaited<ReturnType<typeof getWorkspace>>): Promise<GardenSummary[]> {
  try { return JSON.parse(await workspace.fs.readFile("/gardens.json", "utf8")) as GardenSummary[]; }
  catch { return []; }
}

async function updateGardenIndex(env: Env, garden: Garden) {
  const id = env.AGENT_WORKSPACE.idFromName(`owner:${garden.ownerId}`);
  using workspace = await getWorkspace(env.AGENT_WORKSPACE.get(id) as WorkspaceHandle);
  const gardens = await readGardenIndex(workspace);
  const summary: GardenSummary = { slug: garden.slug, title: garden.title, visibility: garden.visibility, createdAt: garden.createdAt, watchlist: garden.watchlist ?? [], latestRun: garden.latestRun ? { query: garden.latestRun.query, recordedAt: garden.latestRun.recordedAt } : undefined };
  const position = gardens.findIndex((entry) => entry.slug === garden.slug);
  if (position === -1) gardens.unshift(summary); else gardens[position] = summary;
  await workspace.fs.writeFile("/gardens.json", JSON.stringify(gardens));
}

async function readTopics(workspace: Awaited<ReturnType<typeof getWorkspace>>): Promise<Topic[]> {
  try { return JSON.parse(await workspace.fs.readFile("/topics.json", "utf8")) as Topic[]; }
  catch { return []; }
}

async function recordTopic(env: Env, query: string) {
  const id = env.AGENT_WORKSPACE.idFromName("public-topics");
  using workspace = await getWorkspace(env.AGENT_WORKSPACE.get(id) as WorkspaceHandle);
  const topics = await readTopics(workspace);
  const normalized = query.trim().toLowerCase();
  const existing = topics.find((topic) => topic.query.toLowerCase() === normalized);
  if (existing) { existing.count += 1; existing.lastSeen = new Date().toISOString(); }
  else topics.push({ query: query.slice(0, 120), count: 1, lastSeen: new Date().toISOString() });
  topics.sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen));
  await workspace.fs.writeFile("/topics.json", JSON.stringify(topics.slice(0, 40)));
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return Response.json({ ok: true });
    const segments = url.pathname.split("/").filter(Boolean);
    if (request.method === "GET" && url.pathname === "/topics") {
      const id = env.AGENT_WORKSPACE.idFromName("public-topics");
      using workspace = await getWorkspace(env.AGENT_WORKSPACE.get(id) as WorkspaceHandle);
      return Response.json({ topics: (await readTopics(workspace)).slice(0, 8) });
    }
    if (segments[0] === "shares") {
      const shareId = segments[1];
      if (!shareId || !/^[a-z0-9-]{8,64}$/.test(shareId)) return Response.json({ error: "Not found" }, { status: 404 });
      if (request.method === "GET" && segments.length === 2) {
        const id = env.AGENT_WORKSPACE.idFromName(`share:${shareId}`);
        using workspace = await getWorkspace(env.AGENT_WORKSPACE.get(id) as WorkspaceHandle);
        try { return Response.json(JSON.parse(await workspace.fs.readFile("/share.json", "utf8")) as Share); }
        catch { return Response.json({ error: "Not found" }, { status: 404 }); }
      }
      if (request.method === "POST" && segments.length === 2) {
        if (request.headers.get("x-internal-token") !== env.INTERNAL_TOKEN) return unauthorized();
        const input = await request.json() as Partial<Share>;
        if (!input.run || !input.run.query || !Array.isArray(input.run.sources)) return Response.json({ error: "Invalid share" }, { status: 400 });
        const id = env.AGENT_WORKSPACE.idFromName(`share:${shareId}`);
        using workspace = await getWorkspace(env.AGENT_WORKSPACE.get(id) as WorkspaceHandle);
        const share: Share = { id: shareId, createdAt: new Date().toISOString(), run: { ...input.run, query: input.run.query.slice(0, 240), sources: input.run.sources.slice(0, 12), recordedAt: input.run.recordedAt ?? new Date().toISOString() } };
        await workspace.fs.writeFile("/share.json", JSON.stringify(share));
        await recordTopic(env, share.run.query);
        return Response.json(share, { status: 201 });
      }
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (segments[0] === "owners" && request.method === "GET" && segments.length === 3 && segments[2] === "gardens") {
      if (request.headers.get("x-internal-token") !== env.INTERNAL_TOKEN) return unauthorized();
      const id = env.AGENT_WORKSPACE.idFromName(`owner:${segments[1]}`);
      using workspace = await getWorkspace(env.AGENT_WORKSPACE.get(id) as WorkspaceHandle);
      return Response.json({ gardens: await readGardenIndex(workspace) });
    }
    const slug = segments[1];
    if (segments[0] !== "gardens" || (slug && !allowedSlug(slug))) return Response.json({ error: "Not found" }, { status: 404 });
    const isPublicRead = request.method === "GET" && Boolean(slug) && segments.length === 2;
    if (!isPublicRead && request.headers.get("x-internal-token") !== env.INTERNAL_TOKEN) return unauthorized();

    if (request.method === "POST" && segments.length === 1) {
      const input = await request.json() as Partial<Garden>;
      if (!input.slug || !allowedSlug(input.slug) || !input.title || !input.ownerId) return Response.json({ error: "Invalid garden" }, { status: 400 });
      const id = env.AGENT_WORKSPACE.idFromName(`garden:${input.slug}`);
      using workspace = await getWorkspace(env.AGENT_WORKSPACE.get(id) as WorkspaceHandle);
      if (await readGarden(workspace)) return Response.json({ error: "That garden URL is already taken." }, { status: 409 });
      const garden: Garden = { slug: input.slug, title: input.title.slice(0, 80), ownerId: input.ownerId, visibility: input.visibility === "private" ? "private" : "public", createdAt: new Date().toISOString(), history: [], watchlist: [] };
      await workspace.fs.writeFile("/garden.json", JSON.stringify(garden));
      await updateGardenIndex(env, garden);
      return Response.json(garden, { status: 201 });
    }

    if (!slug) return Response.json({ error: "Not found" }, { status: 404 });
    const id = env.AGENT_WORKSPACE.idFromName(`garden:${slug}`);
    using workspace = await getWorkspace(env.AGENT_WORKSPACE.get(id) as WorkspaceHandle);
    const garden = await readGarden(workspace);
    if (!garden) return Response.json({ error: "Not found" }, { status: 404 });

    if (isPublicRead) {
      if (garden.visibility !== "public") return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json(garden);
    }

    if (request.method === "PATCH" && segments.length === 2) {
      const input = await request.json() as { ownerId?: string; visibility?: Visibility };
      if (!input.ownerId || input.ownerId !== garden.ownerId) return Response.json({ error: "Forbidden" }, { status: 403 });
      garden.visibility = input.visibility === "private" ? "private" : "public";
      await workspace.fs.writeFile("/garden.json", JSON.stringify(garden));
      await updateGardenIndex(env, garden);
      return Response.json(garden);
    }

    if (request.method === "POST" && segments[2] === "runs" && segments.length === 3) {
      const input = await request.json() as Run & { ownerId?: string };
      if (!input.ownerId || input.ownerId !== garden.ownerId || !input.query || !Array.isArray(input.sources)) return Response.json({ error: "Invalid run" }, { status: 400 });
      const previousUrls = new Set(garden.latestRun?.sources.map((source) => source.url) ?? []);
      const newSources = input.sources.filter((source) => !previousUrls.has(source.url)).length;
      const run: StoredRun = { query: input.query.slice(0, 240), provider: input.provider, mode: input.mode, note: input.note, sources: input.sources.slice(0, 12), brief: input.brief ? { ...input.brief, newSources } : undefined, recordedAt: new Date().toISOString() };
      await workspace.fs.mkdir("/runs", { recursive: true });
      await workspace.fs.writeFile(`/runs/${crypto.randomUUID()}.json`, JSON.stringify(run));
      garden.latestRun = run;
      garden.history = [run, ...(garden.history ?? [])].slice(0, 12);
      await workspace.fs.writeFile("/garden.json", JSON.stringify(garden));
      await updateGardenIndex(env, garden);
      if (garden.visibility === "public") await recordTopic(env, run.query);
      return Response.json({ ok: true, run });
    }

    if (request.method === "POST" && segments[2] === "watchlist" && segments.length === 3) {
      const input = await request.json() as { ownerId?: string; query?: string };
      const query = input.query?.trim();
      if (!input.ownerId || input.ownerId !== garden.ownerId || !query || query.length > 240) return Response.json({ error: "Invalid watch topic" }, { status: 400 });
      const current = garden.watchlist ?? [];
      garden.watchlist = current.includes(query) ? current : [query, ...current].slice(0, 12);
      await workspace.fs.writeFile("/garden.json", JSON.stringify(garden));
      await updateGardenIndex(env, garden);
      return Response.json({ watchlist: garden.watchlist });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
