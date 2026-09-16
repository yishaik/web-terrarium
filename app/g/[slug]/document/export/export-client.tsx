"use client";

import { useState } from "react";
import Link from "next/link";
import { generateLivingDocumentPdf } from "@/lib/artifacts/pdf-client";
import { generateIntelligentPdf } from "@/lib/artifacts/intelligent-pdf-client";
import { generateSmartPdf, SMART_PDF_MODEL, type SmartPdfProgress } from "@/lib/artifacts/smart-pdf-client";
import type { LivingDocument } from "@/shared/document";
import styles from "./export.module.css";

type BuildState = "idle" | "building" | "done" | "error";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function progressText(progress: SmartPdfProgress | null) {
  if (!progress) return "Preparing local runtime…";
  const pct = progress.total && progress.loaded !== undefined ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : null;
  if (progress.phase === "runtime") return `Loading llama.cpp runtime${pct !== null ? ` · ${pct}%` : ""}`;
  if (progress.phase === "model") return `Downloading ${SMART_PDF_MODEL.quantization} model${pct !== null ? ` · ${pct}%` : ""}`;
  if (progress.phase === "verify") return "Verifying model SHA-256…";
  return `Packaging model inside PDF${pct !== null ? ` · ${pct}%` : ""}`;
}

export function ExportClient({ document, canonicalUrl }: { document: LivingDocument; canonicalUrl: string }) {
  const [normal, setNormal] = useState<BuildState>("idle");
  const [intelligent, setIntelligent] = useState<BuildState>("idle");
  const [smart, setSmart] = useState<BuildState>("idle");
  const [smartProgress, setSmartProgress] = useState<SmartPdfProgress | null>(null);

  async function build(kind: "normal" | "intelligent" | "smart") {
    const setState = kind === "normal" ? setNormal : kind === "intelligent" ? setIntelligent : setSmart;
    setState("building");
    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      if (kind === "normal") {
        const { blob } = generateLivingDocumentPdf(document, canonicalUrl);
        saveBlob(blob, `${document.gardenSlug}-living-document-v${document.documentVersion}.pdf`);
      } else if (kind === "intelligent") {
        const { blob } = generateIntelligentPdf(document, canonicalUrl);
        saveBlob(blob, `${document.gardenSlug}-intelligent-offline-v${document.documentVersion}.pdf`);
      } else {
        const { blob } = await generateSmartPdf(document, canonicalUrl, setSmartProgress);
        saveBlob(blob, `${document.gardenSlug}-smart-local-llm-v${document.documentVersion}.pdf`);
      }
      setState("done");
    } catch (error) {
      console.error("Artifact generation failed", error);
      setState("error");
    }
  }

  return <main className={styles.shell}>
    <div className={styles.glow} />
    <header><Link href={`/g/${document.gardenSlug}/document`}>← Living document</Link><span>WEB TERRARIUM / ARTIFACT LAB</span></header>
    <section className={styles.card}>
      <div className={styles.seal}>PDF<br/><small>v{document.documentVersion}</small></div>
      <p className={styles.kicker}>FROZEN RESEARCH ARTIFACT</p>
      <h1>Take the evidence with you.</h1>
      <p className={styles.copy}>Every artifact freezes exactly document version {document.documentVersion}. Choose a polished report, an offline retrieval console, or the full Smart PDF with a real local GGUF language model packaged into the file.</p>
      <div className={styles.stats}><span><b>{document.findings.length}</b> findings</span><span><b>{document.sourceRefs.length}</b> sources</span><span><b>{document.basedOn.runCount}</b> growth cycles</span></div>

      <div className={styles.options}>
        <article className={styles.option}>
          <span className={styles.optionTag}>LIGHT</span>
          <h2>Research PDF</h2>
          <p>Beautiful, immutable, linked research snapshot. Works everywhere a normal PDF works.</p>
          <button onClick={() => build("normal")} disabled={normal === "building"}>{normal === "building" ? "Composing pages…" : normal === "done" ? "Downloaded ✓" : "Download PDF →"}</button>
        </article>

        <article className={styles.option}>
          <span className={styles.optionTag}>OFFLINE</span>
          <h2>Intelligent PDF</h2>
          <p>Embeds the evidence and a local retrieval console. No model download, server, or API required.</p>
          <button className={styles.secondary} onClick={() => build("intelligent")} disabled={intelligent === "building"}>{intelligent === "building" ? "Embedding evidence…" : intelligent === "done" ? "Downloaded ✓" : "Intelligent PDF →"}</button>
        </article>

        <article className={`${styles.option} ${styles.smartOption}`}>
          <span className={styles.optionTag}>LOCAL LLM</span>
          <h2>Smart PDF</h2>
          <p><strong>{SMART_PDF_MODEL.id.split("/").at(-1)}</strong> runs through a pinned JavaScript-only llama.cpp runtime inside the PDF. Retrieval happens first, then the model answers from that evidence.</p>
          <dl className={styles.modelMeta}>
            <div><dt>Model</dt><dd>135M · {SMART_PDF_MODEL.quantization}</dd></div>
            <div><dt>License</dt><dd>{SMART_PDF_MODEL.license}</dd></div>
            <div><dt>Model bytes</dt><dd>~88 MB</dd></div>
          </dl>
          <button className={styles.smartButton} onClick={() => build("smart")} disabled={smart === "building"}>{smart === "building" ? progressText(smartProgress) : smart === "done" ? "Smart PDF downloaded ✓" : "Build Smart PDF →"}</button>
          <small>Desktop Chromium/PDFium-class viewers recommended. First inference can be slow; retrieval-only evidence remains available if the local model fails.</small>
        </article>
      </div>

      {(normal === "error" || intelligent === "error" || smart === "error") && <p className={styles.error}>That artifact could not be composed in this browser. The live document and other export modes are unchanged.</p>}
      <p className={styles.note}>Artifacts are generated locally in your browser. Smart PDF downloads a pinned, checksum-verified open model only when you explicitly choose it.</p>
    </section>
  </main>;
}
