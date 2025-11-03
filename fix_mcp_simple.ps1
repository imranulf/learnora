# MCP Path Fix - Simple Version
Write-Host "MCP Server Path Configuration" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

$mcpBinPath = "C:\Users\imran\.local\bin"

# Add to current session
$env:Path = "$mcpBinPath;$env:Path"
Write-Host ""
Write-Host "[OK] Added $mcpBinPath to current session PATH" -ForegroundColor Green

# Test tools
Write-Host ""
Write-Host "Testing tools..." -ForegroundColor Yellow
& uvx --version
& uv --version

Write-Host ""
Write-Host "PERMANENT FIX NEEDED:" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Add this to VS Code User Settings (Ctrl+Shift+P > 'Open User Settings (JSON)'):" -ForegroundColor White
Write-Host ""
Write-Host '  "terminal.integrated.env.windows": {' -ForegroundColor Gray
Write-Host '    "PATH": "C:\\Users\\imran\\.local\\bin;${env:PATH}"' -ForegroundColor Gray  
Write-Host '  }' -ForegroundColor Gray
Write-Host ""
Write-Host "Then reload VS Code window (Ctrl+Shift+P > 'Reload Window')" -ForegroundColor White
