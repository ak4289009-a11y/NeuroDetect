@echo off
TITLE NeuroDetect - Clinical AI Diagnostic Suite Launcher
COLOR 0B
CLS
echo ===============================================================================
echo            NEURODETECT: BRAIN TUMOR CAD SYSTEM (MCA MAJOR PROJECT)
echo            Student: Anuradha Kumari ^| Enrolment No: 2353902714
echo            Guide: Mr. Rafi Anwar ^| Course: MCSP-232 / BCSP-064
echo ===============================================================================
echo.
echo [1/3] Checking Python 3 Environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in system PATH.
    echo Please install Python 3.10+ or Python 3.13 from python.org and ensure
    echo 'Add Python to PATH' is checked during installation.
    pause
    exit /b 1
)

echo [2/3] Initializing Database ^& Verification...
cd backend
if exist venv\Scripts\python.exe (
    set PY_EXE=venv\Scripts\python.exe
) else (
    set PY_EXE=python
)

%PY_EXE% seed_data.py
if %errorlevel% neq 0 (
    echo [WARNING] Database seeding check completed.
)

echo [3/3] Launching Full-Stack Application (Backend API + Compiled React PWA)...
echo.
echo -------------------------------------------------------------------------------
echo Application will be available at: http://127.0.0.1:8000
echo Direct 1-Click Role Login URLs (For Viva-Voce Demonstration):
echo   * Patient Portal:  http://127.0.0.1:8000/dev-login/patient
echo   * Doctor Portal:   http://127.0.0.1:8000/dev-login/doctor
echo   * Admin Panel:     http://127.0.0.1:8000/dev-login/admin
echo.
echo Login Credentials:
echo   * Patient:  patient@neurodetect.ai   /  Patient@123456
echo   * Doctor:   dr.rajesh@neurodetect.ai /  Doctor@123456
echo   * Admin:    admin@neurodetect.ai     /  Admin@123456
echo -------------------------------------------------------------------------------
echo Opening default web browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://127.0.0.1:8000

echo Starting Uvicorn Production Server... (Press Ctrl+C to stop)
%PY_EXE% -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
