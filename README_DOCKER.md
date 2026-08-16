# 🐳 NeuroDetect - Docker Setup & Deployment Guide

NeuroDetect is fully Dockerized! You can launch the entire web application (FastAPI backend + React frontend + SQLite/MySQL storage) with a single command without installing Python or Node.js locally.

---

## 🚀 Quick Start with Docker Compose

### 1. Build and Start All Services
Run the following command from the project root directory:

```bash
docker-compose up --build
```

Or run in detached background mode:

```bash
docker-compose up -d --build
```

---

## 🌐 Accessing the Application

Once Docker containers are running:

- **Web Application (React + Nginx)**: [http://localhost](http://localhost) or [http://localhost:3000](http://localhost:3000)
- **FastAPI Interactive API Docs**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- **FastAPI OpenAPI Schema**: [http://localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json)

---

## 🔐 Default Login Credentials

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@neurodetect.ai` | `Admin@123456` | Manage doctors, approval workflow, patient accounts, system analytics |
| **Attending Neurologist** | `dr.smith@neurodetect.ai` | `Doctor@123456` | Review MRI scans, Grad-CAM heatmaps, issue clinical notes & prescriptions |
| **Patient** | `patient@neurodetect.ai` | `Patient@123456` | Upload MRI scans, select doctor by location, view diet/videos/FAQs, download PDF report |

---

## 🛠️ Docker Containers & Architecture

| Container Name | Technology Stack | Exposed Port | Purpose |
| :--- | :--- | :--- | :--- |
| `neurodetect-backend` | Python 3.11, FastAPI, Uvicorn, OpenCV, Scikit-Learn | `8000` | REST API, AI Inference, PDF Generation, SQLite Database |
| `neurodetect-frontend` | React 18, Vite, Nginx Alpine | `80`, `3000` | Production Web UI, Nginx Reverse Proxy to `/api/` |

---

## 🛑 Stopping Docker Services

To stop and remove containers:

```bash
docker-compose down
```

To stop containers and wipe persistent database volumes:

```bash
docker-compose down -v
```
