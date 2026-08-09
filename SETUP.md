# Web Terrarium — secure setup

This app needs secrets to use live crawlers, owner authentication, durable Worker storage, and scheduled regrowth. Do **not** paste secrets into chat, issues, PRs, logs, or a public website.

## 1. Required and optional configuration

| Variable | Needed for | Notes |
| --- | --- | --- |
| `CRW_API_KEY` | fastCRW live search | Recommended crawler. |
| `FIRECRAWL_API_KEY` | Optional second crawler | Not required when fastCRW is configured. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public sign-in UI | Safe to expose to the browser by design. |
| `CLERK_SECRET_KEY` | Secure owner-only actions | Server-side only. |
| `AGENT_WORKER_URL` | Durable Garden storage | URL of the deployed Cloudflare Worker. |
| `AGENT_WORKER_TOKEN` | Vercel ↔ Worker authentication | Use the same strong random value as Worker `INTERNAL_TOKEN`. Never expose it client-side. |
| `CRON_SECRET` | Scheduled regrowth authentication | Required in production. Vercel Cron sends it as `Authorization: Bearer ...`. |
| `AI_GATEWAY_API_KEY` | Local/non-Vercel AI synthesis fallback | Optional. On Vercel, prefer deployment OIDC instead of a long-lived API key. |
| `AI_MODEL` | AI synthesis model | Defaults to `openai/gpt-5.6-luna`. |
| `CONTINUOUS_RESEARCH_BATCH_SIZE` | Gardens processed per cron invocation | Defaults to `1`, capped by the route. |

You only need one crawler key to begin. fastCRW uses the key through the `Authorization: Bearer` header.

## 2. Enter secrets locally without echoing them

From the project root in PowerShell:

```powershell
.\scripts\setup-secrets.ps1
```

Press Enter for optional values you do not have yet. The script refuses to overwrite an existing `.env.local` unless `-Force` is supplied.

```powershell
.\scripts\setup-secrets.ps1 -Force
```

The script never prints entered secret values.

## 3. Deploy the Cloudflare Worker first

From `worker/`:

```powershell
npm install
npx wrangler login
npm run deploy
```

Set a strong Worker secret named `INTERNAL_TOKEN`, then use the same value as `AGENT_WORKER_TOKEN` in Vercel. Record only the Worker URL, never the token, in documentation.

## 4. Configure Vercel production

Before enabling scheduled regrowth, configure the production environment with:

- at least one crawler key;
- Clerk keys;
- `AGENT_WORKER_URL`;
- `AGENT_WORKER_TOKEN`;
- `CRON_SECRET`.

AI synthesis on Vercel should use Vercel deployment OIDC when available. `AI_GATEWAY_API_KEY` is an optional fallback for local or non-Vercel execution and should not be added to production unless there is a specific need.

`vercel.json` defines the cron schedule. The cron route fails closed in production if `CRON_SECRET` is missing.

## 5. Continuous research consent model

Continuous research is **off by default for every Garden**, including existing Gardens after migration/backfill.

The owner must explicitly enable **Auto research** in the dashboard. When enabled, scheduled jobs may send:

- watched topic text;
- prior Garden research context/memory;
- newly crawled public-web evidence;

to the configured crawler and AI synthesis layer. This rule applies to private Gardens too, so private Gardens are never scheduled without explicit owner opt-in.

Loading the owner Garden list performs an idempotent repair/backfill of the scheduler index for older Gardens. Backfill does not enable continuous research; it only makes the records known to the scheduler index.

## 6. Safe post-deploy smoke tests

### Verify the cron route fails closed

An unauthenticated production request should return `401`:

```powershell
Invoke-WebRequest "$env:WEB_TERRARIUM_URL/api/cron/regrow" -SkipHttpErrorCheck | Select-Object StatusCode
```

Do not place `CRON_SECRET` directly in shell history.

### Authenticated manual cron smoke test without echoing the secret

```powershell
$secure = Read-Host 'CRON_SECRET' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  Invoke-RestMethod "$env:WEB_TERRARIUM_URL/api/cron/regrow" -Headers @{ Authorization = "Bearer $plain" }
} finally {
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  Remove-Variable plain -ErrorAction SilentlyContinue
}
```

The response reports each processed Garden as `grown`, `skipped`, or `failed`. Successful runs also report `synthesis: "ai"` or `synthesis: "deterministic"`, so AI fallback is observable without logging tokens or source content.

### Production availability smoke checklist

After deployment verify:

1. `/` loads;
2. owner sign-in/dashboard loads;
3. `/g/<public-slug>` still loads;
4. `/s/<share-id>` still loads for a known share;
5. a manual research run still saves successfully;
6. Worker `/health` responds;
7. enabling Auto research for one test Garden makes it eligible for scheduled processing;
8. disabling Auto research removes it from the scheduler queue without deleting Garden data.

## 7. Rollback expectations

Continuous-research state is additive. Older Gardens without the new setting are treated as disabled. Disabling the feature or rolling back the Vercel app does not require deleting Garden, Run, memory, or report data.

## Login and deployment links

- [Sign in to Vercel](https://vercel.com/login)
- [Cloudflare Workers dashboard](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
