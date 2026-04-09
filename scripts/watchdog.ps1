$DB_PORT = 5432
$API_PORT = 3001
$CHECK_INTERVAL = 10

Write-Host "===============================" -ForegroundColor Cyan
Write-Host "🚀 MediMate Watchdog Started!" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "Monitoring:"
Write-Host " - Database (Port: $DB_PORT)"
Write-Host " - API Server (Port: $API_PORT)"
Write-Host "Polling in background (Ctrl+C to stop)..."

$global:projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
Set-Location $global:projectRoot

while ($true) {
    $currentTime = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

    $dbConnection = Test-NetConnection -ComputerName "127.0.0.1" -Port $DB_PORT -WarningAction SilentlyContinue
    if (-not $dbConnection.TcpTestSucceeded) {
        Write-Host "[$currentTime] 🚨 Error: PostgreSQL is down! Attempting recovery..." -ForegroundColor Red
        Write-Host "[$currentTime] 🔄 Running docker-compose up -d postgres..." -ForegroundColor Yellow
        docker-compose up -d postgres
        Start-Sleep -Seconds 5
    }

    $apiConnection = Test-NetConnection -ComputerName "127.0.0.1" -Port $API_PORT -WarningAction SilentlyContinue
    if (-not $apiConnection.TcpTestSucceeded) {
        Write-Host "[$currentTime] 🚨 Error: API Server is down! Attempting recovery..." -ForegroundColor Red
        Write-Host "[$currentTime] 🔄 Starting API Server..." -ForegroundColor Yellow
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd server && npm run start:dev" -WindowStyle Hidden
        Start-Sleep -Seconds 5
    }

    Start-Sleep -Seconds $CHECK_INTERVAL
}
