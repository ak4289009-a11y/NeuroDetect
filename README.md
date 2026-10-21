# NeuroDetect: Brain Tumor Clinical AI Detection System

---

### Platform Information
- **System Title**: NEURODETECT: AN EXPLAINABLE DEEP LEARNING CLINICAL DECISION SUPPORT SYSTEM FOR MRI BRAIN TUMOR ANALYSIS USING DENSENET-121 AND GRAD-CAM SALIENCY MAPPING
- **System Edition**: Enterprise Healthcare Clinical Decision Support Suite
- **Core Technology**: DenseNet-121 CNN Architecture, Grad-CAM Saliency Maps, FastAPI, React
- **Architecture**: Multi-Class Classification & Visual Explainability Platform

---

## 1. Project Overview

NeuroDetect is a full-stack clinical decision support web application developed to assist radiologists, oncologists, and patients in the detection and classification of brain tumors from axial cranial MRI scans.

### Key Capabilities:
- **Multi-Class Classification**: Accurately classifies axial brain MRI scans into four pathological categories: **Glioma**, **Meningioma**, **Pituitary Tumor**, and **No Tumor (Normal)**.
- **Explainable AI (Grad-CAM)**: Generates Gradient-weighted Class Activation Mapping (Grad-CAM) saliency heatmaps that visually highlight the anatomical regions contributing to the neural network's diagnostic decision.
- **10-Point Pre-Inference Quality Gate**: Mathematical and heuristic validation pipeline (using OpenCV) that inspects aspect ratio, skull contour morphology, contrast distribution, noise level, and axial symmetry before inference, rejecting invalid non-cranial images.
- **Role-Based Portals**:
  - **Patient Portal**: Self-service MRI upload, real-time diagnostic results, explicit doctor selection, appointment booking, secure messaging, and tamper-evident PDF report downloads.
  - **Doctor Portal**: Specialist review queue (restricted strictly to patients who selected the doctor), interactive tumor distribution charts, case confirmation, override capabilities, and clinical notes.
  - **Admin Portal**: System governance, medical council credential verification for new doctors, user management, and security audit logs.
- **Progressive Web App (PWA)**: Implements service worker caching (Cache-First static assets, Network-First API) and IndexedDB persistence for offline access.
- **Automated Clinical Reports**: Generates formal clinical PDF diagnostic reports conforming to standard radiological reporting structure.

---

## 2. Directory Structure

```
BrainTumer/
├── START_NEURODETECT.bat                      <-- 1-Click Windows Application Launcher (Self-Installing)
├── README.md                                  <-- Project Documentation & Complete Setup Guide
├── RUN_INSTRUCTIONS.txt                       <-- Quick execution notes for examiners
│
├── IGNOU_MCA_PROJECT_REPORT_SUBMISSION.pdf   <-- Official 104-Page Project Report (PDF)
├── IGNOU_MCA_PROJECT_REPORT_SUBMISSION.docx  <-- Official 104-Page Project Report (Word)
│
├── sample_test_scans/                         <-- Sample MRI scans for testing and viva demo
│   ├── 1_Glioma/
│   │   └── mri_sample_glioma.png
│   ├── 2_Meningioma/
│   │   └── mri_sample_meningioma.png
│   ├── 3_Pituitary/
│   │   └── mri_sample_pituitary.png
│   └── 4_No_Tumor/
│       └── mri_sample_notumor.png
│
├── backend/                                   <-- Python FastAPI Backend & AI Pipeline
│   ├── app/
│   │   ├── api/                               <-- REST API routes (auth, scans, doctors, messages, admin)
│   │   ├── core/                              <-- Security, RBAC middleware, database config
│   │   ├── models/                            <-- SQLAlchemy database models
│   │   ├── schemas/                           <-- Pydantic request & response schemas
│   │   └── services/                          <-- DenseNet-121, Grad-CAM, Quality Gate, PDF
│   ├── model/
│   │   └── densenet121_brain_tumor.h5         <-- Pre-trained DenseNet-121 model weights
│   ├── tests/                                 <-- Automated test suite (30 pytest cases)
│   ├── neurodetect.db                         <-- SQLite clinical database (pre-seeded)
│   ├── seed_data.py                           <-- Database initialization script
│   └── requirements.txt                       <-- Python library dependencies
│
├── frontend/                                  <-- React 18, Vite & Tailwind CSS (PWA)
│   ├── src/                                   <-- React components and application pages
│   ├── public/                                <-- PWA manifest, service worker, icons
│   └── dist/                                  <-- Pre-compiled production bundle (served at port 8000)
│
├── database/
│   └── schema.sql                             <-- Relational SQL DDL schema
│
└── docs/
    ├── diagrams/                              <-- Architecture, DFD, UML, and flow diagrams
    ├── screenshots/                           <-- Desktop, tablet, and mobile UI screenshots
    └── API_DOCUMENTATION.md                   <-- Technical REST API specification
```

