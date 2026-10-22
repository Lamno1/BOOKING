param([switch]$Demo, [string]$Database, [ValidateRange(1024,65535)][int]$Port=8080)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
  $mavenCommand = Get-Command mvn -ErrorAction SilentlyContinue
  $mavenPath = if ($mavenCommand) { $mavenCommand.Source } else { (Join-Path $env:USERPROFILE 'maven\apache-maven-3.9.9\bin\mvn.cmd') }
  & $mavenPath compile dependency:build-classpath '-Dmdep.outputFile=target/runtime-classpath.txt' -q
  if ($LASTEXITCODE -ne 0) { throw 'API build failed.' }
  if ($Demo) { $env:STAYOS_DEMO = 'true' }
  if ($Database) { $env:STAYOS_DATABASE = $Database }
  $env:STAYOS_PORT = [string]$Port
  $runtimeClasspath = (Join-Path $projectRoot 'target\classes') + ';' + (Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'target\runtime-classpath.txt')).Trim()
  & java -cp $runtimeClasspath com.stayos.app.ApiMain
} finally { Pop-Location }
