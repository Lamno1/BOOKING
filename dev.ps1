$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$web = Join-Path $root 'src\main\resources\web'
function Require-Command($name) { if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { throw "$name was not found." } }
Require-Command java; Require-Command mvn; Require-Command npm
$vite = Start-Process -FilePath npm -ArgumentList 'run','dev','--','--host','localhost','--port','5173' -WorkingDirectory $web -PassThru
try {
  $ready=$false
  1..60 | ForEach-Object { try { Invoke-WebRequest http://localhost:5173 -UseBasicParsing -TimeoutSec 1 | Out-Null; $ready=$true; break } catch { Start-Sleep -Milliseconds 500 } }
  if (-not $ready) { throw 'Vite did not become ready on port 5173.' }
  Write-Host '[STAYOS] Vite ready at http://localhost:5173' -ForegroundColor Green
  $env:STAYOS_DEV='true'
  mvn javafx:run
} finally { if ($vite -and -not $vite.HasExited) { Stop-Process $vite.Id -Force } }
