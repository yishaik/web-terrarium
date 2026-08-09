"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./living-document.module.css";

export function DocumentPresence({ slug, version, changeCount }: { slug: string; version: number; changeCount: number }) {
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [artifactVersion, setArtifactVersion] = useState<number | null>(null);

  useEffect(() => {
    const key = `web-terrarium:document-version:${slug}`;
    const raw = window.localStorage.getItem(key);
    const previous = raw ? Number(raw) : null;
    setLastSeen(Number.isFinite(previous) ? previous : null);
    window.localStorage.setItem(key, String(version));

    const fromArtifact = Number(new URLSearchParams(window.location.search).get("fromArtifactVersion"));
    setArtifactVersion(Number.isInteger(fromArtifact) && fromArtifact > 0 ? fromArtifact : null);
  }, [slug, version]);

  const delta = lastSeen && version > lastSeen ? version - lastSeen : null;
  const growth = artifactVersion && version > artifactVersion ? version - artifactVersion : 0;

  return <div style={{display:"grid",gap:10}} aria-live="polite">
    {artifactVersion && <div style={{display:"flex",gap:12,alignItems:"center",padding:"11px 14px",borderRadius:12,background:growth?"#d9ff86":"rgba(217,255,134,.08)",color:growth?"#10241b":"#d9ff86",fontSize:".72rem"}}>
      <strong>{growth ? "New growth discovered" : "Artifact is current"}</strong>
      <span>{growth ? `Your PDF froze v${artifactVersion}; the live Garden is v${version} · ${growth} newer ${growth === 1 ? "version" : "versions"}.` : `This artifact snapshot matches live document v${version}.`}</span>
    </div>}
    <div className={styles.presence}>
      <span className={styles.pulse} aria-hidden="true" />
      {delta
        ? <span><strong>{delta} new document {delta === 1 ? "version" : "versions"}</strong> since your last visit · {changeCount} tracked changes in this release</span>
        : lastSeen === null
          ? <span><strong>Live document v{version}</strong> · your first visit to this research artifact</span>
          : <span><strong>You are current</strong> · document v{version} · {changeCount} tracked changes</span>}
      <Link href={`/g/${encodeURIComponent(slug)}/document/export`} style={{marginInlineStart:"auto",color:"#d9ff86",border:"1px solid rgba(217,255,134,.35)",borderRadius:999,padding:"7px 11px",textDecoration:"none",fontWeight:800,fontSize:".62rem",whiteSpace:"nowrap"}}>Export PDF ↗</Link>
    </div>
  </div>;
}
