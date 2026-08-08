import assert from "node:assert/strict";
import test from "node:test";
import { selectContinuousResearchQuery } from "./continuous-research.ts";

test("falls back to the latest query when the watchlist is empty", () => {
  assert.deepEqual(selectContinuousResearchQuery([], 0, "latest seed"), { query: "latest seed" });
});

test("returns no query when both watchlist and fallback are empty", () => {
  assert.deepEqual(selectContinuousResearchQuery([], 0, ""), { query: undefined });
});

test("single-topic watchlists always select their only topic", () => {
  assert.deepEqual(selectContinuousResearchQuery(["topic a"], 7, "fallback"), { query: "topic a", topicIndex: 0 });
});

test("multi-topic watchlists rotate according to the durable cursor", () => {
  assert.deepEqual(selectContinuousResearchQuery(["one", "two", "three"], 0), { query: "one", topicIndex: 0 });
  assert.deepEqual(selectContinuousResearchQuery(["one", "two", "three"], 1), { query: "two", topicIndex: 1 });
  assert.deepEqual(selectContinuousResearchQuery(["one", "two", "three"], 5), { query: "three", topicIndex: 2 });
});

test("invalid cursors safely reset to the first watched topic", () => {
  assert.deepEqual(selectContinuousResearchQuery(["one", "two"], -1), { query: "one", topicIndex: 0 });
  assert.deepEqual(selectContinuousResearchQuery(["one", "two"], Number.NaN), { query: "one", topicIndex: 0 });
});
