# NeuroDetect — Clinical Web Interface & Radiologist Workstation

The frontend of **NeuroDetect** is a responsive Single-Page Application (SPA) built using **React 18**, **Vite**, and **Tailwind CSS**. It provides specialized clinical portals tailored for patients, attending neuro-oncologists, and hospital administrators.

---

## Technical Stack & Libraries

- **Framework**: React 18.2 (Hooks, Functional Components, Context API)
- **Bundler & Dev Server**: Vite 4.5+ (Hot Module Replacement, ESBuild optimization)
- **Styling & Design System**: Tailwind CSS 3.3 with custom medical slate/blue palette
- **Iconography**: Lucide React (High-legibility medical and administrative glyphs)
- **Data Visualizations**: Recharts (Diagnostic confidence distributions, monthly patient trends)
- **HTTP Client**: Axios with interceptors for JWT Bearer token authentication
- **Client-Side Routing**: React Router v6 with strict ProtectedRoute RBAC guards

---

## Directory Architecture

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/         # Navbar, Sidebar, StatusBadge, ProgressBar, Toast, Modal
│   │   ├── patient/        # MriUploadBox, ScanHistoryTable, ReportViewer
│   │   ├── doctor/         # TriageQueueTable, SaliencyInspector, PrescriptionForm
│   │   └── admin/          # DoctorApprovalTable, SystemMetricsCards, AuditLedger
│   ├── context/
│   │   ├── AuthContext.jsx # Global user authentication state, tokens, role tracking
│   │   └── ThemeContext.jsx# Interface theme and accessibility preferences
│   ├── pages/
│   │   ├── LandingPage.jsx     # Clinical overview, SaMD guidelines, doctor directory
│   │   ├── LoginPage.jsx       # Role-separated authentication with eye toggle buttons
│   │   ├── RegisterPage.jsx    # Patient registration & Doctor license onboarding
│   │   ├── PatientDashboard.jsx# MRI upload workspace & verified reports download
│   │   ├── DoctorDashboard.jsx # Specialist clinical triage, Grad-CAM viewer & notes
│   │   └── AdminDashboard.jsx  # Credential verification, account audit & health metrics
│   ├── services/
│   │   └── api.js              # Centralized Axios client connecting to FastAPI backend
│   ├── App.jsx                 # Route declarations & Role-based Protected Route wrappers
│   ├── main.jsx                # DOM mounting & context provider bootstrapping
│   └── index.css               # Tailwind directives and custom animation styles
├── index.html                  # HTML5 shell with OpenGraph and viewport metadata
├── package.json                # Project dependencies and npm scripts
├── vite.config.js              # Vite compiler config & `/api` reverse proxy rules
└── tailwind.config.js          # Extended color palettes, breakpoints, and plugins
```

---

## Role-Based Workspaces

### 1. Patient Self-Service Portal
- **Drag-and-Drop MRI Upload**: Validates file format (PNG/JPEG) and limits file size to $\le 15\text{ MB}$.
- **Diagnostic Progress Tracker**: Real-time status badges (`Processing`, `AI Analyzed`, `Doctor Verified`).
- **Verified PDF Reports**: One-click download of finalized, electronically signed clinical reports.
- **Asynchronous Teleconsultation**: Direct, encrypted query messaging with attending specialists.

### 2. Doctor / Radiologist Workstation
- **Clinical Triage Queue**: Sorts assigned patient studies by upload time, urgency, and AI confidence score.
- **Grad-CAM Activation Interrogation**: Interactive visual viewer allowing clinicians to examine the exact neural attention focus areas overlaid on cranial MRI slices.
- **Clinical Impressions & Prescriptions**: Form fields for writing confirmed diagnostic notes, recommended medications, dosage, and duration.
- **Digital Sign-off**: Finalizes the medical report and issues an electronic signature seal.

### 3. Hospital Administration Console
- **Physician Credential Verification**: Evaluates medical license numbers and approves or suspends doctor accounts.
- **Security Audit Ledger**: Live log inspection recording user logins, failed attempts, and data access events with IP addresses.
- **System Telemetry**: Visual charts summarizing diagnostic category ratios, average AI inference latency, and platform uptime.

---

## Setup & Running Instructions

### 1. Install Node Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
The application will launch on [http://localhost:3000](http://localhost:3000). All API requests (`/api/*`), uploads (`/uploads/*`), and reports (`/reports/*`) are automatically proxied to the backend at `http://127.0.0.1:8000`.

### 3. Production Compilation
```bash
npm run build
```
Creates an optimized production bundle in the `dist/` directory ready for deployment on Nginx, Apache, or static hosting providers.
