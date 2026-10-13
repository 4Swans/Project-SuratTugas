import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.services.user_service import ensure_seed_users
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Memulai aplikasi Sistem Otomatisasi Surat Tugas...")
    os.makedirs(os.path.join(settings.STORAGE_DIR, "undangan"), exist_ok=True)
    os.makedirs(os.path.join(settings.STORAGE_DIR, "output"), exist_ok=True)

    # Inisialisasi default user
    db = SessionLocal()
    try:
        ensure_seed_users(db)
    finally:
        db.close()


    yield
    # Shutdown actions
    logger.info("Aplikasi dimatikan.")


app = FastAPI(
    title="API Sistem Otomatisasi Surat Tugas",
    description=(
        "Backend API untuk penomoran otomatis, manajemen penugasan, "
        "dan ekstraksi AI Surat Tugas Komdigi."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Setup CORS
origins = settings.CORS_ORIGINS
if isinstance(origins, str):
    origins = [origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Include v1 router
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Health Check"])
def root():
    return {
        "status": "online",
        "service": "Sistem Otomatisasi Surat Tugas API",
        "version": "1.0.0",
        "timezone": settings.APP_TIMEZONE,
        "sheets_sync_enabled": settings.SHEETS_SYNC_ENABLED,
        "docs": "/docs",
    }
