"use client";

import { useState } from "react";
import Link from "next/link";
import { generateLivingDocumentPdf } from "@/lib/artifacts/pdf-client";
import { generateIntelligentPdf } from "@/lib/artifacts/intelligent-pdf-client";
import type { LivingDocument } from "@/shared/document";
import styles from "./export.module.css";

type BuildState = "idle" | "building" | "done" | "error";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url; anchor.download = filename;
  window.document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function ExportClient({ document, canonicalUrl }: { document: LivingDocument; canonicalUrl: string }) {
  const [normal, setNormal] = useState<BuildState>("idle");
  const [smart, setSmart] = useState<BuildState>("idle");

  async function build(kind: "normal" | "smart") {
    const setState = kind === "normal" ? setNormal : setSmart;
    setState("building");
    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      if (kind === "normal") {
        const { blob } = generateLivingDocumentPdf(document, canonicalUrl);
        saveBlob(blob, `${document.gardenSlug}-living-document-v${document.documentVersion}.pdf`);
      } else {
        const { blob } = generateIntelligentPdf(document, canonicalUrl);
        saveBlob(blob, `${document.gardenSlug}-intelligent-offline-v${document.documentVersion}.pdf`);
      }
      setState("done");
    } catch { setState("error"); }
  }

  return <main className={styles.shell}>
    <div className={styles.glow} />
    <header><Link href={`/g/${document.gardenSlug}/document`}>← Living document</Link><span>WEB TERRARIUM / ARTIFACT LAB</span></header>
    <section className={styles.card}>
      <div className={styles.seal}>PDF<br/><small>v{document.documentVersion}</small></div>
      <p className={styles.kicker}>FROZEN RESEARCH ARTIFACT</p>
      <h1>Take the evidence with you.</h1>
      <p className={styles.copy}>Both artifacts freeze exactly document version {document.documentVersion}. The standard PDF is a polished immutable report. The Intelligent PDF adds an offline evidence console that searches only the findings embedded in the file.</p>
      <div className={styles.stats}><span><b>{document.findings.length}</b> findings</span><span><b>{document.sourceRefs.length}</b> sources</span><span><b>{document.basedOn.runCount}</b> growth cycles</span></div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <button onClick={() => build("normal")} disabled={normal === "building"}>{normal === "building" ? "Composing pages…" : normal === "done" ? "PDF downloaded ✓" : "Download PDF →"}</button>
        <button onClick={() => build("smart")} disabled={smart === "building"} style={{background:"transparent",color:"#d9ff86",border:"1px solid rgba(217,255,134,.45)"}}>{smart === "building" ? "Embedding evidence…" : smart === "done" ? "Intelligent PDF ✓" : "Intelligent Offline PDF →"}</button>
      </div>
      {(normal === "error" || smart === "error") && <p className={styles.error}>This browser could not compose that artifact. The live document is unchanged.</p>}
      <p className={styles.note}>Generated locally in your browser. Intelligent PDF interactivity depends on PDF JavaScript/AcroForm support; the frozen document remains readable without it.</p>
    </section>
  </main>;
}
