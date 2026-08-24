"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import type { Provider, ResearchRun } from "@/lib/research";
import { mapBriefToSources } from "@/lib/source-map";
import { AccountControls } from "@/components/account-controls";

type Topic = { query: string; count: number; lastSeen: string };
type Panel = "brief" | "recent" | "popular";

const starter: ResearchRun = {
  query: "AI video tools", provider: "fastcrw", mode: "demo",
  note: "Your first three seeds are waiting. Give the garden a question.",
  brief: { headline: "A small garden is ready", summary: "Plant a question to get a focused reading path and a living map of its sources.", highlights: [], executiveSummary: { takeaway: "Your executive summary will appear here after the first grow, grounded in the sources the terrarium finds.", points: [] } },
  sources: [
    { title: "Plant a research seed", url: "#", description: "Ask a question or paste a URL to begin.", domain: "your terrarium" },
    { title: "Watch the ecosystem react", url: "#", description: "Every source becomes a living node in your map.", domain: "living interface" },
    { title: "Let an agent keep the field notes", url: "#", description: "Cloudflare Computer preserves each saved run in a durable workspace.", domain: "agent memory" },
  ],
};

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
  const [followUp, setFollowUp] = useState("");
  const [selectedFinding, setSelectedFinding] = useState(0);

  const findings = useMemo(() => mapBriefToSources(run.brief, run.sources), [run]);
  const activeFinding = findings[Math.min(selectedFinding, Math.max(0, findings.length - 1))];

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("web-terrarium:recent") ?? "[]") as ResearchRun[];
      if (Array.isArray(saved)) setRecent(saved.slice(0, 8));
    } catch { /* Recent searches are a convenience, never a blocker. */ }
    fetch("/api/topics").then((response) => response.json()).then((payload: { topics?: Topic[] }) => setPopular(payload.topics ?? [])).catch(() => undefined);
  }, []);

  useEffect(() => setSelectedFinding(0), [run.query, run.recordedAt]);

  function remember(nextRun: ResearchRun) {
    setRecent((current) => {
      const next = [nextRun, ...current.filter((item) => item.query.toLowerCase() !== nextRun.query.toLowerCase())].slice(0, 8);
      localStorage.setItem("web-terrarium:recent", JSON.stringify(next));
      return next;
    });
  }

  async function grow(nextQuery: string, contextQuery?: string) {
    setLoading(true); setError(""); setWatchState(""); setShareState("idle");
    try {
      const response = await fetch("/api/research", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: nextQuery, provider, gardenSlug: gardenSlug || undefined, contextQuery }) });
      const payload = await response.json() as ResearchRun & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not plant this seed.");
      setQuery(nextQuery); setRun(payload); remember(payload); setPanel("brief");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not plant this seed."); }
    finally { setLoading(false); }
  }

  async function plant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await grow(query);
  }

  async function askFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = followUp.trim();
    if (!question) return;
    setFollowUp("");
    await grow(question, run.contextQuery ?? run.query);
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
      <h1>Web <em>Terrarium</em></h1>
      <p className="intro">A quiet, living place for web research. Plant a curiosity and let it grow into a brief, a source map, and a trail you can return to.</p>
      {gardenSlug && <p className="garden-context">Growing into public garden: <strong>{gardenSlug}</strong></p>}
      <form onSubmit={plant} className="seed-form">
        <label htmlFor="seed">What do you want to understand?</label>
        <div className="form-row"><input id="seed" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask a question, compare options, or paste a URL" maxLength={240} /><select aria-label="Crawler" value={provider} onChange={(event) => setProvider(event.target.value as Provider)}><option value="fastcrw">fastCRW</option><option value="firecrawl">Firecrawl</option></select><button type="submit" disabled={loading}>{loading ? "Growing..." : "Plant research"}</button></div>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
    </section>

    <section className="research-workspace" aria-label="Interactive research map">
      <div className="map-column">
        <div className="map-heading"><div><p className="eyebrow">LIVING SOURCE MAP</p><h2>{run.brief.headline}</h2></div><button type="button" className="reading-link" onClick={() => { setPanel("brief"); document.querySelector(".field-notes")?.scrollIntoView({ behavior: "smooth" }); }}>Open reading brief</button></div>
        <div className="terrarium-map">
          <Image src="/assets/research-terrarium-map.png" alt="A glass terrarium where numbered leaves represent research findings and their sources" width={1619} height={971} priority />
          {findings.map((finding, index) => <button
            key={`${finding.title}-${index}`}
            type="button"
            className={`finding-hotspot finding-hotspot-${index + 1} ${finding.evidenceStatus}${selectedFinding === index ? " active" : ""}`}
            aria-label={`Open finding ${index + 1}: ${finding.title}`}
            aria-pressed={selectedFinding === index}
            onClick={() => setSelectedFinding(index)}
          />)}
        </div>
        <div className="map-legend" aria-label="Evidence status legend"><span><i className="legend-linked" /> evidence linked</span><span><i className="legend-review" /> numeric review needed</span><span><i className="legend-source" /> citation needed</span></div>
      </div>

      <aside className="finding-panel" aria-live="polite">
        {activeFinding ? <>
          <p className="eyebrow">FINDING</p>
          <h2>Finding {Math.min(selectedFinding + 1, findings.length)}</h2>
          <span className={`evidence-state ${activeFinding.evidenceStatus}`}>{activeFinding.evidenceStatus === "review" ? "Check calculation" : activeFinding.evidenceStatus === "linked" ? "Evidence linked" : "Citation needed"}</span>
          <h3>{activeFinding.title}</h3>
          <p className="finding-detail">{activeFinding.detail}</p>
          <details className="kappa-disclosure">
            <summary><span>Kappa judge calibration</span><strong>κ 0.90</strong></summary>
            <div><p><strong>19/20</strong> agreement with frozen human labels on the current calibration set.</p><p>Kappa does not certify this individual claim. It measures whether the automated grounding judge agrees with human review.</p><p className="kappa-warning">Known weakness: numeric calculations still need deterministic validation.</p><a href="https://github.com/yishaik/web-terrarium/tree/main/evals/grounding" target="_blank" rel="noreferrer">See the evaluation cases</a></div>
          </details>
          <section className="finding-source"><p className="eyebrow">PRIMARY SOURCE</p><strong>{activeFinding.sources[0]?.title ?? "No matching citation"}</strong><p>{activeFinding.sources[0]?.description ?? "This synthesized finding was not linked to a supplied source citation. Treat it as unverified until the evidence is repaired."}</p>{activeFinding.sources[0]?.url && activeFinding.sources[0].url !== "#" && <a href={activeFinding.sources[0].url} target="_blank" rel="noreferrer">View source</a>}</section>
          {activeFinding.sources.length > 1 && <section className="related-sources"><p className="eyebrow">OTHER LINKED SOURCES</p>{activeFinding.sources.slice(1, 4).map((source, index) => <div key={`${source.url}-${index}`}><span>{index + 2}</span><p><strong>{source.title}</strong><small>{source.domain}</small></p></div>)}</section>}
          <section className="trust-note"><p className="eyebrow">WHY THIS STATUS</p><p>{activeFinding.evidenceStatus === "uncited" ? "No citation returned by the synthesis layer matches this finding, so the map does not invent a connection." : "The finding is connected only to matching citation URLs returned in this research run. That traceability is separate from automated judge calibration."}</p></section>
        </> : <p>No findings are available yet.</p>}
      </aside>
    </section>

    <section className="field-notes">
      <div className="notes-heading"><div><p className="eyebrow">FIELD NOTES</p><div className="panel-tabs" role="tablist"><button className={panel === "brief" ? "active" : ""} onClick={() => setPanel("brief")} type="button">Reading guide</button><button className={panel === "recent" ? "active" : ""} onClick={() => setPanel("recent")} type="button">Recent</button><button className={panel === "popular" ? "active" : ""} onClick={() => setPanel("popular")} type="button">Popular</button></div></div><p>{run.note}</p></div>
      {panel === "brief" && <>
        <section className="research-brief"><div><p className="eyebrow">WHAT MATTERS</p><h2>{run.brief.headline}</h2><p>{run.brief.summary}</p></div><div className="brief-status">{run.brief.newSources !== undefined ? <><strong>{run.brief.newSources}</strong><span>new since your previous grow</span></> : <><strong>{run.sources.length}</strong><span>sources ready to explore</span></>}</div></section>
        <section className="executive-summary"><p className="eyebrow">EXECUTIVE SUMMARY</p><h3>What you need to know</h3><p>{run.brief.executiveSummary.takeaway}</p>{run.brief.executiveSummary.points.length > 0 && <ol>{run.brief.executiveSummary.points.map((point, index) => <li key={`${point.title}-${index}`}><strong>{point.title}</strong><span>{point.detail}</span></li>)}</ol>}</section>
        <form className="follow-up-form" onSubmit={askFollowUp}><label htmlFor="follow-up">Ask a follow-up question</label><div><input id="follow-up" value={followUp} onChange={(event) => setFollowUp(event.target.value)} placeholder="What matters most for a small team?" maxLength={180} disabled={loading} /><button type="submit" disabled={loading || !followUp.trim()}>{loading ? "Researching..." : "Ask"}</button></div><small>It will research this question in the context of: {run.contextQuery ?? run.query}</small></form>
        <div className="run-actions"><button type="button" className="secondary-button" onClick={() => void shareRun()} disabled={shareState === "sharing"}>{shareState === "copied" ? "Link copied" : shareState === "sharing" ? "Creating link..." : "Share this result"}</button>{gardenSlug && <button type="button" className="text-button" onClick={() => void watchTopic()}>Follow this topic</button>}{watchState && <span className="action-note">{watchState}</span>}</div>
        <ol className="source-list">{run.sources.map((source, index) => <li key={`${source.url}-${index}`}><span className="number">0{index + 1}</span><div><a href={source.url} target={source.url === "#" ? undefined : "_blank"} rel="noreferrer">{source.title}</a><p>{source.description}</p></div><span className="domain">{source.domain}</span></li>)}</ol>
      </>}
      {panel === "recent" && <div className="discovery-list">{recent.length ? recent.map((item, index) => <button type="button" onClick={() => { setQuery(item.query); setRun(item); setPanel("brief"); }} key={`${item.query}-${index}`}><span>{item.query}</span><small>{item.sources.length} sources · {formatWhen(item.recordedAt)}</small></button>) : <p className="empty-state">Your recent seeds will gather here on this device.</p>}</div>}
      {panel === "popular" && <div className="discovery-list">{popular.length ? popular.map((topic) => <button type="button" onClick={() => setQuery(topic.query)} key={topic.query}><span>{topic.query}</span><small>{topic.count} public grows · {formatWhen(topic.lastSeen)}</small></button>) : <p className="empty-state">Popular public topics will appear as gardens start growing.</p>}</div>}
    </section>
    <footer><span>fastCRW / Firecrawl → fresh web</span><span>Cloudflare Computer → agent memory</span><span>Vercel → garden window</span></footer>
  </main>;
}
