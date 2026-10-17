@echo off
TITLE NeuroDetect - Launch Always-Active Backend
COLOR 0A
CLS
echo ===============================================================================
echo            NEURODETECT: ALWAYS-ACTIVE PERSISTENT BACKEND SERVICE
echo ===============================================================================
echo.
echo [1/3] Checking if backend is already active on http://127.0.0.1:8000 ...
powershell -Command "$r = try { (Invoke-WebRequest -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2 -UseBasicParsing).StatusCode } catch { 0 }; exit ($r -eq 200 ? 0 : 1)" >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] NeuroDetect Backend is ALREADY ACTIVE and responding healthy!
    goto show_urls
)

echo [2/3] Launching background supervisor service (Zero Console Windows)...
wscript.exe "%~dp0START_ALWAYS_ACTIVE.vbs"

echo [3/3] Verifying backend health response (waiting up to 20 seconds for AI model initialization)...
powershell -Command "$attempts=0; while ($attempts -lt 20) { try { $res = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2; if ($res.status -eq 'ok') { Write-Host '  -> Backend is LIVE and healthy! (HTTP 200)'; exit 0 } } catch {}; Start-Sleep -Seconds 1; $attempts++ }; Write-Host '  [WARNING] Initial ping timed out. Server is still booting in background.'; exit 1"

:show_urls
echo.
echo ===============================================================================
echo   SUCCESS: NeuroDetect Backend is running in the background (ALWAYS ACTIVE)!
echo ===============================================================================
echo.
echo Access URLs:
echo   * Main Web Application: http://127.0.0.1:8000
echo   * Swagger API Docs:     http://127.0.0.1:8000/api/v1/docs
echo   * Health Endpoint:      http://127.0.0.1:8000/health
echo.
echo Quick 1-Click Role Logins:
echo   * Patient Portal:       http://127.0.0.1:8000/quick-login/patient
echo   * Doctor Portal:        http://127.0.0.1:8000/quick-login/doctor
echo   * Admin Panel:          http://127.0.0.1:8000/quick-login/admin
echo.
echo Note:
echo   - Closing this window will NOT stop the backend.
echo   - To stop the backend anytime, double-click STOP_ALWAYS_ACTIVE.bat
echo   - To check status anytime, double-click CHECK_STATUS.bat
echo ===============================================================================
pause
