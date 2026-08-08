"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Provider, ResearchRun } from "@/lib/research";
import { AccountControls } from "@/components/account-controls";

type Topic = { query: string; count: number; lastSeen: string };
type Panel = "brief" | "recent" | "popular";

const starter: ResearchRun = {
  query: "AI video tools", provider: "fastcrw", mode: "demo",
  note: "Your first three seeds are waiting. Give the garden a question.",
  brief: { headline: "A small garden is ready", summary: "Plant a question to get a focused reading path and a living map of its sources.", highlights: [] },
  sources: [
    { title: "Plant a research seed", url: "#", description: "Ask a question or paste a URL to begin.", domain: "your terrarium" },
    { title: "Watch the ecosystem react", url: "#", description: "Every source becomes a living node in your map.", domain: "living interface" },
    { title: "Let an agent keep the field notes", url: "#", description: "Cloudflare Computer preserves each saved run in a durable workspace.", domain: "agent memory" },
  ],
};

function leafClass(index: number, source: ResearchRun["sources"][number], fresh: number | undefined) {
  const strong = /github\.com|docs\.|arxiv\.org|openai\.com|cloudflare\.com|vercel\.com/.test(source.domain);
  return `leaf leaf-${(index % 5) + 1} ${strong ? "leaf-strong" : "leaf-soft"} ${fresh && index < fresh ? "leaf-fresh" : ""}`;
}

