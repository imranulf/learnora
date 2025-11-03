# Fix MCP Server Path Configuration
# This script adds C:\Users\imran\.local\bin to the PATH for the current session
# and provides instructions for permanent configuration

Write-Host "="*70 -ForegroundColor Cyan
Write-Host "MCP Server Path Configuration Fix" -ForegroundColor Cyan
Write-Host "="*70 -ForegroundColor Cyan

$mcpBinPath = "C:\Users\imran\.local\bin"

# Check if the tools exist
Write-Host "`nChecking MCP tools..." -ForegroundColor Yellow
$tools = @("uvx.exe", "uv.exe", "uvw.exe")
$allExist = $true

foreach ($tool in $tools) {
    $toolPath = Join-Path $mcpBinPath $tool
    if (Test-Path $toolPath) {
        Write-Host "  ✓ Found: $tool" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Missing: $tool" -ForegroundColor Red
        $allExist = $false
    }
}

if (-not $allExist) {
    Write-Host "`n⚠️  Some tools are missing! Please install them first." -ForegroundColor Red
    exit 1
}

# Check current PATH
Write-Host "`nChecking current PATH..." -ForegroundColor Yellow
$currentPath = $env:Path

if ($currentPath -like "*$mcpBinPath*") {
    Write-Host "  ✓ MCP bin directory is already in PATH" -ForegroundColor Green
} else {
    Write-Host "  ✗ MCP bin directory is NOT in PATH" -ForegroundColor Red
    Write-Host "`nAdding to current session PATH..." -ForegroundColor Yellow
    $env:Path = "$mcpBinPath;$env:Path"
    Write-Host "  ✓ Added to session PATH" -ForegroundColor Green
}

# Test the tools
Write-Host "`nTesting MCP tools..." -ForegroundColor Yellow
try {
    $uvxVersion = & uvx --version 2>&1
    Write-Host "  ✓ uvx is accessible: $uvxVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ uvx is not accessible" -ForegroundColor Red
}

try {
    $uvVersion = & uv --version 2>&1
    Write-Host "  ✓ uv is accessible: $uvVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ uv is not accessible" -ForegroundColor Red
}

# Provide instructions for permanent fix
Write-Host ""
Write-Host ("="*70) -ForegroundColor Cyan
Write-Host "PERMANENT FIX INSTRUCTIONS" -ForegroundColor Cyan
Write-Host ("="*70) -ForegroundColor Cyan

Write-Host ""
Write-Host "Option 1: Add to User PATH (Recommended)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Run this command in PowerShell as Administrator:" -ForegroundColor White
Write-Host ""
Write-Host '[Environment]::SetEnvironmentVariable(' -ForegroundColor Gray
Write-Host '    "Path",' -ForegroundColor Gray
Write-Host "    [Environment]::GetEnvironmentVariable(`"Path`", `"User`") + `";$mcpBinPath`"," -ForegroundColor Gray
Write-Host '    "User"' -ForegroundColor Gray
Write-Host ')' -ForegroundColor Gray
Write-Host ""
Write-Host "Then restart VS Code." -ForegroundColor White

Write-Host ""
Write-Host "Option 2: VS Code Settings (Quick Fix)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Add this to your VS Code User Settings:" -ForegroundColor White
Write-Host '  (Ctrl+Shift+P -> "Preferences: Open User Settings (JSON)")' -ForegroundColor Gray
Write-Host ""
Write-Host '"terminal.integrated.env.windows": {' -ForegroundColor Gray
Write-Host "    `"PATH`": `"$mcpBinPath;`$`{env:PATH}`"" -ForegroundColor Gray
Write-Host '}' -ForegroundColor Gray
Write-Host ""
Write-Host "Then restart VS Code." -ForegroundColor White

Write-Host "`n" + ("="*70) -ForegroundColor Cyan
Write-Host "Current Session Status" -ForegroundColor Cyan
Write-Host ("="*70) -ForegroundColor Cyan
Write-Host "✓ MCP tools are accessible in THIS terminal session" -ForegroundColor Green
Write-Host "⚠️  You need to apply a permanent fix for other sessions" -ForegroundColor Yellow
Write-Host "`nRecommendation: Use Option 3 (VS Code Settings) for immediate fix" -ForegroundColor Cyan
Write-Host ("="*70) -ForegroundColor Cyan
