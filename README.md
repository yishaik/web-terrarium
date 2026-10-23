# Web Terrarium

A public research habitat: seed a question, get a concise reading guide, explore a living source map, track topics, and share a permanent result page.

## What it includes

- Live research through fastCRW or Firecrawl, with cleaned source text.
- A reading guide and visual source signals: fresh branches, primary/technical sources, and discovered sources.
- Recent searches (local to the browser) and popular public research topics.
- Public gardens with a saved growth history and a watchlist for topics you want to revisit.
- One-click share links at `/s/<id>` for a research result.
- Cloudflare Computer Durable Object storage for public gardens, history, shares, and topics.

## Interactive source garden

The home page's map supports up to six sources. Select a numbered leaf to
inspect the source excerpt and open the original. The matching entry in the
reading list is highlighted; its number also selects the leaf.

Dashed lines connect sources with the same URL hostname (ignoring `www.`).
The **Same-site links** control toggles these lines. They show shared origin,
not agreement, contradiction, or source quality. Excerpts are not verified
conclusions.

Choose **Explore an example garden** to try all six leaves and three pairs of
related sources without a crawler call. The example is labeled as illustrative
and is not recorded as a live research run. Live search, saved gardens, and
sharing retain their existing behavior; the interactive map is on the home page.
The controls support keyboard navigation and respect reduced-motion settings.

## Local app

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

For the secure key-entry flow and account links, see [SETUP.md](./SETUP.md). Never send secrets through chat.

Set `CRW_API_KEY` or `FIRECRAWL_API_KEY` in `.env.local` for live results. Without a key, the interface deliberately stays useful in starter/demo mode.

## Cloudflare Computer agent memory

The `worker/` package is deliberately separate from the Vercel UI. It uses `@cloudflare/computer` with a Durable Object-backed workspace and stores garden runs, history, shares, and public-topic counts.

```powershell
Set-Location worker
npm install
npx wrangler login
npm run deploy
```

Then place the deployed Worker URL in Vercel as `AGENT_WORKER_URL`. Set the same strong `AGENT_WORKER_TOKEN` in Vercel and as `INTERNAL_TOKEN` for the Worker. `worker/wrangler.jsonc` keeps runtime variables across deploys so the Worker does not lose that value. The worker is a preview integration because Cloudflare Computer itself is preview-only; the public UI and crawler flow do not depend on it.

## Deploy the UI

```powershell
vercel
```

Add crawler keys and (optionally) `AGENT_WORKER_URL` in the Vercel project environment settings, then deploy again.

## Judge calibration case study

The grounding judge is evaluated outside the user request path. The frozen gold set in
`evals/grounding/` covers exact support, entity swaps, numerical errors, causation,
uncertainty, population scope, and unsupported generalization. This keeps the quality gate
measurable instead of asking an LLM whether another LLM "looks good."

Install [Kappa](https://github.com/yishaik/kappa), then reproduce the reports:

```bash
python -m pip install git+https://github.com/yishaik/kappa.git
npm run eval:kappa
```

The command lints the calibrated judge prompt, scores baseline and calibrated outputs
against the same reference labels, writes self-contained HTML reports, and fails when
agreement drifts materially.
