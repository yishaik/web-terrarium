# Design QA — interactive source map

## Reference and test state

- Reference visual: `/home/ubuntu/.codex/generated_images/01a028e4-00fb-74c2-9d1a-4e8f83362862/exec-6894013d-2663-4772-a9c6-f175e19f6290.png`
- Reference dimensions: 1487 × 1058 px
- Implementation capture: `/tmp/implementation-postfix.png`
- Implementation viewport: 1440 × 1024 CSS px, device scale factor 1
- Mobile capture: `/tmp/implementation-mobile-postfix.png`
- Mobile viewport: 390 × 844 CSS px, device scale factor 1
- Comparison evidence: `/tmp/comparison.png`
- State under test: starter/demo brief, Finding 2 selected, Kappa disclosure expanded

## Visual review

- Typography: the large editorial serif title, italic accent, compact labels, and readable body copy preserve the selected direction's hierarchy.
- Layout: desktop uses the intended source-map / evidence-panel split. The research controls remain immediately above the workspace. Mobile collapses into one column without horizontal overflow.
- Spacing: workspace boundaries, panel dividers, and control spacing are consistent. Kappa is visible in the first desktop viewport rather than hidden beneath secondary source material.
- Color: warm paper, forest green, muted evidence chips, and amber warning leaf match the reference mood and maintain legible contrast.
- Imagery: the generated terrarium map is sharp at desktop and mobile sizes. Transparent hotspots align with numbered leaves and have visible focus/selected treatment.
- Copy: traceability and calibration are explicitly separated. The interface does not claim that Kappa certifies an individual finding.

## Interaction and runtime review

- Selecting leaf 2 updates the evidence panel to `Finding 2`.
- Opening the Kappa disclosure succeeds and exposes κ 0.90, 19/20 frozen-label agreement, scope, and the known numeric-validation weakness.
- `Open reading brief` scrolls to the detailed brief (`scrollY: 1137` in the automated run).
- Desktop and mobile screenshots rendered successfully in a browser-backed ASCII Box environment.
- Browser console errors: none.
- Unit tests: 19/19 passing.
- Typecheck: passing.
- Production build: passing.

## Iteration history

1. P2 — The first evidence panel was too sparse compared with the selected visual. Added primary-source context, related sources, and an explanation of the link.
2. P1 — Those additions pushed the Kappa disclosure below the first desktop viewport. Moved Kappa immediately below the selected finding so its contribution is visible at a glance.

## Residual notes

- P3 — The terrarium PNG is intentionally detailed and relatively large; it can later be converted to AVIF/WebP as a performance-only refinement.
- P3 — Live research data will need stable source IDs so hotspot selection can remain deterministic beyond the demo brief.

final result: passed
