@echo off
TITLE NeuroDetect - Clinical AI Diagnostic Suite Launcher
COLOR 0B
CLS
cd /d "%~dp0"

echo ===============================================================================
echo            NEURODETECT: BRAIN TUMOR CLINICAL DIAGNOSTIC SYSTEM
echo            Clinical-Grade Deep Learning Decision Support Platform
echo            DenseNet-121 Architecture ^& Explainable Grad-CAM Visualizer
echo ===============================================================================
echo.

echo [1/4] Checking Python 3 Environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in your system PATH.
    echo -----------------------------------------------------------------------------
    echo Setup Instructions for New Computer:
    echo 1. Download and install Python 3.10+ (or Python 3.13) from https://www.python.org
    echo 2. IMPORTANT: Check the checkbox "[X] Add Python to PATH" during installation.
    echo 3. Restart this launcher after installation finishes.
    echo -----------------------------------------------------------------------------
    pause
    exit /b 1
)

cd backend

echo [2/4] Verifying Python Virtual Environment...
if not exist venv\Scripts\python.exe (
    echo.
    echo [FIRST-TIME SETUP] Virtual environment not found. Setting up now...
    echo 1. Creating virtual environment in backend\venv...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [WARNING] Could not create virtual environment. Falling back to global Python.
        set PY_EXE=python
    ) else (
        set PY_EXE=venv\Scripts\python.exe
        echo 2. Installing required Python dependencies from requirements.txt...
        echo    (This may take 1-2 minutes on first run, please wait...)
        %PY_EXE% -m pip install --upgrade pip --quiet
        %PY_EXE% -m pip install -r requirements.txt
    )
) else (
    set PY_EXE=venv\Scripts\python.exe
)

echo [3/4] Initializing Database ^& Pre-seeded Demonstration Data...
%PY_EXE% seed_data.py
if %errorlevel% neq 0 (
    echo [WARNING] Database seed check completed with notice.
)

echo [4/4] Launching Full-Stack Application (Backend API + Pre-Compiled React PWA)...
echo.
echo ===============================================================================
echo Application is online at: http://127.0.0.1:8000
echo.
echo Direct 1-Click Role Login URLs (For Viva-Voce Demonstration):
echo   * Patient Portal:  http://127.0.0.1:8000/quick-login/patient
echo   * Doctor Portal:   http://127.0.0.1:8000/quick-login/doctor
echo   * Admin Panel:     http://127.0.0.1:8000/quick-login/admin
echo.
echo Pre-Seeded Login Credentials:
echo   * Patient:  patient@neurodetect.ai   /  Patient@123456
echo   * Doctor:   dr.rajesh@neurodetect.ai /  Doctor@123456  (or dr.smith@neurodetect.ai)
echo   * Admin:    admin@neurodetect.ai     /  Admin@123456
echo ===============================================================================
echo Opening default web browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://127.0.0.1:8000

echo Starting Uvicorn Production Server... (Press Ctrl+C to stop)
%PY_EXE% -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
