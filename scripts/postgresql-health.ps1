# PostgreSQL Health Check and Auto-Restart Script
# Location: d:\Trae\MediMate\medimate\scripts\postgresql-health.ps1

param(
    [switch]$AutoRestart,
    [switch]$Watch,
    [int]$WatchInterval = 30
)

$ErrorActionPreference = "Continue"

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

function Test-PostgreSQLConnection {
    try {
        $result = & "$env:PGBIN\bin\pg_isready.exe" -h localhost -p 5432 -U postgres -w 2>&1
        if ($LASTEXITCODE -eq 0) {
            return @{ Status = $true; Message = "Database is ready" }
        } else {
            return @{ Status = $false; Message = "Database is not responding" }
        }
    } catch {
        return @{ Status = $false; Message = $_.Exception.Message }
    }
}

function Start-PostgreSQLIfNeeded {
    $service = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue

    if ($null -eq $service) {
        Write-Status "PostgreSQL service not found" "ERROR"
        return $false
    }

    if ($service.Status -eq "Running") {
        $conn = Test-PostgreSQLConnection
        if ($conn.Status) {
            Write-Status "PostgreSQL service is running and accepting connections" "SUCCESS"
            return $true
        } else {
            Write-Status "PostgreSQL service is running but not accepting connections" "WARNING"
        }
    }

    if ($AutoRestart) {
        Write-Status "Attempting to start PostgreSQL service..." "WARNING"

        # Try to start the Windows service
        try {
            Start-Service -Name "postgresql-x64-18" -ErrorAction Stop
            Start-Sleep -Seconds 3

            # Verify connection
            $conn = Test-PostgreSQLConnection
            if ($conn.Status) {
                Write-Status "PostgreSQL service started successfully" "SUCCESS"
                return $true
            }
        } catch {
            Write-Status "Failed to start PostgreSQL via service: $($_.Exception.Message)" "ERROR"
        }

        # Fallback: try pg_ctl directly
        try {
            Write-Status "Trying pg_ctl direct start..." "WARNING"
            & "D:\PostgreSQL\bin\pg_ctl.exe" start -D "D:\PostgreSQL\data" -l "D:\PostgreSQL\data\logfile.txt" -w
            Start-Sleep -Seconds 3

            $conn = Test-PostgreSQLConnection
            if ($conn.Status) {
                Write-Status "PostgreSQL started via pg_ctl" "SUCCESS"
                return $true
            }
        } catch {
            Write-Status "Failed to start PostgreSQL via pg_ctl: $($_.Exception.Message)" "ERROR"
        }

        return $false
    }

    return $false
}

function Get-PostgreSQLStatus {
    $service = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
    $portCheck = netstat -ano | Select-String "5432.*LISTEN" | Select-Object -First 1

    Write-Host ""
    Write-Host "=== PostgreSQL Status ===" -ForegroundColor Cyan
    Write-Host "Service Name: postgresql-x64-18"
    Write-Host "Service Status: $($service.Status)"
    Write-Host "Startup Type: $($service.StartType)"
    Write-Host "Port 5432: $(if ($portCheck) { 'LISTENING' } else { 'NOT LISTENING' })"

    $conn = Test-PostgreSQLConnection
    Write-Host "Connection Test: $($conn.Message)"

    return @{
        ServiceRunning = ($service.Status -eq "Running")
        PortListening = ($null -ne $portCheck)
        CanConnect = $conn.Status
    }
}

# Main logic
if ($Watch) {
    Write-Status "Starting PostgreSQL health monitor (checking every $WatchInterval seconds)" "INFO"
    Write-Status "Press Ctrl+C to stop" "INFO"

    try {
        while ($true) {
            $status = Get-PostgreSQLStatus
            if (-not $status.CanConnect) {
                Write-Status "PostgreSQL is not healthy, attempting restart..." "WARNING"
                Start-PostgreSQLIfNeeded
            }
            Start-Sleep -Seconds $WatchInterval
        }
    } catch {
        Write-Status "Monitor stopped" "INFO"
    }
} else {
    $status = Get-PostgreSQLStatus

    if (-not $status.CanConnect -and $AutoRestart) {
        Start-PostgreSQLIfNeeded
    }

    # Exit with appropriate code
    if ($status.CanConnect) {
        exit 0
    } else {
        exit 1
    }
}
