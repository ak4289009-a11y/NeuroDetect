from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Retrieve effective database connection URL
effective_db_url = settings.get_effective_database_url()

# Setup database engine (handles SQLite & PostgreSQL)
connect_args = {}
engine_kwargs = {"pool_pre_ping": True}

if effective_db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine_kwargs["connect_args"] = connect_args
else:
    # PostgreSQL Connection Pooling for Render / Supabase
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_recycle"] = 300

try:
    engine = create_engine(effective_db_url, **engine_kwargs)
except Exception as exc:
    print(f"[Database Warning] Engine creation failed for '{effective_db_url}': {exc}. Falling back to SQLite.")
    fallback_url = f"sqlite:///{settings.DEFAULT_DB_PATH}"
    connect_args = {"check_same_thread": False}
    engine = create_engine(fallback_url, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency for obtaining database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
