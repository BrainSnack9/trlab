param(
  [string]$BaseUrl = "http://localhost:5174",
  [string]$CollectEveryMinutes = "30",
  [string]$RankTimes = "00:00,06:00,12:00,18:00"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
$LogDir = Join-Path $Root "logs"
$OutLog = Join-Path $LogDir "collector.out.log"
$ErrLog = Join-Path $LogDir "collector.err.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$env:TRLAB_URL = $BaseUrl
$env:COLLECT_EVERY_MINUTES = $CollectEveryMinutes
$env:RANK_TIMES = $RankTimes

$process = Start-Process -FilePath "node" `
  -ArgumentList "src/core/trlab/scripts/collector.js" `
  -WorkingDirectory $Root `
  -RedirectStandardOutput $OutLog `
  -RedirectStandardError $ErrLog `
  -WindowStyle Hidden `
  -PassThru

Write-Output "TrLab collector started. PID=$($process.Id)"
Write-Output "Log: $OutLog"
Write-Output "Error log: $ErrLog"
