# 🚀 Render Deployment Guide for NeuroDetect System

This guide walks you through deploying **NeuroDetect** (FastAPI Backend + React Frontend + Supabase PostgreSQL & Storage) on Render.

---

## 🛠️ Step 1: Push Code to GitHub / GitLab
Ensure your project repository is pushed to your GitHub or GitLab account:
```bash
git add .
git commit -m "Prepare for Render Deployment"
git push origin main
```

---

## ⚡ Option A: 1-Click Render Blueprint Deployment (Recommended)

1. Open [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → Select **Blueprint**.
3. Connect your GitHub repository.
4. Render will read `render.yaml` and automatically configure both:
   - **`neurodetect-backend`** (FastAPI Web Service)
   - **`neurodetect-frontend`** (React Static Site)
5. Fill in the required secret Environment Variables in the Render dashboard:
   - `DATABASE_URL`: `<configured in Render Environment Variables>`
   - `SUPABASE_URL`: `<configured in Render Environment Variables>`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<configured in Render Environment Variables>`
   - `SMTP_USER`: `<configured in Render Environment Variables>`
   - `SMTP_PASSWORD`: `<configured in Render Environment Variables>`
   - `EMAIL_FROM`: `<configured in Render Environment Variables>`
   - `SECRET_KEY`: `<configured in Render Environment Variables>`
6. Click **Apply Blueprint**!

---

## 🔧 Option B: Manual Service Creation

### 1. Backend Web Service (`neurodetect-backend`)
- **Type**: Web Service
- **Root Directory**: `backend`
- **Environment**: `Python 3` (or `Docker`)
- **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/health`
- **Environment Variables**:
  | Key | Value |
  | --- | --- |
  | `ENVIRONMENT` | `production` |
  | `DATABASE_URL` | `<configured in Render Environment Variables>` |
  | `SUPABASE_URL` | `<configured in Render Environment Variables>` |
  | `SUPABASE_SERVICE_ROLE_KEY` | `<configured in Render Environment Variables>` |
  | `SUPABASE_BUCKET_NAME` | `NeuroDetect Org` |
  | `SECRET_KEY` | `<configured in Render Environment Variables>` |
  | `SMTP_SERVER` | `smtp.gmail.com` |
  | `SMTP_PORT` | `587` |
  | `SMTP_USER` | `<configured in Render Environment Variables>` |
  | `SMTP_PASSWORD` | `<configured in Render Environment Variables>` |
  | `EMAIL_FROM` | `<configured in Render Environment Variables>` |

### 2. Frontend Static Site (`neurodetect-frontend`)
- **Type**: Static Site
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Rewrite Rules**: Source `/*` -> Destination `/index.html`
- **Environment Variable**:
  - `VITE_API_URL`: `https://neurodetect-backend.onrender.com/api/v1`

---

## 🔍 Verification After Deployment

1. **Backend Health Check**:
   Open `https://neurodetect-backend.onrender.com/health` in your browser. It will return:
   ```json
   {"status": "ok"}
   ```

2. **Supabase Database & Storage**:
   Your backend automatically connects using your secure environment variables.
