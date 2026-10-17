@echo off
TITLE NeuroDetect - Stop Backend Service
COLOR 0C
CLS
echo ===============================================================================
echo            NEURODETECT: STOPPING BACKGROUND BACKEND SERVICE
echo ===============================================================================
echo.
echo Stopping backend processes on port 8000 and watchdog supervisor...

powershell -Command ^
    "$conns = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue; " ^
    "if ($conns) { " ^
    "    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 4 }; " ^
    "    foreach ($p in $pids) { " ^
    "        try { Stop-Process -Id $p -Force; Write-Host ('  Stopped process PID ' + $p) } catch {} " ^
    "    } " ^
    "}; " ^
    "$pidFile = Join-Path '%~dp0backend' 'backend.pid'; " ^
    "if (Test-Path $pidFile) { " ^
    "    $wpid = (Get-Content $pidFile).Trim(); " ^
    "    try { Stop-Process -Id $wpid -Force; Write-Host ('  Stopped watchdog PID ' + $wpid) } catch {}; " ^
    "    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue; " ^
    "}"

echo.
echo ===============================================================================
echo NeuroDetect backend processes have been stopped.
echo ===============================================================================
pause
