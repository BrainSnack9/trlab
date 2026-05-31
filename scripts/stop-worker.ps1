$ErrorActionPreference = "Stop"

$workers = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
  Where-Object { $_.CommandLine -match "scripts[\\/]+collector\.js" }

if (-not $workers) {
  Write-Output "No TrLab collector worker is running."
  exit 0
}

foreach ($worker in $workers) {
  Stop-Process -Id $worker.ProcessId -Force
  Write-Output "Stopped TrLab collector worker. PID=$($worker.ProcessId)"
}
