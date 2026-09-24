$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$web = Join-Path $root 'src\main\resources\web'
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm was not found. Install Node.js first.' }
Write-Host "[STAYOS] Vite: http://localhost:5173" -ForegroundColor Cyan
Push-Location $web
try { npm run dev -- --host localhost --port 5173 } finally { Pop-Location }
