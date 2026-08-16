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
Base.metadata.create_all(bind=engine)
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
def health_check():
    """Unauthenticated health check endpoint for deployment monitoring."""
    return {"status": "ok"}

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "status": "OPERATIONAL",
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs"
    }
