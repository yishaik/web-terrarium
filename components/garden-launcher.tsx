"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { GardenSummary, Visibility } from "@/lib/worker";

export function GardenLauncher({ initialGardens }: { initialGardens: GardenSummary[] }) {
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gardens, setGardens] = useState(initialGardens);

  async function createGarden(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/terrariums", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, visibility }) });
      const result = await response.json() as { slug?: string; error?: string };
      if (!response.ok || !result.slug) throw new Error(result.error ?? "Could not create your garden.");
      setSlug(result.slug);
      setGardens((current) => [{ slug: result.slug!, title, visibility, createdAt: new Date().toISOString(), watchlist: [] }, ...current]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create your garden."); }
    finally { setLoading(false); }
  }

  async function setGardenVisibility(garden: GardenSummary, nextVisibility: Visibility) {
    setError("");
    const response = await fetch(`/api/terrariums/${garden.slug}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ visibility: nextVisibility }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setError(result.error ?? "Could not update visibility."); return; }
    setGardens((current) => current.map((item) => item.slug === garden.slug ? { ...item, visibility: nextVisibility } : item));
  }

  return (
    <section className="dashboard-card">
      <strong>Start a public garden</strong>
      <form onSubmit={createGarden} className="garden-form">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Yishai's AI garden" maxLength={80} required />
        <label className="visibility"><input type="checkbox" checked={visibility === "public"} onChange={(event) => setVisibility(event.target.checked ? "public" : "private")} /> Public from the start</label>
        <button type="submit" disabled={loading}>{loading ? "Creating…" : "Create garden"}</button>
      </form>
      {slug && <p className="success">Created. <Link href={`/?garden=${slug}`}>Plant its first research seed →</Link> · <Link href={`/g/${slug}`}>Open public garden</Link></p>}
      {gardens.length > 0 && <div className="garden-list"><p className="eyebrow">YOUR GARDENS</p>{gardens.map((garden) => <div className="garden-row" key={garden.slug}><div><strong>{garden.title}</strong><small>/{garden.slug}{garden.latestRun ? ` · last grow: ${garden.latestRun.query}` : ""}{garden.watchlist?.length ? ` · following ${garden.watchlist.length}` : ""}</small></div><div className="garden-actions"><Link href={`/?garden=${garden.slug}`}>Grow</Link><Link href={`/g/${garden.slug}`}>View</Link><button type="button" className="visibility-button" onClick={() => void setGardenVisibility(garden, garden.visibility === "public" ? "private" : "public")}>{garden.visibility === "public" ? "Public" : "Private"}</button></div></div>)}</div>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
