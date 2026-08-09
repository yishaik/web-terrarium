"use client";

import { useState } from "react";
import Link from "next/link";
import { generateLivingDocumentPdf } from "@/lib/artifacts/pdf-client";
import type { LivingDocument } from "@/shared/document";
import styles from "./export.module.css";

export function ExportClient({ document, canonicalUrl }: { document: LivingDocument; canonicalUrl: string }) {
  const [state, setState] = useState<"idle" | "building" | "done" | "error">("idle");

  async function download() {
    setState("building");
    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      const { blob } = generateLivingDocumentPdf(document, canonicalUrl);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `${document.gardenSlug}-living-document-v${document.documentVersion}.pdf`;
      window.document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
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
      <p className={styles.copy}>This export freezes exactly document version {document.documentVersion}: its current findings, open questions, source index and canonical live link. The Garden can keep growing without changing this file.</p>
      <div className={styles.stats}><span><b>{document.findings.length}</b> findings</span><span><b>{document.sourceRefs.length}</b> sources</span><span><b>{document.basedOn.runCount}</b> growth cycles</span></div>
      <button onClick={download} disabled={state === "building"}>{state === "building" ? "Composing pages…" : state === "done" ? "Download again →" : "Download PDF →"}</button>
      {state === "error" && <p className={styles.error}>This browser could not compose the PDF. The live document is unchanged.</p>}
      <p className={styles.note}>Generated locally in your browser. No document content is sent to a separate PDF service.</p>
    </section>
  </main>;
}
