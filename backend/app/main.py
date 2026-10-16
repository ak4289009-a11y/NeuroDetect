from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base

# Import Routers
from app.api.auth import router as auth_router
from app.api.scans import router as scans_router
from app.api.reports import router as reports_router
from app.api.doctors import router as doctors_router
from app.api.admin import router as admin_router
from app.api.diet import router as diet_router
from app.api.videos import router as videos_router
from app.api.faq import router as faq_router
from app.api.contact import router as contact_router
from app.api.analytics import router as analytics_router
from app.api.docs import router as docs_router
from app.api.messages import router as messages_router

# Create DB Tables automatically & Seed default data if empty
from sqlalchemy import text
Base.metadata.create_all(bind=engine)
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_history TEXT;"))
        conn.commit()
except Exception:
    pass

try:
    from seed_data import seed_database
    seed_database()
except Exception as e:
    print(f"[Auto-Seed] Startup seed check: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc"
)

# Configure CORS for React Vite Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve Static Upload & Report Assets
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/reports", StaticFiles(directory=settings.REPORT_DIR), name="reports")

# Register API Routers under /api/v1
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(scans_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(doctors_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(diet_router, prefix=settings.API_V1_STR)
app.include_router(videos_router, prefix=settings.API_V1_STR)
app.include_router(faq_router, prefix=settings.API_V1_STR)
app.include_router(contact_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(docs_router, prefix=settings.API_V1_STR)
app.include_router(messages_router, prefix=settings.API_V1_STR)

from fastapi.responses import RedirectResponse

# Root & Docs Convenience Redirects
@app.get("/docs", include_in_schema=False)
def docs_redirect():
    return RedirectResponse(url=f"{settings.API_V1_STR}/docs")

@app.get("/redoc", include_in_schema=False)
def redoc_redirect():
    return RedirectResponse(url=f"{settings.API_V1_STR}/redoc")

@app.get("/health")
@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    """Unauthenticated health check endpoint for deployment monitoring."""
    return {"status": "ok", "system": settings.PROJECT_NAME, "version": settings.VERSION}

from fastapi.responses import HTMLResponse

@app.get("/quick-login/{role}", include_in_schema=False)
@app.get("/dev-login/{role}", include_in_schema=False)
def dev_login(role: str):
    role_upper = role.upper()
    role_email = {
        "PATIENT": "patient@neurodetect.ai",
        "DOCTOR": "dr.rajesh@neurodetect.ai",
        "ADMIN": "admin@neurodetect.ai"
    }.get(role_upper, "patient@neurodetect.ai")
    
    role_pwd = {
        "PATIENT": "Patient@123456",
        "DOCTOR": "Doctor@123456",
        "ADMIN": "Admin@123456"
    }.get(role_upper, "Patient@123456")

    target_path = f"/{role.lower()}"

    html = f"""<!DOCTYPE html>
<html>
<head><title>NeuroDetect - Signing into {role_upper}...</title></head>
<body>
<div style="font-family:system-ui,-apple-system,sans-serif;padding:60px 20px;text-align:center;">
  <h2 style="color:#1e3a8a;margin-bottom:8px;">Signing in as {role.capitalize()}...</h2>
  <p style="color:#64748b;font-size:14px;">Preparing session, please wait a moment...</p>
</div>
<script>
fetch('/api/v1/auth/login', {{
  method: 'POST',
  headers: {{ 'Content-Type': 'application/json' }},
  body: JSON.stringify({{
    email: '{role_email}',
    password: '{role_pwd}',
    role: '{role_upper}'
  }})
}})
.then(r => r.json())
.then(data => {{
  if (data.access_token) {{
    localStorage.setItem('neurodetect_token', data.access_token);
    localStorage.setItem('neurodetect_role', data.role);
    localStorage.setItem('neurodetect_user', JSON.stringify({{ name: data.name, user_id: data.user_id }}));
    window.location.replace('{target_path}');
  }} else {{
    document.body.innerHTML = '<p style=\"color:red;\">Sign-in failed. Please check credentials.</p>';
  }}
}})
.catch(err => {{
  document.body.innerHTML = '<p style=\"color:red;\">Sign-in error: ' + err.toString() + '</p>';
}});
</script>
</body>
</html>"""
    return HTMLResponse(content=html)

import os
from fastapi.responses import FileResponse

# Check for compiled frontend distribution (PWA SPA)
frontend_dist = os.path.join(os.path.dirname(settings.BASE_DIR), "frontend", "dist")
if not os.path.exists(frontend_dist):
    frontend_dist = os.path.join(settings.BASE_DIR, "frontend", "dist")

if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="spa-assets")
    icons_dir = os.path.join(frontend_dist, "icons")
    if os.path.exists(icons_dir):
        app.mount("/icons", StaticFiles(directory=icons_dir), name="spa-icons")

    @app.get("/sw.js", include_in_schema=False)
    def service_worker():
        return FileResponse(os.path.join(frontend_dist, "sw.js"), media_type="application/javascript")

    @app.get("/manifest.json", include_in_schema=False)
    def web_manifest():
        return FileResponse(os.path.join(frontend_dist, "manifest.json"), media_type="application/manifest+json")

    @app.get("/favicon.svg", include_in_schema=False)
    def favicon_svg():
        return FileResponse(os.path.join(frontend_dist, "favicon.svg"), media_type="image/svg+xml")

    @app.get("/offline.html", include_in_schema=False)
    def offline_page():
        return FileResponse(os.path.join(frontend_dist, "offline.html"), media_type="text/html")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        # Don't intercept API, uploads, or reports
        if full_path.startswith("api/") or full_path.startswith("uploads/") or full_path.startswith("reports/"):
            return {"error": "Endpoint not found"}
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "system": settings.PROJECT_NAME,
            "status": "OPERATIONAL",
            "version": settings.VERSION,
            "docs": f"{settings.API_V1_STR}/docs"
        }
