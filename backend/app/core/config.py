import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "NeuroDetect - AI Brain Tumor Detection"
    VERSION: str = "1.0.4"
    API_V1_STR: str = "/api/v1"
    
    # Secret Key for JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "neurodetect-super-secret-jwt-key-2026-secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # Directory Paths
    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    MRI_UPLOAD_DIR: str = os.path.join(UPLOAD_DIR, "mri")
    HEATMAP_DIR: str = os.path.join(UPLOAD_DIR, "heatmaps")
    CERTIFICATE_DIR: str = os.path.join(UPLOAD_DIR, "certificates")
    REPORT_DIR: str = os.path.join(BASE_DIR, "reports")
    MODEL_DIR: str = os.path.join(BASE_DIR, "model")

    # Environment & Database Settings
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", os.getenv("RENDER_SERVICE_NAME", "development"))
    DEFAULT_DB_PATH: str = os.path.join(BASE_DIR, "neurodetect.db")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    def get_effective_database_url(self) -> str:
        url = (self.DATABASE_URL or "").strip()
        is_prod = (self.ENVIRONMENT.lower() in ["production", "prod"]) or (os.getenv("RENDER") is not None)
        
        if url and not url.startswith("sqlite"):
            # Normalize postgres:// and postgresql:// to postgresql+psycopg2:// for SQLAlchemy 2.0 compatibility
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            return url
        else:
            if is_prod:
                print("[Deployment Notice] DATABASE_URL not set or points to SQLite. Using persistent SQLite database instance.")
            return f"sqlite:///{self.DEFAULT_DB_PATH}"
    
    # SMTP & Brevo Transactional Email Configuration
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", os.getenv("BREVO_SENDER_EMAIL", "neyro390@gmail.com"))

    BREVO_SMTP_SERVER: str = os.getenv("BREVO_SMTP_SERVER", "smtp-relay.brevo.com")
    BREVO_SMTP_PORT: int = int(os.getenv("BREVO_SMTP_PORT", "587"))
    BREVO_SMTP_LOGIN: str = os.getenv("BREVO_SMTP_LOGIN", os.getenv("BREVO_SMTP_USER", "bdb1f8001@smtp-brevo.com"))
    BREVO_SMTP_USER: str = os.getenv("BREVO_SMTP_USER", os.getenv("BREVO_SMTP_LOGIN", "bdb1f8001@smtp-brevo.com"))
    BREVO_SMTP_PASSWORD: str = os.getenv("BREVO_SMTP_KEY", os.getenv("BREVO_SMTP_PASSWORD", os.getenv("SMTP_PASSWORD", "")))
    BREVO_SMTP_KEY: str = os.getenv("BREVO_SMTP_KEY", os.getenv("BREVO_SMTP_PASSWORD", os.getenv("SMTP_PASSWORD", "")))
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "")
    BREVO_SENDER_EMAIL: str = os.getenv("BREVO_SENDER_EMAIL", os.getenv("EMAIL_FROM", "neyro390@gmail.com"))
    BREVO_SENDER_NAME: str = os.getenv("BREVO_SENDER_NAME", "NeuroDetect Medical Portal")
    NEURODETECT_CONTACT_EMAIL: str = os.getenv("NEURODETECT_CONTACT_EMAIL", os.getenv("EMAIL_FROM", "neyro390@gmail.com"))

    # Supabase Private Storage Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_KEY", ""))
    SUPABASE_BUCKET_NAME: str = os.getenv("SUPABASE_BUCKET_NAME", "NeuroDetect Org")
    
    # AI Model Settings
    MODEL_PATH: str = os.path.join(MODEL_DIR, "densenet121_brain_tumor.h5")
    IMAGE_SIZE: tuple = (224, 224)
    CLASS_NAMES: list = ["Glioma", "Meningioma", "No Tumor", "Pituitary"]
    
    class Config:
        case_sensitive = True
        extra = "ignore"
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()

# Ensure required directories exist
for path in [
    settings.UPLOAD_DIR,
    settings.MRI_UPLOAD_DIR,
    settings.HEATMAP_DIR,
    settings.CERTIFICATE_DIR,
    settings.REPORT_DIR,
    settings.MODEL_DIR,
]:
    os.makedirs(path, exist_ok=True)
