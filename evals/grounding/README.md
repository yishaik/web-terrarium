# Web Terrarium grounding-judge calibration

This frozen case study evaluates one narrow decision: whether a research claim is
fully supported by its supplied evidence. The 20 reference labels were assigned
before running the judge. They cover the failure modes that matter to a living
research document: entity and metric swaps, numerical mistakes, uncertainty,
causation, population scope, unsupported generalization, and faithful paraphrase.

Both runs used `gpt-4.1-nano-2025-04-14`, temperature 0, through the OpenAI
Responses API on 2026-08-24. The cases and model were held constant; only the
judge prompt changed.

| judge prompt | agreement | Cohen's kappa | disagreements |
|---|---:|---:|---:|
| baseline | 90% (18/20) | 0.80 | 2 |
| calibrated | 95% (19/20) | 0.90 | 1 |

The calibrated rubric fixed the entity-swap and future-guarantee errors. Its one
remaining miss was arithmetic: accepting a claimed 60% improvement from 400 ms
to 250 ms, where the relative improvement is 37.5%.

Files:

- `cases.json` — evidence, candidate claim, and frozen reference label.
- `baseline-prompt.txt` — the vague initial judge instruction.
- `calibrated-prompt.txt` — decomposed rubric produced after inspecting failure modes.
- `baseline.jsonl` and `calibrated.jsonl` — captured model verdicts joined to the reference labels.
- `reports/` — generated locally by `npm run eval:kappa` and intentionally ignored.

This is a small calibration set, not a general benchmark. Its purpose is to
demonstrate the workflow and catch regressions. The remaining disagreement on
`g11` shows that prompt decomposition did not make arithmetic reliable; the next
version should calculate numeric claims deterministically before asking an LLM.
