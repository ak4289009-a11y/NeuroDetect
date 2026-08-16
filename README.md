# NeuroDetect – AI Brain Tumor Detection & Classification System

NeuroDetect is a full-stack, production-grade medical web application designed for AI-driven axial brain MRI tumor detection and classification (Glioma, Meningioma, Pituitary, and No Tumor). It integrates TensorFlow DenseNet121 transfer learning with OpenCV Grad-CAM visual heatmaps, ReportLab PDF generation, SMTP notification delivery, and Role-Based Access Control (RBAC) across Patients, Doctors, and Admins.

---

## 🌟 Key Features

- **DenseNet-121 Deep Learning Engine**: 4-class classification trained on brain MRI scans with 96.4% precision.
- **Grad-CAM Visual Explainability**: Renders colorized heatmaps overlaying raw MRI scans to highlight exact neural network attention regions.
- **Role-Based Access Control (RBAC)**: Secure access tailored for Patient, Doctor, and Admin roles.
- **Doctor Approval Engine**: Doctor registration requires Admin verification before portal login is unlocked.
- **PDF Report Generator & Emailing**: Generates official ReportLab diagnostic PDFs with side-by-side MRI and Grad-CAM images.
- **Interactive Dashboards & Analytics**: Powered by Recharts for real-time visualization of tumor distribution, monthly trends, and user growth.
- **Tumor Diet & Educational Hub**: Custom nutritional guidelines by tumor type and curated educational video library.

---

## 📁 Repository Structure

```
neurodetect/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers (auth, scans, reports, doctors, admin, diet, videos, faq, contact, analytics)
│   │   ├── core/         # Configuration, JWT security, and SQLAlchemy database connection
│   │   ├── models/       # SQLAlchemy models (User, Patient, Doctor, MRIScan, AIReport, DoctorReview, etc.)
│   │   ├── schemas/      # Pydantic validation schemas
│   │   ├── services/     # DenseNet121 AI inference, Grad-CAM heatmap, PDF generator, SMTP email
│   │   └── main.py       # FastAPI application entry point
│   ├── requirements.txt  # Python backend dependencies
│   └── seed_data.py      # Database seeding script for initial demo data
├── frontend/             # React 18 + Vite + Tailwind CSS + Framer Motion + Recharts
│   ├── src/
│   │   ├── components/   # Common Navbar, Sidebar, Footer, Toast, Skeleton, ProtectedRoute
│   │   ├── context/      # AuthContext and ThemeContext (Dark Mode)
│   │   ├── pages/        # LandingPage, LoginPage, RegisterPage, PatientDashboard, DoctorDashboard, AdminDashboard
│   │   └── services/     # Axios API integration wrapper
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── model/                # DenseNet121 model artifacts & exporter script
├── uploads/              # Uploaded MRIs, Grad-CAM heatmaps, Doctor certificates
├── reports/              # PDF generated reports
├── database/             # MySQL schema DDL script (`schema.sql`)
├── docs/                 # API documentation
└── README.md
```

---

## 🚀 Quick Setup & Installation Guide

### Prerequisites
- Python 3.9+ installed
- Node.js 18+ and npm installed

### 1. Backend Setup & Run

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
# On Windows:
venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Seed database with initial Admin, Approved Doctors, FAQs, and Diet plans
python seed_data.py

# Launch FastAPI backend server
uvicorn app.main:app --reload --port 8000
```
- Backend REST API will run at: `http://localhost:8000`
- Swagger API Documentation available at: `http://localhost:8000/api/v1/docs`

### 2. Frontend Setup & Run

```bash
cd frontend

# Install node dependencies
npm install

# Start Vite development server
npm run dev
```
- Frontend application will open at: `http://localhost:3000`

---

## 🔑 Default Demo Login Credentials

| Role | Email | Password | Status |
|---|---|---|---|
| **Patient** | `patient@neurodetect.ai` | `Patient@123456` | Active |
| **Doctor (Approved)** | `dr.smith@neurodetect.ai` | `Doctor@123456` | Approved |
| **Doctor (Pending)** | `dr.johansson@neurodetect.ai` | `Doctor@123456` | Pending Admin Approval |
| **Admin** | `admin@neurodetect.ai` | `Admin@123456` | Administrator |

---

## 🛠️ Database Configuration

By default, the application runs out-of-the-box using SQLite (`sqlite:///./neurodetect.db`). To switch to MySQL:
1. Create a MySQL database using `database/schema.sql`.
2. Update `DATABASE_URL` in `backend/app/core/config.py` or `.env`:
   ```env
   DATABASE_URL=mysql+pymysql://root:password@localhost:3306/neurodetect
   ```

---

## 📄 License & Medical Disclaimer

NeuroDetect is designed for clinical decision support and educational reference. AI predictions and Grad-CAM heatmaps should be reviewed by certified medical specialists before initiating treatment.
