<#
.SYNOPSIS
Creates a private token for server-to-Worker requests without displaying it.
#>
[CmdletBinding()]
param([switch]$Regenerate, [string]$WorkerUrl)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env.local'
if (-not (Test-Path -LiteralPath $envPath)) { throw '.env.local is required before generating the Worker token.' }

$lines = Get-Content -LiteralPath $envPath
$existing = $lines | Where-Object { $_ -match '^AGENT_WORKER_TOKEN=' } | Select-Object -First 1
if ($existing -and -not $Regenerate) {
  $token = ($existing -split '=', 2)[1]
  $message = 'Kept existing AGENT_WORKER_TOKEN'
} else {
  $bytes = [byte[]]::new(32)
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  $token = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
  $message = 'Created a cryptographically random AGENT_WORKER_TOKEN'
}
$newLines = @($lines | Where-Object { $_ -notmatch '^AGENT_WORKER_TOKEN=' -and $_ -notmatch '^AGENT_WORKER_URL=' }) + "AGENT_WORKER_TOKEN=$token"
if ($WorkerUrl) { $newLines += "AGENT_WORKER_URL=$WorkerUrl" }
elseif ($lines -match '^AGENT_WORKER_URL=') { $newLines += ($lines | Where-Object { $_ -match '^AGENT_WORKER_URL=' } | Select-Object -First 1) }
[System.IO.File]::WriteAllLines($envPath, $newLines, [System.Text.UTF8Encoding]::new($false))
Write-Host "$message in .env.local. Its value was not displayed." -ForegroundColor Green
