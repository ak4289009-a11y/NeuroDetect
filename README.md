# NeuroDetect: Brain Tumor Detection System
### Master of Computer Applications (MCA) — Major Project (MCSP-232 / BCSP-064)
### Indira Gandhi National Open University (IGNOU)

---

### Project Information
- **Project Title**: NeuroDetect: Explainable AI & Deep Learning Computer-Aided Diagnostic System for Brain Tumor Detection
- **Student Name**: Anuradha Kumari
- **Enrolment Number**: 2353902714
- **Programme**: Master of Computer Applications (MCA)
- **Course Code**: MCSP-232 / BCSP-064
- **Project Guide**: Mr. Rafi Anwar (Assistant Professor, SOCIS, IGNOU)
- **Study Centre**: AN College, Patna (SC Code: 0501)
- **Regional Centre**: Patna (RC Code: 05)
- **Academic Year**: 2026

---

## 1. Project Overview

NeuroDetect is a full-stack clinical decision support web application developed to assist radiologists, oncologists, and patients in the detection and classification of brain tumors from axial cranial MRI scans.

### Key Capabilities:
- **Multi-Class Classification**: Accurately classifies axial brain MRI scans into four pathological categories: **Glioma**, **Meningioma**, **Pituitary Tumor**, and **No Tumor (Normal)**.
- **Explainable AI (Grad-CAM)**: Generates Gradient-weighted Class Activation Mapping (Grad-CAM) saliency heatmaps that visually highlight the anatomical regions contributing to the neural network's diagnostic decision.
- **10-Point Pre-Inference Quality Gate**: Mathematical and heuristic validation pipeline (using OpenCV) that inspects aspect ratio, skull contour morphology, contrast distribution, noise level, and axial symmetry before inference, rejecting invalid non-cranial images.
- **Role-Based Portals**:
  - **Patient Portal**: Self-service MRI upload, real-time diagnostic results, appointment booking, and tamper-evident PDF report downloads.
  - **Doctor Portal**: Specialist review queue, interactive tumor distribution charts, case confirmation, override capabilities, and clinical notes.
  - **Admin Portal**: System governance, medical council credential verification for new doctors, user management, and security audit logs.
- **Progressive Web App (PWA)**: Implements service worker caching (Cache-First static assets, Network-First API) and IndexedDB persistence for offline access.
- **Automated Clinical Reports**: Generates formal clinical PDF diagnostic reports conforming to standard radiological reporting structure.

---

## 2. Directory Structure

```
BrainTumer/
├── START_NEURODETECT.bat                      <-- 1-Click Windows Application Launcher
├── README.md                                  <-- Project Documentation & Setup Guide
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
│   │   ├── api/                               <-- REST API routes (auth, scans, doctors, admin)
│   │   ├── core/                              <-- Security, RBAC middleware, database config
│   │   ├── models/                            <-- SQLAlchemy database models
│   │   ├── schemas/                           <-- Pydantic request & response schemas
│   │   └── services/                          <-- DenseNet-121, Grad-CAM, Quality Gate, PDF
│   ├── model/
│   │   └── densenet121_brain_tumor.h5         <-- Pre-trained DenseNet-121 model weights
│   ├── tests/                                 <-- Automated test suite (22 pytest cases)
│   ├── neurodetect.db                         <-- SQLite clinical database (pre-seeded)
│   ├── seed_data.py                           <-- Database initialization script
│   └── requirements.txt                       <-- Python library dependencies
│
├── frontend/                                  <-- React 18, Vite & Tailwind CSS (PWA)
│   ├── src/                                   <-- React components and application pages
│   ├── public/                                <-- PWA manifest, service worker, icons
│   └── dist/                                  <-- Pre-compiled production bundle
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

## 3. How to Run the Project

### Option A: One-Click Startup (Recommended for Windows)
1. Double-click the file **`START_NEURODETECT.bat`** in the root directory.
2. The launcher will check Python, verify the database, start the application, and open your web browser automatically at `http://127.0.0.1:8000`.
3. *Note*: The frontend is already compiled in `frontend/dist` and served directly by the backend server, so **Node.js is not required** to run the application on the examiner's machine.

### Option B: Manual Command Line Execution
```bash
# 1. Open terminal and navigate to the backend folder
cd backend

# 2. Install required Python packages (if running on a new computer)
pip install -r requirements.txt

# 3. Initialize and seed the database
python seed_data.py

# 4. Start the server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Then open `http://127.0.0.1:8000` in any web browser (Chrome, Edge, Firefox).

---

## 4. Test Accounts & Login Credentials

The database is pre-seeded with accounts for all three roles:

| Role | Email Address | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Patient** | `patient@neurodetect.ai` | `Patient@123456` | Upload scans, view AI results, download PDF reports, book appointments |
| **Doctor** | `dr.rajesh@neurodetect.ai` | `Doctor@123456` | Review unverified scans, view Grad-CAM heatmaps, approve reports |
| **Administrator** | `admin@neurodetect.ai` | `Admin@123456` | Approve/reject doctor registrations, view user accounts, view audit logs |

> **Viva Demo Shortcut**: For rapid demonstration during the viva-voce examination, one-click login links are available:
> - Patient Portal: `http://127.0.0.1:8000/quick-login/patient`
> - Doctor Portal: `http://127.0.0.1:8000/quick-login/doctor`
> - Admin Portal: `http://127.0.0.1:8000/quick-login/admin`

---

## 5. Demonstration Workflow for Viva-Voce Examination

1. Open `http://127.0.0.1:8000` and click **Login**.
2. Sign in as a **Patient** (`patient@neurodetect.ai` / `Patient@123456`).
3. Click **Upload MRI Scan** and drag-and-drop any test image from the `sample_test_scans/` folder (e.g. `1_Glioma/mri_sample_glioma.png`).
4. Observe the **10-Point Quality Gate Validation** executing in real-time (<120ms).
5. Review the **DenseNet-121 Classification** output (tumor class, confidence percentage, 4-class distribution).
6. Inspect the localized **Grad-CAM attention heatmap** highlighting the tumor region.
7. Click **Download Diagnostic PDF** to view the auto-generated clinical report.
8. Sign out and log in as the **Doctor** (`dr.rajesh@neurodetect.ai` / `Doctor@123456`).
9. In the **Doctor Clinical Control Panel**, view the pending review queue, open the scan, add clinical sign-off notes, and click **Approve Diagnosis**.
10. Sign out and log in as the **Admin** (`admin@neurodetect.ai` / `Admin@123456`) to demonstrate the doctor approval queue and cryptographic security audit logs.

---

## 6. Running the Automated Test Suite

To verify the functional integrity of the application:
```bash
cd backend
python -m pytest tests
```
*Expected Result*: **22 passed** (validating authentication, quality gate, appointments, audit logs, and security controls).

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
