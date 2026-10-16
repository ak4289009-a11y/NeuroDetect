# NeuroDetect — Backend Service & Deep Inference Architecture

The backend of **NeuroDetect** is built with **FastAPI**, **PyTorch**, **SQLAlchemy**, and **ReportLab**. It provides deep learning axial brain MRI classification, Grad-CAM neural attention heatmap generation, medical report compilation, transactional email delivery (Brevo SMTP), and multi-tier Role-Based Access Control (RBAC).

---

## Technical Stack & Libraries

- **Language / Runtime**: Python 3.11 to 3.13 (FastAPI 0.100+ ASGI framework)
- **Deep Neural Engine**: PyTorch & Torchvision (DenseNet-121 Transfer Learning Backbone)
- **Computer Vision Pre-Filter**: OpenCV (`opencv-python` / `opencv-python-headless`)
- **Database & ORM**: SQLite / PostgreSQL with SQLAlchemy 2.0 and Pydantic v2 schemas
- **Diagnostic PDF Generation**: ReportLab 4.1+ Vector Compiler with SHA-256 digital seals
- **Authentication & Security**: Passlib (Bcrypt hashing, 12 rounds), Python-Jose (HS256 JWT tokens)
- **Email Gateway**: Brevo SMTP (Port 587, STARTTLS, 6-digit OTP codes)
- **Test Suite**: PyTest 8.x with FastAPI TestClient and RBAC matrix assertion suites

---

## Directory Architecture

```
backend/
├── app/
│   ├── api/
│   │   ├── auth.py          # User registration, OTP dispatch, login, password recovery
│   │   ├── scans.py         # Multipart MRI upload, pre-filter, inference, Grad-CAM
│   │   ├── doctors.py       # Assigned scans triage, clinical notes, prescriptions
│   │   ├── admin.py         # Physician approvals, audit ledger, system telemetry
│   │   ├── reports.py       # Diagnostic PDF generation and authenticated streaming
│   │   ├── appointments.py  # Consultation scheduling, status transitions
│   │   └── chat.py          # Secure messaging between patients and doctors
│   ├── core/
│   │   ├── config.py        # Pydantic Settings (environment configuration)
│   │   ├── database.py      # SQLAlchemy engine, session factories, declarative base
│   │   ├── security.py      # Bcrypt password hashing, JWT creation & decoding
│   │   └── authorization.py # RBAC middleware, get_current_user, role guard dependencies
│   ├── models/
│   │   └── models.py        # SQLAlchemy relational ORM models (15 relational entities)
│   ├── schemas/
│   │   └── schemas.py       # Pydantic validation request/response schemas
│   ├── services/
│   │   ├── ai_model.py      # DenseNet-121 forward pass & Grad-CAM layer hooking
│   │   ├── mri_validator.py # 10-point clinical image quality assurance gate
│   │   ├── pdf_generator.py # ReportLab medical PDF report generator
│   │   └── email_service.py # Brevo SMTP transactional mailer
│   ├── static/
│   │   └── clinical_mri_assets/ # Real clinical MRI scans and ground-truth heatmaps
│   └── main.py              # FastAPI application bootstrap, CORS, router mounting
├── model/                   # Serialized DenseNet-121 checkpoint files (.pth/.pt)
├── tests/
│   └── test_audit.py        # RBAC, authorization boundary, and OTP security test cases
├── requirements.txt         # Pinned pip dependencies
├── seed_data.py             # Realistic clinical database seeder (doctors, patients, scans)
└── .env                     # Local configuration secrets and SMTP credentials
```

---

## 10-Point Pre-Inference Quality Gate

Every uploaded image must pass a rigorous 10-point clinical gate before entering the neural network:
1. **Magic-Byte MIME Verification**: Header byte validation ensuring legitimate JPEG/PNG encoding.
2. **Dimension Constraints**: Height $\ge 80\text{ px}$, Width $\ge 80\text{ px}$.
3. **Decompression Integrity**: PIL verification preventing decompression bombs and corrupt streams.
4. **Color Space Decoding**: Strict 3-channel BGR to RGB decoding.
5. **Laplacian Blur Variance**: $\text{Var}(\nabla^2 I) \ge 100.0$ to eliminate blurred images.
6. **Dynamic Contrast Range**: Standard deviation of grayscale pixel intensities $\sigma \ge 12.0$.
7. **Aspect Ratio Sanity**: Aspect ratio $0.5 \le \frac{W}{H} \le 2.0$.
8. **Skull Perimeter Illumination**: Peripheral background luminance $\le 130.0$ (filters out bright non-MRI documents).
9. **Cranial Parenchyma Density**: Central region luminance mean $\ge 15.0$ (rejects blank black screens).
10. **Information Entropy**: Grayscale Shannon entropy $\ge 3.0\text{ bits/pixel}$.

---

## Setup & Running Instructions

### 1. Create Virtual Environment & Install Dependencies
```bash
python -m venv venv
venv\Scripts\activate          # On Windows
# source venv/bin/activate     # On macOS/Linux

pip install -r requirements.txt
```

### 2. Seed Database with Initial Clinical Records
```bash
python seed_data.py
```

### 3. Launch the Backend Server
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Swagger Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Interface**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## Automated Test Execution

Run the complete security, RBAC, and authorization test suite:
```bash
pytest tests/ -v
```
All tests verify role-based boundary containment, unapproved doctor blocking, patient record scoping, and one-time password (OTP) single-use invalidation.
