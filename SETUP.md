# Web Terrarium — secure setup

This app needs secrets to use live crawlers and owner authentication. Do **not** paste a secret into chat or into a public website. The local setup script below asks for each value without displaying it and writes only to the ignored `.env.local` file.

## 1. Get the keys

| What | Needed for | Get it here |
| --- | --- | --- |
| `CRW_API_KEY` | fastCRW live search — recommended | [Create a fastCRW account](https://fastcrw.com/register), then copy the key from its dashboard. |
| `FIRECRAWL_API_KEY` | Optional second crawler | [Firecrawl API keys](https://www.firecrawl.dev/app/api-keys) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public sign-in UI | [Add Clerk in the Vercel Marketplace](https://vercel.com/marketplace/clerk) |
| `CLERK_SECRET_KEY` | Secure owner-only actions | Generated alongside the Clerk publishable key. |

You only need **one** crawler key to begin; use fastCRW first. Its hosted API accepts the key through the `Authorization: Bearer` header. [fastCRW quick start](https://docs.fastcrw.com/quick-start/)

## 2. Enter them locally

Open PowerShell in `D:\Projects\web-terrarium` and run:

```powershell
.\scripts\setup-secrets.ps1
```

Press Enter for anything you do not have yet. It will not replace an existing `.env.local`. If you deliberately need to replace it, run:

```powershell
.\scripts\setup-secrets.ps1 -Force
```

## 3. What happens next

Tell Codex only: **`keys added`**. No values are needed in chat.

Then I will:

1. test the live crawler without exposing its key;
2. finish the public profile, sign-in, ownership, and Public/Private toggle;
3. deploy the Cloudflare Worker and write its URL locally;
4. deploy the app to Vercel after its CLI session can authenticate.

## Login and deployment links

- [Sign in to Vercel](https://vercel.com/login)
- [Cloudflare Workers dashboard](https://dash.cloudflare.com/?to=/:account/workers-and-pages)

The Cloudflare Worker URL is not required yet. It will be created during deployment and then added as `AGENT_WORKER_URL`.
