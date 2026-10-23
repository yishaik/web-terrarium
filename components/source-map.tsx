"use client";

import { useState } from "react";
import type { ResearchRun } from "@/lib/research";

// Coordinates are shared by the SVG branches and the HTML buttons, including
// on narrow screens. Each source has its own position (the API returns six).
const positions = [
  { x: 17, y: 47 }, { x: 30, y: 25 }, { x: 43, y: 48 },
  { x: 56, y: 23 }, { x: 70, y: 46 }, { x: 83, y: 28 },
];

function hostname(url: string) {
  try {
    const parsed = new URL(url);
    return /^https?:$/.test(parsed.protocol) ? parsed.hostname.replace(/^www\./, "") : "";
  } catch { return ""; }
}

export function SourceMap({ run, selected, onSelect, loading }: {
  run: ResearchRun;
  selected: number | null;
  onSelect: (index: number | null) => void;
  loading: boolean;
}) {
  const [showConnections, setShowConnections] = useState(true);
  const sources = run.sources.slice(0, positions.length);
  const active = selected === null ? undefined : sources[selected];
  const activeHost = active ? hostname(active.url) : "";
  const related = activeHost ? sources.flatMap((source, index) =>
    index !== selected && hostname(source.url) === activeHost ? [index] : []) : [];
  const connections = sources.flatMap((source, from) => sources.flatMap((other, to) =>
    to > from && hostname(source.url) && hostname(source.url) === hostname(other.url)
      ? [{ from, to }] : []));

  return <section className="source-explorer" aria-label="Interactive source map" aria-busy={loading}>
    <div className="map-toolbar">
      <div><p className="eyebrow">THE SOURCE GARDEN</p><p>Pick a leaf. Follow a source.</p></div>
      <button type="button" className="connection-toggle" aria-pressed={showConnections}
        onClick={() => setShowConnections((value) => !value)}>Same-site links {showConnections ? "on" : "off"}</button>
    </div>
    <div className={`habitat source-habitat${loading ? " is-growing" : ""}`}>
      <div className="glass-reflection" /><div className="sun" /><div className="soil" />
      <svg className="source-branches" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {sources.map((source, index) => {
          const point = positions[index];
          return <path key={`${source.url}-${index}`} className={selected === index ? "branch-active" : ""}
            d={`M 50 84 Q ${point.x} 73 ${point.x} ${point.y}`} />;
        })}
        {showConnections && connections.map(({ from, to }) => <path key={`${from}-${to}`}
          className={`site-connection${selected === from || selected === to ? " connection-active" : ""}`}
          d={`M ${positions[from].x} ${positions[from].y} Q ${(positions[from].x + positions[to].x) / 2} ${Math.min(positions[from].y, positions[to].y) - 13} ${positions[to].x} ${positions[to].y}`} />)}
      </svg>
      {sources.map((source, index) => <button type="button"
        key={`${source.url}-${index}`} className={`source-leaf${selected === index ? " is-selected" : ""}${related.includes(index) ? " is-related" : ""}`}
        style={{ left: `${positions[index].x}%`, top: `${positions[index].y}%`, animationDelay: `${index * 70}ms` }}
        aria-label={`Source ${index + 1}: ${source.title}`} aria-pressed={selected === index}
        aria-controls="source-inspector" title={source.title} onClick={() => onSelect(index)}>
        <span>{String(index + 1).padStart(2, "0")}</span>
      </button>)}
      <div className="jar-label"><span>{run.mode === "demo" ? "DEMO GARDEN" : "RESEARCH SEED"}</span><strong dir="auto">{run.query}</strong><small>{loading ? "Growing a new reading path…" : `${sources.length} sources · ${run.mode === "live" ? "live web" : "illustrative sources"}`}</small></div>
    </div>
    <div className="map-legend"><span><i className="legend-selected" /> selected source</span><span><i className="legend-connection" /> dashed line = same website</span><span>Connections describe origin, not agreement.</span></div>
    <div id="source-inspector" className={`source-inspector${active ? " has-selection" : ""}`} aria-live="polite" aria-atomic="true">
      {active ? <>
        <div className="inspector-heading"><span className="source-index">{String((selected ?? 0) + 1).padStart(2, "0")}</span><div><p className="eyebrow">{activeHost || "STARTER SEED"}</p><h2 dir="auto">{active.title}</h2></div><button type="button" className="inspector-close" aria-label="Clear source selection" onClick={() => onSelect(null)}>×</button></div>
        <p className="source-excerpt" dir="auto">{active.description}</p>
        <div className="inspector-actions">{activeHost ? <a className="source-open" href={active.url} target="_blank" rel="noreferrer">Read original <span aria-hidden="true">↗</span></a> : <span className="action-note">Plant a question to discover web sources.</span>}
          {related.length > 0 ? <span className="related-sources">Also on this site: {related.map((index) => <button key={index} type="button" onClick={() => onSelect(index)} aria-label={`Select source ${index + 1}`}>{String(index + 1).padStart(2, "0")}</button>)}</span> : <span className="action-note">No other source from this site in this run.</span>}
        </div>
        <small className="excerpt-note">{run.mode === "demo" ? "Illustrative example · " : ""}Source excerpt, not a verified conclusion.</small>
      </> : <div className="inspector-empty"><span aria-hidden="true">↖</span><div><h2>A closer look starts with a leaf.</h2><p>Select any numbered leaf to inspect its excerpt and open the original.</p></div></div>}
    </div>
  </section>;
}
