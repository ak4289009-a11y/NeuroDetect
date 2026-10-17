@echo off
TITLE NeuroDetect - Service Status Monitor
COLOR 0B
CLS
echo ===============================================================================
echo            NEURODETECT: BACKEND HEALTH ^& STATUS MONITOR
echo ===============================================================================
echo.

if exist "%~dp0backend\venv\Scripts\python.exe" (
    set PY_EXE=%~dp0backend\venv\Scripts\python.exe
) else (
    set PY_EXE=python.exe
)

"%PY_EXE%" "%~dp0backend\check_status.py"

echo.
echo Recent Service Logs (backend\backend_service.log):
echo -------------------------------------------------------------------------------
if exist "%~dp0backend\backend_service.log" (
    powershell -Command "Get-Content '%~dp0backend\backend_service.log' -Tail 10"
) else (
    echo (No log file generated yet)
)
echo ===============================================================================
echo.
pause
