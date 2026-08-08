export type ContinuousResearchSelection = {
  query?: string;
  topicIndex?: number;
};

export function selectContinuousResearchQuery(
  watchlist: readonly string[] | undefined,
  watchTopicCursor: number | undefined,
  fallbackQuery?: string,
): ContinuousResearchSelection {
  const topics = (watchlist ?? []).map((topic) => topic.trim()).filter(Boolean);
  if (!topics.length) {
    const fallback = fallbackQuery?.trim();
    return { query: fallback || undefined };
  }

  const cursor = Number.isInteger(watchTopicCursor) && (watchTopicCursor ?? 0) >= 0
    ? (watchTopicCursor ?? 0) % topics.length
    : 0;

  return { query: topics[cursor], topicIndex: cursor };
}
