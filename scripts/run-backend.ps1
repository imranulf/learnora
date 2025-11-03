# Learnora Backend Startup Script (PowerShell)
# Starts the FastAPI backend server

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Learnora Backend Server" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to core-service directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$coreServicePath = Join-Path $scriptPath "..\core-service"
Set-Location $coreServicePath

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file. Please edit it and add your API keys." -ForegroundColor Green
    Write-Host ""
}

# Check if virtual environment exists
$venvPath = Join-Path $coreServicePath ".venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "⚠️  Virtual environment not found!" -ForegroundColor Yellow
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
    Write-Host "✅ Virtual environment created." -ForegroundColor Green
    Write-Host ""
}

# Activate virtual environment
Write-Host "🔄 Activating virtual environment..." -ForegroundColor Blue
& "$venvPath\Scripts\Activate.ps1"

# Check if dependencies are installed
Write-Host "🔄 Checking dependencies..." -ForegroundColor Blue
$pipList = pip list
if ($pipList -notmatch "fastapi") {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pip install -e .
}

Write-Host ""
Write-Host "✅ Starting FastAPI server..." -ForegroundColor Green
Write-Host "📍 Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📚 API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the server
uvicorn app.main:app --reload
