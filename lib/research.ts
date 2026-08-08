export type Provider = "fastcrw" | "firecrawl";

export type ResearchSource = {
  title: string;
  url: string;
  description: string;
  domain: string;
};

export type ResearchBrief = {
  headline: string;
  summary: string;
  highlights: Array<{ title: string; detail: string }>;
  executiveSummary: {
    takeaway: string;
    points: Array<{ title: string; detail: string }>;
  };
  newSources?: number;
};

export type ResearchRun = {
  query: string;
  provider: Provider;
  sources: ResearchSource[];
  mode: "live" | "demo";
  note: string;
  brief: ResearchBrief;
  contextQuery?: string;
  recordedAt?: string;
};

const demoSources: ResearchSource[] = [
  {
    title: "The seed is ready for a live crawl",
    url: "https://fastcrw.com",
    description: "Add a crawler API key to turn this terrarium into a live research habitat.",
    domain: "fastcrw.com",
  },
  {
    title: "Give the agent a durable memory",
    url: "https://github.com/cloudflare/computer",
    description: "Every research run can be written to a small persistent workspace.",
    domain: "github.com",
  },
  {
    title: "A calm place to inspect discoveries",
    url: "https://vercel.com",
    description: "The interface is designed to be deployed as a Vercel app.",
    domain: "vercel.com",
  },
];

function buildBrief(query: string, sources: ResearchSource[]): ResearchBrief {
  const domains = [...new Set(sources.map((source) => source.domain))].slice(0, 3);
  const points = sources.slice(0, 3).map((source) => ({ title: source.title, detail: source.description }));
  return {
    headline: `${sources.length} signals for ${query}`,
    summary: `A focused reading path across ${domains.join(", ") || "the open web"}. Start with the first source, then follow the branches that match your question.`,
    highlights: points,
    executiveSummary: {
      takeaway: `What you need to know: the strongest current signal comes from ${domains.join(", ") || "these sources"}. Read the key points below first, then use a follow-up question to narrow the decision or uncertainty that matters to you.`,
      points,
    },
  };
}

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

function cleanText(value: string) {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|nbsp|quot|#39);/g, (entity) => ({ "&amp;": "&", "&nbsp;": " ", "&quot;": '"', "&#39;": "'" })[entity] ?? " ")
    .replace(/^[#>*\-]+\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(value: string, limit: number) {
  const text = cleanText(value);
  if (text.length <= limit) return text;
  const boundary = text.slice(0, limit + 1).lastIndexOf(" ");
  return `${text.slice(0, boundary > 80 ? boundary : limit).trimEnd()}…`;
}

function normalize(item: Record<string, unknown>): ResearchSource | null {
  const url = typeof item.url === "string" ? item.url : typeof item.sourceURL === "string" ? item.sourceURL : "";
  if (!url) return null;
  const rawTitle = typeof item.title === "string" ? item.title : typeof item.metadata === "object" && item.metadata && typeof (item.metadata as Record<string, unknown>).title === "string" ? (item.metadata as Record<string, unknown>).title as string : domainOf(url);
  const rawDescription = typeof item.description === "string"
    ? item.description
    : typeof item.snippet === "string"
      ? item.snippet
      : typeof item.markdown === "string"
        ? item.markdown
        : typeof item.content === "string"
          ? item.content
          : "A source discovered during this research run.";
  const title = excerpt(rawTitle, 100) || domainOf(url);
  const description = excerpt(rawDescription, 230) || "A source discovered during this research run.";
  return { title, url, description, domain: domainOf(url) };
}

async function searchFastcrw(query: string): Promise<ResearchSource[]> {
  const key = process.env.CRW_API_KEY;
  if (!key) throw new Error("CRW_API_KEY is not configured");
  const base = process.env.CRW_API_URL ?? "https://api.fastcrw.com";
  const response = await fetch(`${base.replace(/\/$/, "")}/v1/search`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ query, limit: 6, sources: ["web"] }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`fastCRW returned ${response.status}`);
  const payload = await response.json() as { data?: { web?: Record<string, unknown>[] } | Record<string, unknown>[]; web?: Record<string, unknown>[] };
  const candidates = Array.isArray(payload.data) ? payload.data : payload.data?.web ?? payload.web ?? [];
  return candidates.map(normalize).filter((source): source is ResearchSource => source !== null).slice(0, 6);
}

async function searchFirecrawl(query: string): Promise<ResearchSource[]> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is not configured");
  const response = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ query, limit: 6, sources: ["web"] }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Firecrawl returned ${response.status}`);
  const payload = await response.json() as { data?: { web?: Record<string, unknown>[] } | Record<string, unknown>[]; web?: Record<string, unknown>[] };
  const candidates = Array.isArray(payload.data) ? payload.data : payload.data?.web ?? payload.web ?? [];
  return candidates.map(normalize).filter((source): source is ResearchSource => source !== null).slice(0, 6);
}

export async function research(query: string, provider: Provider, contextQuery?: string): Promise<ResearchRun> {
  const searchQuery = contextQuery ? `${contextQuery} Follow-up question: ${query}`.slice(0, 480) : query;
  const briefTopic = contextQuery ? `${contextQuery}: ${query}` : query;
  try {
    const sources = provider === "fastcrw" ? await searchFastcrw(searchQuery) : await searchFirecrawl(searchQuery);
    if (!sources.length) throw new Error("No sources found");
    return { query, contextQuery, provider, sources, mode: "live", note: contextQuery ? `Follow-up research for ${contextQuery} just entered the terrarium.` : "Fresh web results just entered the terrarium.", brief: buildBrief(briefTopic, sources) };
  } catch (error) {
    const missingKey = error instanceof Error && error.message.includes("not configured");
    return {
      query,
      contextQuery,
      provider,
      sources: demoSources,
      mode: "demo",
      note: missingKey ? `Demo habitat: add the ${provider === "fastcrw" ? "CRW_API_KEY" : "FIRECRAWL_API_KEY"} environment variable for a live crawl.` : "The crawler was unavailable, so the habitat is showing its starter seeds.",
      brief: buildBrief(briefTopic, demoSources),
    };
  }
}
