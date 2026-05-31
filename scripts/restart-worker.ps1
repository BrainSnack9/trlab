$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot

& (Join-Path $ScriptDir "stop-worker.ps1")
& (Join-Path $ScriptDir "start-worker.ps1")
