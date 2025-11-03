# Learnora - Start Both Services
# Starts both backend and frontend servers in separate windows

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Starting Learnora Platform" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "🚀 Starting Backend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-File", "$scriptPath\run-backend.ps1"

Start-Sleep -Seconds 2

Write-Host "🚀 Starting Frontend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-File", "$scriptPath\run-frontend.ps1"

Write-Host ""
Write-Host "✅ Both services are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "📍 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "📍 Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📚 API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check the separate windows for server output." -ForegroundColor Yellow
Write-Host "Close those windows to stop the servers." -ForegroundColor Yellow