---

## 3. How to Run the Project on Another Computer

Follow this guide to transfer and launch the project from scratch on any computer (Windows, macOS, or Linux).

### 3.1 Prerequisites Checklist

1. **Python 3.10+** (Python 3.10, 3.11, 3.12, or 3.13)
   - Download from: [python.org/downloads](https://www.python.org/downloads/)
   - **Crucial for Windows**: During installation, tick the checkbox **"Add python.exe to PATH"**.
2. **Git** *(Optional if transferring folder via USB or ZIP archive)*:
   - Download from: [git-scm.com](https://git-scm.com/)
3. **Node.js 18+** *(Optional)*:
   - **Node.js is NOT required** for standard execution because the React frontend is already pre-compiled into `frontend/dist` and served directly by the backend.
   - Node.js is only needed if you want to modify React frontend code or run the Vite hot-reloading development server.

---

### 3.2 Method A: 1-Click Startup (Recommended for Windows)

The easiest and fastest method on any Windows PC:

1. Copy or extract the `BrainTumer` project folder to the target computer.
2. Double-click **`START_NEURODETECT.bat`** in the root directory.
3. **What happens automatically**:
   - Checks if Python 3 is installed.
   - Automatically creates the Python virtual environment (`backend\venv`) if missing.
   - Automatically installs required dependencies from `backend\requirements.txt` on first launch.
   - Initializes and verifies the SQLite database (`backend\seed_data.py`).
   - Launches the FastAPI backend server hosting both the AI API and compiled React interface.
   - Automatically opens your default web browser to `http://127.0.0.1:8000`.

---

### 3.3 Method B: Command Line Setup (Windows PowerShell / CMD / macOS / Linux)

If you prefer using the terminal or are running on macOS/Linux:

#### Step 1: Open Terminal & Navigate to Backend
```bash
# Navigate to the project backend directory
cd BrainTumer/backend
```

#### Step 2: Create and Activate Virtual Environment
- **Windows (PowerShell)**:
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
  *(If PowerShell displays a script execution policy restriction, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first).*

- **Windows (Command Prompt / cmd.exe)**:
  ```cmd
  python -m venv venv
  venv\Scripts\activate.bat
  ```

- **macOS / Linux (bash/zsh)**:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

#### Step 3: Install Required Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### Step 4: Seed the Database
```bash
python seed_data.py
```

#### Step 5: Start the Server
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

#### Step 6: Access the Application
Open your web browser and navigate to:
```
http://127.0.0.1:8000
```

---

### 3.4 Method C: Full-Stack Development Mode (Vite Hot-Reload + FastAPI)

Use this method when actively developing or modifying frontend and backend code simultaneously:

1. **Terminal 1 — Backend API Server (Port 8000)**:
   ```bash
   cd BrainTumer/backend
   .\venv\Scripts\activate
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

2. **Terminal 2 — Frontend Vite Dev Server (Port 3000)**:
   ```bash
   cd BrainTumer/frontend
   npm install
   npm run dev
   ```

3. Open **`http://localhost:3000`** in your browser. All UI edits will hot-reload instantly.

---

### 3.5 Method D: VS Code 1-Click Execution

The project includes pre-configured VS Code tasks and launch configurations in `.vscode/`:

1. Open the **`BrainTumer`** directory in Visual Studio Code.
2. Select your Python interpreter: Press `Ctrl + Shift + P` -> `Python: Select Interpreter` -> choose `.\backend\venv\Scripts\python.exe`.
3. **One-Click Run**:
   - Press `Ctrl + Shift + B` (Build / Run Task).
   - Select **"Run Backend Server (Port 8000)"** or **"Run Full-Stack (Backend + Frontend)"**.
4. **Debug Mode**:
   - Press `F5` to start debugging with the Python debugger attached.

---

### 3.6 Troubleshooting & Common Issues

| Issue / Error | Cause | Solution |
| :--- | :--- | :--- |
| **`[WinError 10013]` or Port 8000 already in use** | A previous server instance or background task is occupying port 8000. | In PowerShell run:<br>`Get-Process python -ErrorAction SilentlyContinue \| Stop-Process -Force`<br>Or launch on another port:<br>`python -m uvicorn app.main:app --host 127.0.0.1 --port 8001` |
| **`scripts is disabled on this system` (PowerShell)** | Windows PowerShell default execution policy blocks activating `venv`. | Run this command once in PowerShell:<br>`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`<br>Then run `.\venv\Scripts\Activate.ps1`. |
| **`'python' is not recognized`** | Python was installed without the PATH environment variable enabled. | Re-run the Python installer, select **Modify**, and ensure **"Add Python to PATH"** is checked. |
| **Model weights download / missing** | First run loads model weights. | DenseNet weights are included locally in `backend/model/densenet121_brain_tumor.h5`. |

---

## 4. Test Accounts & Login Credentials

The database is pre-seeded with accounts for all three roles:

| Role | Email Address | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Patient** | `patient@neurodetect.ai` | `Patient@123456` | Select doctor, upload scans, view AI results, download PDF reports, book appointments, message doctor |
| **Doctor** | `dr.rajesh@neurodetect.ai`<br>*(also `dr.smith@neurodetect.ai`)* | `Doctor@123456` | Review scans strictly for patients who selected this doctor, Grad-CAM inspection, clinical notes |
| **Administrator** | `admin@neurodetect.ai` | `Admin@123456` | Approve/reject doctor registrations, view user accounts, system security audit logs |

> **Viva Demo Shortcut**: For rapid demonstration during the viva-voce examination, one-click login links are available:
> - Patient Portal: `http://127.0.0.1:8000/quick-login/patient`
> - Doctor Portal: `http://127.0.0.1:8000/quick-login/doctor`
> - Admin Portal: `http://127.0.0.1:8000/quick-login/admin`

---

## 5. Demonstration Workflow for Viva-Voce Examination

1. Open `http://127.0.0.1:8000` and click **Login**.
2. Sign in as a **Patient** (`patient@neurodetect.ai` / `Patient@123456`).
3. Under the **Doctor Selection** section, view approved doctors and choose your assigned specialist.
4. Click **Upload MRI Scan** and drag-and-drop any test image from the `sample_test_scans/` folder (e.g. `1_Glioma/mri_sample_glioma.png`).
5. Observe the **10-Point Quality Gate Validation** executing in real-time (<120ms).
6. Review the **DenseNet-121 Classification** output (tumor class, confidence percentage, 4-class distribution).
7. Inspect the localized **Grad-CAM attention heatmap** highlighting the tumor region.
8. Click **Download Diagnostic PDF** to view the auto-generated clinical report.
9. Sign out and log in as the **Doctor** (`dr.rajesh@neurodetect.ai` / `Doctor@123456`).
10. In the **Doctor Clinical Control Panel**, view the patient's scans, add clinical sign-off notes, and click **Approve Diagnosis**.
11. Sign out and log in as the **Admin** (`admin@neurodetect.ai` / `Admin@123456`) to demonstrate doctor credential approval and cryptographic security audit logs.

---

## 6. Running the Automated Test Suite

To verify the functional integrity, RBAC security, and patient-selected doctor isolation rules:

```bash
cd backend
python -m pytest tests
```

*Expected Result*: **30 passed** (0 failures, 100% test pass rate):
- `tests/test_patient_selected_doctor.py` (6 tests: Doctor selection, private data isolation, access revocation, multi-channel messaging).
- `tests/test_appointments_and_scans.py` (7 tests: Appointment scheduling, MRI processing, quality gate).
- `tests/test_audit.py` (5 tests: Cryptographic audit trails, tamper detection, security logs).
- `tests/test_brevo_otp.py` (12 tests: Password reset OTP lifecycle, TTL expiration, rate limiting).

---

## 7. Technology Stack Summary

- **Programming Language**: Python 3.13, JavaScript (ES6+)
- **Backend Framework**: FastAPI (ASGI with Uvicorn)
- **Deep Learning Model**: PyTorch DenseNet-121 (Convolutional Neural Network)
- **Explainable AI (XAI)**: Grad-CAM (Target layer: `features.denseblock4`)
- **Computer Vision**: OpenCV (Pre-inference 10-point mathematical quality gate)
- **Database**: SQLite (SQLAlchemy ORM with schema migrations)
- **Frontend Framework**: React 18, Vite, Tailwind CSS, Lucide Icons, Recharts
- **Offline / PWA**: Service Worker (`sw.js`), Web App Manifest (`manifest.json`), IndexedDB
- **PDF Generation**: ReportLab
- **Authentication**: JWT (JSON Web Tokens) with Bcrypt password hashing
