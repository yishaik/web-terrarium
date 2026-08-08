export type Visibility = "public" | "private";

export type Garden = {
  slug: string;
  title: string;
  ownerId: string;
  visibility: Visibility;
  createdAt: string;
  latestRun?: StoredRun;
  history?: StoredRun[];
  watchlist?: string[];
};

export type StoredRun = {
  query: string;
  provider?: "fastcrw" | "firecrawl";
  mode?: "live" | "demo";
  note?: string;
  sources: Array<{ title: string; url: string; description: string; domain: string }>;
  brief?: { headline: string; summary: string; highlights: Array<{ title: string; detail: string }>; executiveSummary?: { takeaway: string; points: Array<{ title: string; detail: string }> }; newSources?: number };
  recordedAt: string;
};

export type GardenSummary = Pick<Garden, "slug" | "title" | "visibility" | "createdAt" | "watchlist"> & { latestRun?: Pick<StoredRun, "query" | "recordedAt"> };

export type PopularTopic = { query: string; count: number; lastSeen: string };

function workerBase() {
  const url = process.env.AGENT_WORKER_URL;
  const token = process.env.AGENT_WORKER_TOKEN;
  if (!url || !token) throw new Error("Garden storage has not been deployed yet.");
  return { url: url.replace(/\/$/, ""), token };
}

export async function workerRequest(path: string, init: RequestInit = {}) {
  const { url, token } = workerBase();
  const headers = new Headers(init.headers);
  headers.set("x-internal-token", token);
  if (init.body) headers.set("content-type", "application/json");
  const response = await fetch(`${url}${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Garden storage returned ${response.status}`);
  return response;
}

export async function getPublicGarden(slug: string): Promise<Garden | null> {
  const url = process.env.AGENT_WORKER_URL;
  if (!url) return null;
  const response = await fetch(`${url.replace(/\/$/, "")}/gardens/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not load this garden.");
  return response.json() as Promise<Garden>;
}

export async function getOwnerGardens(ownerId: string): Promise<GardenSummary[]> {
  const response = await workerRequest(`/owners/${encodeURIComponent(ownerId)}/gardens`);
  const payload = await response.json() as { gardens?: GardenSummary[] };
  return payload.gardens ?? [];
}

export async function getPopularTopics(): Promise<PopularTopic[]> {
  const url = process.env.AGENT_WORKER_URL;
  if (!url) return [];
  const response = await fetch(`${url.replace(/\/$/, "")}/topics`, { cache: "no-store" });
  if (!response.ok) return [];
  const payload = await response.json() as { topics?: PopularTopic[] };
  return payload.topics ?? [];
}

export async function getSharedRun(id: string): Promise<{ id: string; run: StoredRun; createdAt: string } | null> {
  const url = process.env.AGENT_WORKER_URL;
  if (!url) return null;
  const response = await fetch(`${url.replace(/\/$/, "")}/shares/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not load this shared research.");
  return response.json() as Promise<{ id: string; run: StoredRun; createdAt: string }>;
}
