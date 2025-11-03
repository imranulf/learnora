# Learnora Frontend Startup Script (PowerShell)
# Starts the React development server

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Learnora Frontend Server" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to learner-web-app directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendPath = Join-Path $scriptPath "..\learner-web-app"
Set-Location $frontendPath

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file." -ForegroundColor Green
    Write-Host ""
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules not found!" -ForegroundColor Yellow
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Dependencies installed." -ForegroundColor Green
    Write-Host ""
}

Write-Host ""
Write-Host "✅ Starting React development server..." -ForegroundColor Green
Write-Host "📍 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔗 Backend API: http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the development server
npm run dev
