@echo off
TITLE NeuroDetect - Install Windows Autostart
COLOR 0B
CLS
echo ===============================================================================
echo            NEURODETECT: INSTALL WINDOWS AUTOSTART (ALWAYS ACTIVE)
echo ===============================================================================
echo.
echo This will configure NeuroDetect backend to start automatically in the
echo background whenever your computer starts up or you log into Windows.
echo.

powershell -Command ^
    "$startupFolder = [System.Environment]::GetFolderPath('Startup'); " ^
    "$targetVbs = Join-Path '%~dp0' 'START_ALWAYS_ACTIVE.vbs'; " ^
    "$shortcutPath = Join-Path $startupFolder 'NeuroDetect_Backend.lnk'; " ^
    "$wshShell = New-Object -ComObject WScript.Shell; " ^
    "$shortcut = $wshShell.CreateShortcut($shortcutPath); " ^
    "$shortcut.TargetPath = 'wscript.exe'; " ^
    "$shortcut.Arguments = '`\"' + $targetVbs + '`\"'; " ^
    "$shortcut.WorkingDirectory = '%~dp0'; " ^
    "$shortcut.Description = 'NeuroDetect Always-Active Backend Service'; " ^
    "$shortcut.Save(); " ^
    "Write-Host '  [SUCCESS] Autostart shortcut created at:' -ForegroundColor Green; " ^
    "Write-Host ('    ' + $shortcutPath)"

echo.
echo ===============================================================================
echo NeuroDetect backend is now set to start automatically on Windows boot!
echo To remove autostart at any time, run UNINSTALL_WINDOWS_AUTOSTART.bat
echo ===============================================================================
echo.
pause
