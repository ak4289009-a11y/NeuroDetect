# NeuroDetect API Specification & Architecture Guide

NeuroDetect provides a comprehensive RESTful API built on **FastAPI** for deep learning brain tumor classification, medical report management, user role-based authorization, and real-time analytical reporting.

---

## 1. Base URL & OpenAPI Specification

- **Development Base URL**: `http://localhost:8000/api/v1`
- **Interactive Swagger UI**: `http://localhost:8000/api/v1/docs`
- **ReDoc Technical Spec**: `http://localhost:8000/api/v1/redoc`

---

## 2. Authentication & Authorization (JWT)

All protected endpoints require an HTTP `Authorization` header containing a valid Bearer token:
```
Authorization: Bearer <access_token>
```

### Roles:
- `PATIENT`: Can upload MRI scans, view personal diagnostic reports, download PDFs, view recommendations and tumor diet plans.
- `DOCTOR`: Must be approved by Admin (`is_approved = True`). Can review pending scans, submit clinical notes & prescriptions, and view patient timelines.
- `ADMIN`: Full system access, doctor registration approval/rejection, user CRUD, CMS content management, system audit logs, and settings.

---

## 3. Core API Endpoint Groups

### A. Authentication (`/auth`)
| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/auth/request-otp` | Request 6-digit registration OTP code dispatched via Brevo SMTP | Public |
| `POST` | `/auth/register/patient` | Register a new patient account (verifying registration OTP) | Public |
| `POST` | `/auth/register/doctor` | Register a doctor account (Status set to PENDING verification) | Public |
| `POST` | `/auth/login` | Authenticate user & return JWT token with role claims | Public |
| `POST` | `/auth/forgot-password` | Dispatch 6-digit database-backed OTP to user's registered email | Public |
| `POST` | `/auth/reset-password` | Verify 6-digit OTP from database and update user password (single-use) | Public |
| `GET` | `/auth/me` | Retrieve profile of authenticated user | Authenticated |

### B. MRI Scans & AI Pipeline (`/scans`)
| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/scans/upload` | Upload MRI image (JPG, PNG, JPEG), run DenseNet121 inference & Grad-CAM heatmap | Patient, Admin |
| `GET` | `/scans/patient` | Retrieve all MRI scans for logged-in patient | Patient |
| `GET` | `/scans/pending` | Retrieve MRI scans pending doctor review (`AI_COMPLETED` status) | Doctor |
| `GET` | `/scans/all` | Retrieve all authorized scans across doctors and admins | Doctor, Admin |
| `GET` | `/scans/{scan_id}` | Get single scan details | Authenticated |

### C. Diagnostic Reports (`/reports`)
| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/reports/{report_id}/pdf` | Generate & download ReportLab PDF report | Authenticated |
| `POST` | `/reports/{report_id}/email` | Email PDF report to patient's registered email via SMTP (Brevo) | Authenticated |

### D. Doctor Clinical Workflows (`/doctors`)
| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/doctors/patients` | Retrieve scoped patient cohort (patients assigned, scans, appointments) | Doctor |
| `GET` | `/doctors/pending-scans` | List scans awaiting doctor review | Doctor, Admin |
| `POST` | `/doctors/review` | Submit diagnosis, notes, prescriptions, and approval status | Doctor, Admin |
| `GET` | `/doctors/patients/history/{patient_id}` | Retrieve patient clinical timeline & scan history | Doctor, Admin |

### E. Admin Control Panel (`/admin`)
| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/admin/doctors/pending` | List pending doctor approval requests | Admin |
| `POST` | `/admin/doctors/{id}/approval` | Approve, Reject, or Suspend doctor account | Admin |
| `GET` | `/admin/doctors` | List all doctors in system | Admin |
| `PUT` | `/admin/doctors/{id}/reset-password` | Reset doctor password | Admin |
| `DELETE` | `/admin/doctors/{id}` | Delete doctor account | Admin |
| `GET` | `/admin/patients` | List all patients across system (Strictly Admin only) | Admin |
| `DELETE` | `/admin/patients/{id}` | Delete patient account | Admin |
| `GET` | `/admin/audit-logs` | Retrieve system audit logs | Admin |

### F. Diet Guidelines (`/diet`)
| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/diet/` | Get all tumor diet guidelines | Public |
| `GET` | `/diet/{tumor_type}` | Get specific diet for tumor classification | Public |
| `POST` | `/diet/` | Create/Update tumor diet plan | Admin |

### G. Educational Videos (`/videos`)
| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/videos/` | List educational videos (optional category filter) | Public |
| `POST` | `/videos/` | Publish new video | Admin |
| `DELETE` | `/videos/{id}` | Remove video | Admin |

### H. FAQs (`/faqs`)
| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/faqs/` | Search & filter published FAQs | Public |
| `POST` | `/faqs/` | Add FAQ item | Admin |
| `PUT` | `/faqs/{id}` | Edit FAQ item | Admin |
| `DELETE` | `/faqs/{id}` | Delete FAQ item | Admin |

### I. Analytics & Dashboard Metrics (`/analytics`)
| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/analytics/dashboard-stats` | Summary card metrics for active role | Authenticated |
| `GET` | `/analytics/charts-data` | Recharts dataset (Distribution, Monthly scans, Growth) | Doctor, Admin |
