"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./living-document.module.css";

export function DocumentPresence({ slug, version, changeCount }: { slug: string; version: number; changeCount: number }) {
  const [lastSeen, setLastSeen] = useState<number | null>(null);

  useEffect(() => {
    const key = `web-terrarium:document-version:${slug}`;
    const raw = window.localStorage.getItem(key);
    const previous = raw ? Number(raw) : null;
    setLastSeen(Number.isFinite(previous) ? previous : null);
    window.localStorage.setItem(key, String(version));
  }, [slug, version]);

  const delta = lastSeen && version > lastSeen ? version - lastSeen : null;
  return <div className={styles.presence} aria-live="polite">
    <span className={styles.pulse} aria-hidden="true" />
    {delta
      ? <span><strong>{delta} new document {delta === 1 ? "version" : "versions"}</strong> since your last visit · {changeCount} tracked changes in this release</span>
      : lastSeen === null
        ? <span><strong>Live document v{version}</strong> · your first visit to this research artifact</span>
        : <span><strong>You are current</strong> · document v{version} · {changeCount} tracked changes</span>}
    <Link href={`/g/${encodeURIComponent(slug)}/document/export`} style={{marginInlineStart:"auto",color:"#d9ff86",border:"1px solid rgba(217,255,134,.35)",borderRadius:999,padding:"7px 11px",textDecoration:"none",fontWeight:800,fontSize:".62rem",whiteSpace:"nowrap"}}>Export PDF ↗</Link>
  </div>;
}
