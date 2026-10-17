@echo off
TITLE NeuroDetect - Uninstall Windows Autostart
COLOR 0E
CLS
echo ===============================================================================
echo            NEURODETECT: UNINSTALL WINDOWS AUTOSTART
echo ===============================================================================
echo.

powershell -Command ^
    "$startupFolder = [System.Environment]::GetFolderPath('Startup'); " ^
    "$shortcutPath = Join-Path $startupFolder 'NeuroDetect_Backend.lnk'; " ^
    "if (Test-Path $shortcutPath) { " ^
    "    Remove-Item $shortcutPath -Force; " ^
    "    Write-Host '  [SUCCESS] Autostart shortcut removed from Windows Startup.' -ForegroundColor Green; " ^
    "} else { " ^
    "    Write-Host '  [INFO] Autostart shortcut was not found in Windows Startup.' -ForegroundColor Yellow; " ^
    "}"

echo.
echo ===============================================================================
pause
