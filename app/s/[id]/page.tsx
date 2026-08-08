import Link from "next/link";
import { notFound } from "next/navigation";
import { getSharedRun } from "@/lib/worker";

export const dynamic = "force-dynamic";

export default async function SharedResearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const share = await getSharedRun(id);
  if (!share) notFound();
  const { run } = share;
  return <main className="public-garden shared-page">
    <Link className="wordmark" href="/">WT</Link>
    <p className="eyebrow">SHARED FIELD NOTES</p>
    <h1>{run.query}</h1>
    {run.brief && <section className="research-brief"><p className="eyebrow">READING GUIDE</p><h2>{run.brief.headline}</h2><p>{run.brief.summary}</p></section>}
    <section className="field-notes"><p className="eyebrow">{run.sources.length} SOURCES</p><ol className="source-list">{run.sources.map((source, index) => <li key={`${source.url}-${index}`}><span className="number">0{index + 1}</span><div><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><p>{source.description}</p></div><span className="domain">{source.domain}</span></li>)}</ol></section>
  </main>;
}
