"use client";

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
  </div>;
}
