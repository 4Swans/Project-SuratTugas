from datetime import datetime

import pytz
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.models.nomor_surat import NomorSurat
from app.services.sheets_sync_service import get_latest_nomor_urut_from_apps_script


def get_current_jakarta_time() -> datetime:
    tz = pytz.timezone(settings.APP_TIMEZONE)
    return datetime.now(tz)


def preview_next_nomor_surat(db: Session) -> dict:
    """
    Melihat nomor surat berikutnya tanpa mengunci atau menyimpan ke database.
    Menyinkronkan secara real-time dengan nomor terakhir di spreadsheet jika terhubung.
    """
    now = get_current_jakarta_time()
    current_year = now.year
    bulan_str = f"{now.month:02d}"

    last_record = (
        db.query(NomorSurat)
        .filter(NomorSurat.tahun == current_year)
        .order_by(desc(NomorSurat.nomor_urut))
        .first()
    )
    db_last_urut = last_record.nomor_urut if last_record else 0

    # Cek nomor urut terakhir di Google Sheets via Apps Script jika dikonfigurasi
    sheet_info = get_latest_nomor_urut_from_apps_script()
    sheet_latest = sheet_info.get("latest_nomor_urut") if sheet_info.get("success") else None

    # Abaikan nomor testing atau anomali jika >= 5000
    if sheet_latest is not None and 0 < sheet_latest < 5000 and sheet_latest > db_last_urut:
        effective_last_urut = sheet_latest
        source = "spreadsheet"
    else:
        effective_last_urut = db_last_urut
        source = "database"

    next_urut = effective_last_urut + 1
    nomor_lengkap = f"{next_urut}/SJ.9/KP.01.06/{bulan_str}/{current_year}"

    return {
        "nomor_urut": next_urut,
        "tahun": current_year,
        "bulan": bulan_str,
        "nomor_lengkap": nomor_lengkap,
        "latest_nomor_urut": effective_last_urut,
        "source": source,
        "sheet_connected": sheet_info.get("success", False),
        "sheet_latest_urut": sheet_latest,
        "db_latest_urut": db_last_urut,
    }


def generate_next_nomor_surat(
    db: Session,
    perihal: str | None = None,
    dibuat_oleh: str | None = None,
    commit: bool = False,
) -> NomorSurat:
    """
    Menghasilkan nomor surat resmi baru dengan row lock (SELECT ... FOR UPDATE)
    dalam transaksi yang sedang aktif.
    Sinkron dengan nomor urut terakhir pada spreadsheet.
    """
    now = get_current_jakarta_time()
    current_year = now.year
    bulan_str = f"{now.month:02d}"

    # Row-level lock pada baris nomor urut terakhir di tahun berjalan
    last_record = (
        db.query(NomorSurat)
        .filter(NomorSurat.tahun == current_year)
        .order_by(desc(NomorSurat.nomor_urut))
        .with_for_update()
        .first()
    )
    db_last_urut = last_record.nomor_urut if last_record else 0

    # Cek real-time nomor urut terakhir di Spreadsheet
    sheet_info = get_latest_nomor_urut_from_apps_script()
    sheet_latest = sheet_info.get("latest_nomor_urut") if sheet_info.get("success") else None

    # Abaikan nomor testing atau anomali jika >= 5000
    if sheet_latest is not None and 0 < sheet_latest < 5000 and sheet_latest > db_last_urut:
        logger.info(
            f"Nomor urut spreadsheet ({sheet_latest}) lebih tinggi dari DB ({db_last_urut}). Menggunakan sequence spreadsheet."
        )
        effective_last_urut = sheet_latest
    else:
        effective_last_urut = db_last_urut

    next_urut = effective_last_urut + 1
    nomor_lengkap = f"{next_urut}/SJ.9/KP.01.06/{bulan_str}/{current_year}"

    nomor_obj = NomorSurat(
        nomor_urut=next_urut,
        tahun=current_year,
        nomor_lengkap=nomor_lengkap,
        tanggal_dibuat=now,
        perihal=perihal,
        dibuat_oleh=dibuat_oleh,
    )
    db.add(nomor_obj)
    db.flush()  # Dapatkan ID tanpa commit, agar tetap dalam transaksi caller

    if commit:
        db.commit()
        db.refresh(nomor_obj)

    return nomor_obj
