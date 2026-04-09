# Start all local MediMate services using Docker for PostgreSQL and local Node processes for API/UI.

param(
    [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendPath = Join-Path $ProjectRoot "server"
$DatabasePort = 5432
$BackendPort = 3001
$FrontendPort = 3000
$HealthUrl = "http://localhost:$BackendPort/api/health"

function Write-Status {
    param([string]$Message, [string]$Level = "INFO")

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR" { "Red" }
        default { "White" }
    }

    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Test-TcpPort {
    param([int]$Port)

    try {
        $connection = Test-NetConnection -ComputerName "127.0.0.1" -Port $Port -WarningAction SilentlyContinue
        return [bool]$connection.TcpTestSucceeded
    } catch {
        return $false
    }
}

function Wait-ForTcpPort {
    param(
        [int]$Port,
        [int]$TimeoutSeconds,
        [string]$Name
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-TcpPort -Port $Port) {
            Write-Status "$Name is listening on port $Port" "SUCCESS"
            return $true
        }

        Start-Sleep -Seconds 2
    }

    Write-Status "Timed out waiting for $Name on port $Port" "ERROR"
    return $false
}

function Test-HttpEndpoint {
    param([string]$Url)

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
            return $false
        }

        try {
            $payload = $response.Content | ConvertFrom-Json
            if ($null -ne $payload.services) {
                return (
                    $payload.services.api -eq "healthy" -and
                    $payload.services.database -eq "healthy"
                )
            }
        } catch {
            # Non-JSON responses are acceptable for generic checks.
        }

        return $true
    } catch {
        return $false
    }
}

function Wait-ForHttpEndpoint {
    param(
        [string]$Url,
        [int]$TimeoutSeconds,
        [string]$Name
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-HttpEndpoint -Url $Url) {
            Write-Status "$Name is healthy at $Url" "SUCCESS"
            return $true
        }

        Start-Sleep -Seconds 2
    }

    Write-Status "Timed out waiting for $Name health at $Url" "ERROR"
    return $false
}

function Assert-CommandExists {
    param([string]$CommandName)

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "Required command '$CommandName' was not found in PATH."
    }
}

function Start-Database {
    Write-Host ""
    Write-Host "=== Starting PostgreSQL (Docker) ===" -ForegroundColor Cyan

    Assert-CommandExists -CommandName "docker"
    Write-Status "Starting Docker PostgreSQL container..." "INFO"
    docker compose up -d postgres
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose up -d postgres failed. Ensure Docker Desktop is installed and the Docker daemon is running."
    }

    return Wait-ForTcpPort -Port $DatabasePort -TimeoutSeconds 60 -Name "PostgreSQL"
}

function Start-Backend {
    Write-Host ""
    Write-Host "=== Starting Backend Server ===" -ForegroundColor Cyan

    if (Test-HttpEndpoint -Url $HealthUrl) {
        Write-Status "Backend health endpoint is already responding" "SUCCESS"
        return $true
    }

    Assert-CommandExists -CommandName "npm"
    Write-Status "Starting NestJS backend in a new process..." "INFO"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run start:dev" -WorkingDirectory $BackendPath | Out-Null

    return Wait-ForHttpEndpoint -Url $HealthUrl -TimeoutSeconds 90 -Name "Backend API"
}

function Start-Frontend {
    Write-Host ""
    Write-Host "=== Starting Frontend Server ===" -ForegroundColor Cyan

    if (Test-TcpPort -Port $FrontendPort) {
        Write-Status "Frontend is already reachable on port $FrontendPort" "SUCCESS"
        return $true
    }

    Assert-CommandExists -CommandName "npm"
    Write-Status "Starting Vite frontend in a new process..." "INFO"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $ProjectRoot | Out-Null

    return Wait-ForTcpPort -Port $FrontendPort -TimeoutSeconds 60 -Name "Frontend"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MediMate Local Services Starter" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$databaseReady = Start-Database
if (-not $databaseReady) {
    throw "PostgreSQL did not become ready."
}

$backendReady = Start-Backend
if (-not $backendReady) {
    throw "Backend API did not become healthy."
}

$frontendReady = Start-Frontend
if (-not $frontendReady) {
    throw "Frontend dev server did not become ready."
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Startup Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PostgreSQL:  localhost:$DatabasePort"
Write-Host "Backend:     http://localhost:$BackendPort/api"
Write-Host "Health:      $HealthUrl"
Write-Host "Frontend:    http://localhost:$FrontendPort"
Write-Host ""

if ($OpenBrowser) {
    Write-Status "Opening browser..." "INFO"
    Start-Process "http://localhost:$FrontendPort"
}
