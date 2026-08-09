import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicGarden } from "@/lib/worker";

export const dynamic = "force-dynamic";

export default async function PublicGardenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const garden = await getPublicGarden(slug);
  if (!garden) notFound();

  return <main className="public-garden">
    <Link className="wordmark" href="/">WT</Link>
    <p className="eyebrow">PUBLIC WEB TERRARIUM</p>
    <h1>{garden.title}</h1>
    <p className="intro">A living research garden, grown from the open web.</p>
    <Link className="primary-link" href={`/g/${garden.slug}/document`}>Open living research document →</Link>
    {garden.latestRun ? <>
      <section className="research-brief">
        <p className="eyebrow">LATEST GROWTH · {garden.latestRun.query}</p>
        {garden.latestRun.brief && <><h2>{garden.latestRun.brief.headline}</h2><p>{garden.latestRun.brief.summary}</p></>}
      </section>
      {garden.latestRun.brief?.executiveSummary && <section className="executive-summary"><p className="eyebrow">EXECUTIVE SUMMARY</p><h3>What you need to know</h3><p>{garden.latestRun.brief.executiveSummary.takeaway}</p></section>}
      <section className="field-notes"><ol className="source-list">{garden.latestRun.sources.map((source, index) => <li key={source.url}><span className="number">0{index + 1}</span><div><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><p>{source.description}</p></div><span className="domain">{source.domain}</span></li>)}</ol></section>
      {garden.history && garden.history.length > 1 && <section className="garden-history"><p className="eyebrow">GROWTH HISTORY</p>{garden.history.slice(1).map((item) => <Link key={item.recordedAt} href={`/?garden=${garden.slug}&seed=${encodeURIComponent(item.query)}`}>{item.query}<small>{new Date(item.recordedAt).toLocaleDateString()}</small></Link>)}</section>}
    </> : <p className="empty-state">This garden has not grown its first research branch yet.</p>}
  </main>;
}
