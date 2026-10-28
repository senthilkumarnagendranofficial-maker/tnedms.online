# TNEDMS End-to-End Testing Runner
# PowerShell script to run automated E2E tests

param(
    [switch]$Staging,
    [switch]$Cleanup,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

function Show-Help {
    Write-Host ""
    Write-Host "TNEDMS End-to-End Testing Runner" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\run-tests.ps1                Run tests against local environment"
    Write-Host "  .\run-tests.ps1 -Staging       Run tests against staging (tnedms.online)"
    Write-Host "  .\run-tests.ps1 -Cleanup       Clean up test data from database"
    Write-Host "  .\run-tests.ps1 -Help          Show this help message"
    Write-Host ""
    Write-Host "Prerequisites:"
    Write-Host "  • Backend server running (npm start in backend/)"
    Write-Host "  • Frontend dev server running (npm run dev in frontend/)"
    Write-Host "  • MongoDB running locally or accessible"
    Write-Host "  • node-fetch installed (npm install node-fetch)"
    Write-Host ""
}

function Test-Prerequisites {
    Write-Host "Checking prerequisites..." -ForegroundColor Yellow
    
    # Check if Node.js is available
    try {
        $nodeVersion = node --version
        Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "✗ Node.js not found. Please install Node.js" -ForegroundColor Red
        exit 1
    }
    
    # Check if backend .env exists
    if (Test-Path "backend\.env") {
        Write-Host "✓ Backend .env found" -ForegroundColor Green
    } else {
        Write-Host "✗ Backend .env not found. Copy from .env.example" -ForegroundColor Red
        exit 1
    }
    
    # Check if node-fetch is installed
    if (Test-Path "node_modules\node-fetch") {
        Write-Host "✓ node-fetch installed" -ForegroundColor Green
    } else {
        Write-Host "⚠ node-fetch not found. Installing..." -ForegroundColor Yellow
        npm install node-fetch
    }
    
    Write-Host ""
}

function Test-Servers {
    param([string]$BaseUrl, [string]$ApiUrl)
    
    Write-Host "Testing server connectivity..." -ForegroundColor Yellow
    
    # Test frontend
    try {
        $frontendResponse = Invoke-WebRequest -Uri $BaseUrl -Method Head -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✓ Frontend accessible at $BaseUrl" -ForegroundColor Green
    } catch {
        Write-Host "✗ Frontend not accessible at $BaseUrl" -ForegroundColor Red
        Write-Host "  Make sure frontend dev server is running: npm run dev" -ForegroundColor Yellow
        if (-not $Staging) {
            exit 1
        }
    }
    
    # Test backend
    try {
        $backendResponse = Invoke-WebRequest -Uri "$ApiUrl/api/health" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
        Write-Host "✓ Backend accessible at $ApiUrl" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Backend health check not accessible (this may be normal)" -ForegroundColor Yellow
        Write-Host "  Make sure backend is running: npm start" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

function Run-Tests {
    param([string]$BaseUrl, [string]$ApiUrl)
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  TNEDMS End-to-End Automated Testing" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Testing Environment:" -ForegroundColor Yellow
    Write-Host "  Frontend: $BaseUrl"
    Write-Host "  Backend:  $ApiUrl"
    Write-Host ""
    Write-Host "Press Ctrl+C to cancel, or wait 3 seconds to continue..."
    Start-Sleep -Seconds 3
    Write-Host ""
    
    # Set environment variables
    $env:TEST_BASE_URL = $BaseUrl
    $env:TEST_API_URL = $ApiUrl
    
    # Run the test script
    node e2e-testing-automation.mjs
    
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    
    if ($exitCode -eq 0) {
        Write-Host "  Tests completed! Check e2e-test-report.json for details" -ForegroundColor Green
    } else {
        Write-Host "  Tests failed with exit code: $exitCode" -ForegroundColor Red
    }
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
}

function Run-Cleanup {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  Test Data Cleanup" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  WARNING: This will delete test data from the database" -ForegroundColor Yellow
    Write-Host ""
    
    $confirmation = Read-Host "Type 'yes' to proceed with cleanup"
    
    if ($confirmation -eq 'yes') {
        node cleanup-test-data.mjs --force
    } else {
        Write-Host "Cleanup cancelled" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# Main execution
Clear-Host

if ($Help) {
    Show-Help
    exit 0
}

if ($Cleanup) {
    Run-Cleanup
    exit 0
}

# Determine URLs based on environment
if ($Staging) {
    $baseUrl = "https://tnedms.online"
    $apiUrl = "https://tnedms.online"
    Write-Host ""
    Write-Host "⚠️  STAGING MODE: Tests will run against tnedms.online" -ForegroundColor Yellow
    Write-Host "⚠️  This will create REAL data on the staging server!" -ForegroundColor Yellow
    Write-Host ""
    $confirmation = Read-Host "Type 'yes' to proceed"
    if ($confirmation -ne 'yes') {
        Write-Host "Tests cancelled" -ForegroundColor Yellow
        exit 0
    }
} else {
    $baseUrl = "http://localhost:5173"
    $apiUrl = "http://127.0.0.1:5000"
}

# Run prerequisites check
Test-Prerequisites

# Test server connectivity
Test-Servers -BaseUrl $baseUrl -ApiUrl $apiUrl

# Run the tests
Run-Tests -BaseUrl $baseUrl -ApiUrl $apiUrl
