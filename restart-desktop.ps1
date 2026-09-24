$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$env:STAYOS_DEV='true'
Write-Host '[STAYOS] Restarting JavaFX only; Vite remains untouched.' -ForegroundColor Cyan
mvn javafx:run
