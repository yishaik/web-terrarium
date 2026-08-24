import type { ResearchBrief, ResearchSource } from "@/lib/research";

export type SourceMappedFinding = {
  title: string;
  detail: string;
  sources: ResearchSource[];
  evidenceStatus: "linked" | "review" | "uncited";
};

function words(value: string) {
  return new Set(value.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
}

function overlap(left: string, right: string) {
  const a = words(left);
  const b = words(right);
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

function needsNumericReview(value: string) {
  return /(?:\d+(?:\.\d+)?\s*%|\b(?:increase|decrease|improvement|latency|milliseconds?|ms)\b)/i.test(value);
}

export function mapBriefToSources(brief: ResearchBrief, sources: ResearchSource[]): SourceMappedFinding[] {
  const points = brief.highlights.length
    ? brief.highlights
    : brief.executiveSummary.points.length
      ? brief.executiveSummary.points
      : sources.map((source) => ({ title: source.title, detail: source.description }));
  const sourceByUrl = new Map(sources.map((source) => [source.url, source]));

  return points.slice(0, 5).map((point, index) => {
    const text = `${point.title} ${point.detail}`;
    const matchedUrls = (brief.citations ?? [])
      .filter((citation) => overlap(text, citation.claim) >= 0.2)
      .map((citation) => citation.url);
    // The non-AI brief is built directly from sources in the same order. AI
    // findings must carry an explicit citation; they never receive this fallback.
    if (!matchedUrls.length && !brief.aiModel && sources[index]) matchedUrls.push(sources[index].url);
    const linkedSources = [...new Set(matchedUrls)].flatMap((url) => {
      const source = sourceByUrl.get(url);
      return source ? [source] : [];
    });
    const numeric = needsNumericReview(text);
    return {
      ...point,
      sources: linkedSources,
      evidenceStatus: numeric ? "review" : linkedSources.length ? "linked" : "uncited",
    };
  });
}