function formatWhen(value?: string) {
  if (!value) return "just now";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

export default function Home() {
  return <Suspense fallback={<main />}><Terrarium /></Suspense>;
}

function Terrarium() {
  const searchParams = useSearchParams();
  const gardenSlug = searchParams.get("garden") ?? "";
  const [query, setQuery] = useState(searchParams.get("seed") ?? starter.query);
  const [provider, setProvider] = useState<Provider>("fastcrw");
  const [run, setRun] = useState<ResearchRun>(starter);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<Panel>("brief");
  const [recent, setRecent] = useState<ResearchRun[]>([]);
  const [popular, setPopular] = useState<Topic[]>([]);
  const [shareState, setShareState] = useState<"idle" | "sharing" | "copied">("idle");
  const [watchState, setWatchState] = useState("");

  const canopy = useMemo(() => run.sources.slice(0, 6), [run.sources]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("web-terrarium:recent") ?? "[]") as ResearchRun[];
      if (Array.isArray(saved)) setRecent(saved.slice(0, 8));
    } catch { /* Recent searches are a convenience, never a blocker. */ }
    fetch("/api/topics").then((response) => response.json()).then((payload: { topics?: Topic[] }) => setPopular(payload.topics ?? [])).catch(() => undefined);
  }, []);

  function remember(nextRun: ResearchRun) {
    setRecent((current) => {
      const next = [nextRun, ...current.filter((item) => item.query.toLowerCase() !== nextRun.query.toLowerCase())].slice(0, 8);
      localStorage.setItem("web-terrarium:recent", JSON.stringify(next));
      return next;
    });
  }

  async function plant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(""); setWatchState(""); setShareState("idle");
    try {
      const response = await fetch("/api/research", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, provider, gardenSlug: gardenSlug || undefined }) });
      const payload = await response.json() as ResearchRun & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not plant this seed.");
      setRun(payload); remember(payload); setPanel("brief");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not plant this seed."); }
    finally { setLoading(false); }
  }

  async function shareRun() {
    setShareState("sharing"); setError("");
    try {
      const response = await fetch("/api/shares", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ run }) });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "Could not create a share link.");
      await navigator.clipboard.writeText(payload.url);
      setShareState("copied");
      fetch("/api/topics").then((item) => item.json()).then((item: { topics?: Topic[] }) => setPopular(item.topics ?? [])).catch(() => undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create a share link."); setShareState("idle"); }
  }

  async function watchTopic() {
    if (!gardenSlug) return;
    setWatchState("Saving...");
    const response = await fetch(`/api/terrariums/${gardenSlug}/watchlist`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: run.query }) });
    const payload = await response.json() as { error?: string };
    setWatchState(response.ok ? "Following this topic in your garden." : payload.error ?? "Could not follow this topic.");
  }

  return <main>
    <nav className="top-nav"><a className="wordmark" href="/">WT</a><div><span className="nav-caption">PUBLIC RESEARCH GARDENS</span><AccountControls /></div></nav>
    <section className="hero">
      <p className="eyebrow">PERSONAL RESEARCH HABITAT · V0.2</p>
      <h1>Web<br /><em>Terrarium</em></h1>
      <p className="intro">A quiet, living place for web research. Plant a curiosity and let it grow into a brief, a source map, and a trail you can return to.</p>
      {gardenSlug && <p className="garden-context">Growing into public garden: <strong>{gardenSlug}</strong></p>}
      <form onSubmit={plant} className="seed-form">
        <label htmlFor="seed">What should grow here?</label>
        <div className="form-row"><input id="seed" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="AI video tools, a URL, or any question" maxLength={240} /><select aria-label="Crawler" value={provider} onChange={(event) => setProvider(event.target.value as Provider)}><option value="fastcrw">fastCRW</option><option value="firecrawl">Firecrawl</option></select><button type="submit" disabled={loading}>{loading ? "Growing..." : "Plant seed"}</button></div>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
    </section>

    <section className="habitat" aria-label="Research terrarium">
      <div className="glass-reflection" /><div className="sun" /><div className="soil" /><div className="stem stem-a" /><div className="stem stem-b" /><div className="stem stem-c" />
      {canopy.map((source, index) => <div className={leafClass(index, source, run.brief.newSources)} key={`${source.url}-${index}`} title={`${source.domain}${run.brief.newSources && index < run.brief.newSources ? " · new since last run" : ""}`}><span>{index + 1}</span></div>)}
      <div className="creature" aria-hidden="true">●</div>
      <div className="jar-label"><span>SEED</span><strong>{run.query}</strong><small>{run.sources.length} sources · {run.mode === "live" ? "live web" : "starter habitat"}</small></div>
    </section>
    <div className="ecosystem-key"><span><i className="key-fresh" /> new branch</span><span><i className="key-strong" /> primary / technical source</span><span><i className="key-soft" /> discovered source</span></div>

    <section className="field-notes">
      <div className="notes-heading"><div><p className="eyebrow">FIELD NOTES</p><div className="panel-tabs" role="tablist"><button className={panel === "brief" ? "active" : ""} onClick={() => setPanel("brief")} type="button">Reading guide</button><button className={panel === "recent" ? "active" : ""} onClick={() => setPanel("recent")} type="button">Recent</button><button className={panel === "popular" ? "active" : ""} onClick={() => setPanel("popular")} type="button">Popular</button></div></div><p>{run.note}</p></div>
      {panel === "brief" && <>
        <section className="research-brief"><div><p className="eyebrow">WHAT MATTERS</p><h2>{run.brief.headline}</h2><p>{run.brief.summary}</p></div><div className="brief-status">{run.brief.newSources !== undefined ? <><strong>{run.brief.newSources}</strong><span>new since your previous grow</span></> : <><strong>{run.sources.length}</strong><span>sources ready to explore</span></>}</div></section>
        <div className="run-actions"><button type="button" className="secondary-button" onClick={() => void shareRun()} disabled={shareState === "sharing"}>{shareState === "copied" ? "Link copied" : shareState === "sharing" ? "Creating link..." : "Share this result"}</button>{gardenSlug && <button type="button" className="text-button" onClick={() => void watchTopic()}>Follow this topic</button>}{watchState && <span className="action-note">{watchState}</span>}</div>
        <ol className="source-list">{run.sources.map((source, index) => <li key={`${source.url}-${index}`}><span className="number">0{index + 1}</span><div><a href={source.url} target={source.url === "#" ? undefined : "_blank"} rel="noreferrer">{source.title}</a><p>{source.description}</p></div><span className="domain">{source.domain}</span></li>)}</ol>
      </>}
      {panel === "recent" && <div className="discovery-list">{recent.length ? recent.map((item, index) => <button type="button" onClick={() => { setQuery(item.query); setRun(item); setPanel("brief"); }} key={`${item.query}-${index}`}><span>{item.query}</span><small>{item.sources.length} sources · {formatWhen(item.recordedAt)}</small></button>) : <p className="empty-state">Your recent seeds will gather here on this device.</p>}</div>}
      {panel === "popular" && <div className="discovery-list">{popular.length ? popular.map((topic) => <button type="button" onClick={() => setQuery(topic.query)} key={topic.query}><span>{topic.query}</span><small>{topic.count} public grows · {formatWhen(topic.lastSeen)}</small></button>) : <p className="empty-state">Popular public topics will appear as gardens start growing.</p>}</div>}
    </section>
    <footer><span>fastCRW / Firecrawl → fresh web</span><span>Cloudflare Computer → agent memory</span><span>Vercel → garden window</span></footer>
  </main>;
}
