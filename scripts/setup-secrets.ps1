<#
.SYNOPSIS
Creates .env.local for Web Terrarium without printing any entered value.

.DESCRIPTION
Run this script from the project root. Press Enter to skip an optional value.
It refuses to overwrite an existing .env.local unless -Force is supplied.
#>
[CmdletBinding()]
param([switch]$Force)

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env.local'

if ((Test-Path -LiteralPath $envPath) -and -not $Force) {
  throw ".env.local already exists. Nothing was changed. Use -Force only if you intend to replace it."
}

function Read-OptionalSecret {
  param([string]$Name, [string]$Hint)
  Write-Host ("$Name - $Hint") -ForegroundColor Cyan
  $secret = Read-Host 'Paste value (Enter to skip)' -AsSecureString
  if ($secret.Length -eq 0) { return $null }
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

$values = [ordered]@{}
$values['CRW_API_KEY'] = Read-OptionalSecret 'CRW_API_KEY' 'Recommended: enables fastCRW live search.'
$values['FIRECRAWL_API_KEY'] = Read-OptionalSecret 'FIRECRAWL_API_KEY' 'Optional: enables Firecrawl as a second crawler.'
$values['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] = Read-OptionalSecret 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY' 'For public sign-in UI. Starts with pk_.'
$values['CLERK_SECRET_KEY'] = Read-OptionalSecret 'CLERK_SECRET_KEY' 'For server-side owner authentication. Starts with sk_.'
$values['AGENT_WORKER_URL'] = Read-OptionalSecret 'AGENT_WORKER_URL' 'Cloudflare Worker URL after it is deployed.'
$values['AGENT_WORKER_TOKEN'] = Read-OptionalSecret 'AGENT_WORKER_TOKEN' 'Shared internal token used only between the Vercel app and Worker.'
$values['AI_GATEWAY_API_KEY'] = Read-OptionalSecret 'AI_GATEWAY_API_KEY' 'Optional local/non-Vercel fallback. Vercel deployments should prefer OIDC.'
$values['CRON_SECRET'] = Read-OptionalSecret 'CRON_SECRET' 'Required in production to authenticate scheduled regrowth.'

$lines = @(
  '# Created locally by scripts/setup-secrets.ps1. Never commit this file.',
  'CRW_API_URL=https://api.fastcrw.com',
  'AI_MODEL=openai/gpt-5.6-luna',
  'CONTINUOUS_RESEARCH_BATCH_SIZE=1'
)
foreach ($pair in $values.GetEnumerator()) {
  if ($null -ne $pair.Value -and $pair.Value.Length -gt 0) {
    $lines += "$($pair.Key)=$($pair.Value)"
  }
}

[System.IO.File]::WriteAllLines($envPath, $lines, [System.Text.UTF8Encoding]::new($false))
$saved = @($values.GetEnumerator() | Where-Object { $null -ne $_.Value -and $_.Value.Length -gt 0 } | ForEach-Object Key)
$savedNames = $saved -join ', '
Write-Host ('Saved .env.local with: ' + $savedNames) -ForegroundColor Green
Write-Host 'No secret value was displayed. Tell Codex after setup is complete.' -ForegroundColor Green
