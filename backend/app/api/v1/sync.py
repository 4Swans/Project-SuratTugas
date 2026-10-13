from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.models.nomor_surat import NomorSurat
from app.models.surat_tugas import SuratTugas
from app.schemas.sync import (
    SheetsSyncPullResponse,
    SheetsSyncRetryResponse,
    SheetsSyncStatusResponse,
)
from app.services import sheets_sync_service

router = APIRouter()


@router.get("/sheets/status", response_model=SheetsSyncStatusResponse)
def get_sheets_sync_status(db: Session = Depends(get_db)):
    """
    Mengambil ringkasan status sinkronisasi ke Google Sheets dan status integrasi Google Apps Script.
    """
    total = db.query(func.count(SuratTugas.id)).scalar() or 0
    synced = (
        db.query(func.count(SuratTugas.id))
        .filter(SuratTugas.sheets_sync_status == "synced")
        .scalar()
        or 0
    )
    pending = (
        db.query(func.count(SuratTugas.id))
        .filter(SuratTugas.sheets_sync_status == "pending")
        .scalar()
        or 0
    )
    failed = (
        db.query(func.count(SuratTugas.id))
        .filter(SuratTugas.sheets_sync_status == "failed")
        .scalar()
        or 0
    )

    last_synced = (
        db.query(SuratTugas.sheets_synced_at)
        .filter(SuratTugas.sheets_sync_status == "synced")
        .order_by(SuratTugas.sheets_synced_at.desc())
        .first()
    )

    current_year = datetime.now().year
    latest_db_urut = (
        db.query(func.max(NomorSurat.nomor_urut)).filter(NomorSurat.tahun == current_year).scalar()
        or 0
    )

    # Cek status koneksi Apps Script jika URL ada
    apps_script_url_configured = bool(
        settings.GOOGLE_APPS_SCRIPT_URL and settings.GOOGLE_APPS_SCRIPT_URL.strip()
    )
    latest_sheet_urut = None
    is_in_sync = True
    conn_msg = "GOOGLE_APPS_SCRIPT_URL belum diatur di backend/.env"

    if apps_script_url_configured:
        sheet_info = sheets_sync_service.get_latest_nomor_urut_from_apps_script()
        if sheet_info.get("success"):
            latest_sheet_urut = sheet_info.get("latest_nomor_urut")
            conn_msg = f"Terhubung dengan Google Sheet (Tab: {sheet_info.get('sheet_name', 'Register_2026')})"
            is_in_sync = latest_db_urut == latest_sheet_urut
        else:
            conn_msg = sheet_info.get("message", "Gagal menghubungi Google Apps Script")

    return SheetsSyncStatusResponse(
        enabled=settings.SHEETS_SYNC_ENABLED,
        apps_script_url_configured=apps_script_url_configured,
        sheet_url=settings.GOOGLE_SHEET_URL,
        sheet_gid=settings.GOOGLE_SHEET_GID,
        total_surat=total,
        synced_count=synced,
        pending_count=pending,
        failed_count=failed,
        last_sync_time=last_synced[0] if last_synced else None,
        latest_db_nomor_urut=latest_db_urut,
        latest_sheet_nomor_urut=latest_sheet_urut,
        is_number_in_sync=is_in_sync,
        connection_message=conn_msg,
    )


@router.post("/sheets/retry", response_model=SheetsSyncRetryResponse)
def retry_sheets_sync(db: Session = Depends(get_db)):
    """
    Kirim ulang baris pending/failed ke Google Sheets.
    """
    res = sheets_sync_service.retry_failed_sync(db)
    return SheetsSyncRetryResponse(
        message="Proses pengulangan sinkronisasi selesai.",
        retried_count=res["retried_count"],
        success_count=res["success_count"],
        failed_count=res["failed_count"],
    )


@router.post("/sheets/pull-from-sheet", response_model=SheetsSyncPullResponse)
def pull_from_sheet(db: Session = Depends(get_db)):
    """
    Mengambil data nomor urut terbaru dari Google Spreadsheet ke database MySQL.
    """
    res = sheets_sync_service.sync_from_spreadsheet_to_db(db)
    return SheetsSyncPullResponse(
        success=res["success"],
        message=res["message"],
        synced_count=res.get("synced_count", 0),
        sheet_latest=res.get("sheet_latest"),
        total_rows=res.get("total_rows"),
    )
