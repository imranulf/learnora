# Add Python 3.14 to System PATH
# This adds Python 3.14 to the User PATH environment variable

$pythonPath = "C:\Users\imran\AppData\Roaming\uv\python\cpython-3.14.0-windows-x86_64-none"
$scriptsPath = "C:\Users\imran\AppData\Roaming\uv\python\cpython-3.14.0-windows-x86_64-none\Scripts"

Write-Host "Adding Python 3.14 to User PATH..." -ForegroundColor Cyan

# Get current User PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

# Check if Python 3.14 is already in PATH
if ($currentPath -notlike "*$pythonPath*") {
    # Add Python 3.14 to the beginning of PATH (higher priority)
    $newPath = "$pythonPath;$scriptsPath;$currentPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "[OK] Added Python 3.14 to User PATH" -ForegroundColor Green
    Write-Host "    - $pythonPath" -ForegroundColor Gray
    Write-Host "    - $scriptsPath" -ForegroundColor Gray
} else {
    Write-Host "[SKIP] Python 3.14 is already in PATH" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Updating current session PATH..." -ForegroundColor Cyan
$env:Path = "$pythonPath;$scriptsPath;$env:Path"
Write-Host "[OK] Current session PATH updated" -ForegroundColor Green

Write-Host ""
Write-Host "Verifying Python 3.14 installation:" -ForegroundColor Cyan
& "$pythonPath\python.exe" --version
Write-Host ""

Write-Host "================================================" -ForegroundColor Green
Write-Host "Python 3.14 PATH Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "1. Close and reopen any terminals to use the updated PATH" -ForegroundColor White
Write-Host "2. You can now use 'python' or 'python3.14' commands" -ForegroundColor White
Write-Host "3. Reload VS Code window (Ctrl+Shift+P -> 'Reload Window')" -ForegroundColor White
Write-Host ""
