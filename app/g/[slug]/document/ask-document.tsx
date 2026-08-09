"use client";

import { FormEvent, useState } from "react";
import styles from "./ask-document.module.css";

type Answer = {
  answer: string;
  citations: Array<{ id: string; title: string; url: string; domain: string }>;
  documentVersion: number;
  coverage: "grounded" | "partial" | "insufficient";
};

export function AskDocument({ slug }: { slug: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (!value) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/gardens/${encodeURIComponent(slug)}/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: value }),
      });
      const payload = await response.json() as Answer & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The document could not answer right now.");
      setAnswer(payload);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The document could not answer right now."); }
    finally { setLoading(false); }
  }

  return <section className={styles.panel}>
    <div className={styles.intro}>
      <p className={styles.kicker}>ASK THIS DOCUMENT</p>
      <h2>Interrogate the evidence.</h2>
      <p>Answers are restricted to this document&apos;s findings and source set. If the evidence is thin, the document says so.</p>
    </div>
    <form className={styles.form} onSubmit={ask}>
      <label htmlFor="living-document-question">Question</label>
      <div><input id="living-document-question" maxLength={320} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What changed the strongest conclusion?" disabled={loading} /><button type="submit" disabled={loading || !question.trim()}>{loading ? "Reading evidence…" : "Ask →"}</button></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
    {answer && <div className={styles.answer}>
      <div className={styles.answerMeta}><span>{answer.coverage}</span><span>v{answer.documentVersion}</span></div>
      <p>{answer.answer}</p>
      {answer.citations.length > 0 && <div className={styles.sources}>{answer.citations.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>{source.domain} ↗</a>)}</div>}
    </div>}
  </section>;
}
