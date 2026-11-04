<#
.SYNOPSIS
  Starts Nexora locally: PostgreSQL + MailPit (Docker), the API and the storefront (Vite).

.DESCRIPTION
  Checks the prerequisites, starts the containers, opens the API and the frontend in their own
  PowerShell windows (close them to stop) and opens http://localhost:5173 when everything answers.
  The first run needs the one-time setup in the README (".env" and the API's user-secrets).

.EXAMPLE
  ./scripts/dev.ps1
  ./scripts/dev.ps1 -NoBrowser
#>
[CmdletBinding()]
param(
  [switch] $NoBrowser
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$apiProject = Join-Path $root 'backend/src/Nexora.Api'
$frontend = Join-Path $root 'frontend'
$apiHealthUrl = 'http://localhost:5080/health'
$storeUrl = 'http://localhost:5173'

function Assert-Command([string] $name, [string] $hint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "No se encontró '$name'. $hint"
  }
}

function Wait-Http([string] $url, [string] $label, [int] $timeoutSeconds = 180) {
  $deadline = (Get-Date).AddSeconds($timeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -eq 200) { Write-Host "  $label responde: $url" -ForegroundColor Green; return }
    } catch { Start-Sleep -Seconds 2 }
  }
  throw "$label no respondió en $timeoutSeconds s ($url). Revisa su ventana de PowerShell."
}

Write-Host 'Nexora: comprobando requisitos...' -ForegroundColor Cyan
Assert-Command 'docker' 'Instala y abre Docker Desktop.'
Assert-Command 'dotnet' 'Instala el .NET SDK 10.'
Assert-Command 'pnpm' 'Instala Node.js 22 y pnpm (npm install -g pnpm).'

if (-not (Test-Path (Join-Path $root '.env'))) {
  throw "Falta el archivo .env. Cópialo de .env.example y pon tu propia contraseña (ver README, 'Puesta en marcha')."
}

$secrets = dotnet user-secrets list --project $apiProject 2>$null
if (-not ($secrets -match '^ConnectionStrings:Nexora')) {
  throw "La API no tiene la cadena de conexión. Configúrala con 'dotnet user-secrets' (ver README, paso 2)."
}

Write-Host 'Iniciando PostgreSQL y MailPit (Docker)...' -ForegroundColor Cyan
docker compose --project-directory $root up -d --wait
if ($LASTEXITCODE -ne 0) { throw 'docker compose falló. ¿Está abierto Docker Desktop?' }

Write-Host 'Iniciando la API en una ventana nueva...' -ForegroundColor Cyan
Start-Process powershell -WorkingDirectory $root -ArgumentList @(
  '-NoExit', '-Command', "dotnet run --project '$apiProject' --launch-profile http"
)

if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
  Write-Host 'Instalando dependencias del frontend (primera vez)...' -ForegroundColor Cyan
  pnpm --dir $frontend install --frozen-lockfile
}

Write-Host 'Iniciando la tienda (Vite) en una ventana nueva...' -ForegroundColor Cyan
Start-Process powershell -WorkingDirectory $frontend -ArgumentList @('-NoExit', '-Command', 'pnpm dev')

Wait-Http $apiHealthUrl 'API'
Wait-Http $storeUrl 'Tienda'

Write-Host ''
Write-Host 'Nexora está corriendo:' -ForegroundColor Green
Write-Host "  Tienda:          $storeUrl"
Write-Host "  Panel admin:     $storeUrl/admin"
Write-Host '  API (Scalar):    http://localhost:5080/scalar'
Write-Host '  Correos (MailPit): http://localhost:8025'
Write-Host 'Para detenerla, cierra las dos ventanas de PowerShell y ejecuta: docker compose stop'

if (-not $NoBrowser) { Start-Process $storeUrl }
