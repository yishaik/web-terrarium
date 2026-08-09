import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPublicLivingDocument } from "@/lib/document/load";
import { AskDocument } from "./ask-document";
import { DocumentPresence } from "./document-presence";
import styles from "./living-document.module.css";

export const dynamic = "force-dynamic";

function shortDate(value?: string) {
  if (!value) return "awaiting evidence";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function confidenceLabel(value: string) {
  return value === "high" ? "strong signal" : value === "medium" ? "developing" : "tentative";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadPublicLivingDocument(slug).catch(() => null);
  return loaded ? {
    title: `${loaded.document.title} — Living Research Document`,
    description: loaded.document.executiveSummary.slice(0, 155),
  } : { title: "Living Research Document — Web Terrarium" };
}

export default async function LivingDocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loaded = await loadPublicLivingDocument(slug).catch(() => null);
  if (!loaded) notFound();
  const { document, persisted } = loaded;
  const currentFindings = document.findings.filter((finding) => finding.status !== "retracted");
  const openQuestions = document.openQuestions.filter((question) => question.status === "open");
  const sourceMap = new Map(document.sourceRefs.map((source) => [source.id, source]));

  return <main className={styles.shell}>
    <header className={styles.nav}>
      <Link className={styles.mark} href="/">WT</Link>
      <div className={styles.navMeta}><span>Living research artifact</span><span>v{document.documentVersion}</span></div>
      <Link className={styles.back} href={`/g/${slug}`}>Garden view ↗</Link>
    </header>

    <section className={styles.hero}>
      <div className={styles.heroGrid} aria-hidden="true" />
      <div className={styles.heroCopy}>
        <p className={styles.kicker}>WEB TERRARIUM / LIVING DOCUMENT</p>
        <h1>{document.title}</h1>
        <p className={styles.dek}>{document.executiveSummary}</p>
        <DocumentPresence slug={slug} version={document.documentVersion} changeCount={document.changes.length} />
      </div>
      <aside className={styles.specimen}>
        <div className={styles.orbit}><span>{document.sourceRefs.length}</span></div>
        <dl>
          <div><dt>Evidence</dt><dd>{document.sourceRefs.length} sources</dd></div>
          <div><dt>Findings</dt><dd>{currentFindings.length} active</dd></div>
          <div><dt>Questions</dt><dd>{openQuestions.length} open</dd></div>
          <div><dt>Freshness</dt><dd>{shortDate(document.basedOn.latestRunAt)}</dd></div>
        </dl>
        <p>{persisted ? "Durable document projection" : "Rebuilt live from Garden evidence"}</p>
      </aside>
    </section>

    <section className={styles.ribbon} aria-label="Document telemetry">
      <span><b>VERSION</b> {document.documentVersion.toString().padStart(2, "0")}</span>
      <span><b>GROWTH CYCLES</b> {document.basedOn.runCount}</span>
      <span><b>GENERATED</b> {shortDate(document.generatedAt)}</span>
      <span><b>EVIDENCE HASH</b> {document.basedOn.sourceFingerprint}</span>
    </section>

    <AskDocument slug={slug} />

    <div className={styles.contentGrid}>
      <article className={styles.article}>
        <section className={styles.sectionIntro}>
          <span className={styles.sectionNumber}>01</span>
          <div><p className={styles.kicker}>CURRENT PICTURE</p><h2>What the evidence says now</h2></div>
        </section>

        <div className={styles.findings}>
          {currentFindings.length ? currentFindings.map((finding, index) => {
            const sources = finding.sourceIds.map((id) => sourceMap.get(id)).filter(Boolean);
            return <section className={styles.finding} key={finding.id}>
              <div className={styles.findingIndex}>{String(index + 1).padStart(2, "0")}</div>
              <div>
                <div className={styles.findingTop}>
                  <h3>{finding.title}</h3>
                  <span className={`${styles.confidence} ${styles[finding.confidence]}`}>{confidenceLabel(finding.confidence)}</span>
                </div>
                <p>{finding.detail}</p>
                <div className={styles.evidenceLinks}>{sources.slice(0, 4).map((source) => source && <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>{source.domain} ↗</a>)}</div>
              </div>
            </section>;
          }) : <p className={styles.empty}>The first evidence-backed findings will emerge after this Garden grows.</p>}
        </div>

        <section className={styles.sectionIntro}>
          <span className={styles.sectionNumber}>02</span>
          <div><p className={styles.kicker}>CHANGELOG</p><h2>What changed</h2></div>
        </section>
        <div className={styles.changes}>
          {document.changes.length ? document.changes.slice(0, 10).map((change) => <div className={styles.change} key={change.id}>
            <span className={`${styles.changeType} ${styles[change.type]}`}>{change.type}</span>
            <div><strong>{change.label}</strong><p>{change.detail}</p></div>
            <time>{shortDate(change.recordedAt)}</time>
          </div>) : <p className={styles.empty}>This is the baseline document. Future evidence will appear here as explicit changes rather than silent rewrites.</p>}
        </div>

        <section className={styles.sectionIntro}>
          <span className={styles.sectionNumber}>03</span>
          <div><p className={styles.kicker}>RESEARCH FRONTIER</p><h2>Questions still alive</h2></div>
        </section>
        <div className={styles.questions}>
          {openQuestions.length ? openQuestions.map((question) => <div key={question.id}><span>?</span><p>{question.question}</p></div>) : <p className={styles.empty}>No unresolved questions are recorded in this document yet.</p>}
        </div>

        {document.uncertainties.length > 0 && <section className={styles.uncertaintyBlock}>
          <p className={styles.kicker}>UNCERTAINTY REGISTER</p>
          <h2>Ideas worth holding lightly</h2>
          {document.uncertainties.map((item) => <div key={item.id}><strong>{item.label}</strong><p>{item.detail}</p></div>)}
        </section>}
      </article>

      <aside className={styles.sourceRail}>
        <div className={styles.sticky}>
          <p className={styles.kicker}>EVIDENCE INDEX</p>
          <h2>{document.sourceRefs.length} specimens</h2>
          <div className={styles.sourceList}>{document.sourceRefs.map((source, index) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><strong>{source.title}</strong><small>{source.domain}</small></div>
          </a>)}</div>
        </div>
      </aside>
    </div>

    <footer className={styles.footer}>
      <div><span className={styles.mark}>WT</span><p>Research that behaves less like a search result and more like a living body of evidence.</p></div>
      <div><span>Garden / {slug}</span><span>Document / v{document.documentVersion}</span></div>
    </footer>
  </main>;
}
