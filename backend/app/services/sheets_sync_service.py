"""
Service untuk sinkronisasi Google Sheets & Google Apps Script.
Fitur:
1. Integrasi Google Apps Script Web App (Prioritas Utama):
   - doGet: sinkronisasi nomor urut terakhir secara real-time dari sheet target (gid=599707024).
   - doPost: append baris surat tugas baru ke sheet Register_2026.
2. Integrasi gspread (Service Account) sebagai opsi sekunder.
3. Sinkronisasi dua arah: import nomor baru dari Spreadsheet ke MySQL jika ada entry luar.
"""

import base64
import os
from datetime import date, datetime
from typing import Any

import httpx
import pytz
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.models.nomor_surat import NomorSurat
from app.models.surat_tugas import SuratTugas

NAMA_BULAN = [
    "",
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
]


def format_tanggal_indo(d: date | datetime | None) -> str:
    if not d:
        return ""
    if isinstance(d, datetime):
        d = d.date()
    return f"{d.day} {NAMA_BULAN[d.month]} {d.year}"


def format_periode_indo(tgl_mulai: date | None, tgl_selesai: date | None) -> str:
    if not tgl_mulai:
        return ""
    if not tgl_selesai or tgl_mulai == tgl_selesai:
        return format_tanggal_indo(tgl_mulai)
    if tgl_mulai.year == tgl_selesai.year:
        if tgl_mulai.month == tgl_selesai.month:
            return f"{tgl_mulai.day} s.d. {tgl_selesai.day} {NAMA_BULAN[tgl_mulai.month]} {tgl_mulai.year}"
        return (
            f"{tgl_mulai.day} {NAMA_BULAN[tgl_mulai.month]} s.d. "
            f"{tgl_selesai.day} {NAMA_BULAN[tgl_selesai.month]} {tgl_mulai.year}"
        )
    return f"{format_tanggal_indo(tgl_mulai)} s.d. {format_tanggal_indo(tgl_selesai)}"


def get_latest_nomor_urut_from_apps_script() -> dict[str, Any]:
    """
    Mengambil nomor urut terakhir langsung dari Google Spreadsheet via Google Apps Script Web App.
    """
    url = settings.GOOGLE_APPS_SCRIPT_URL
    if not url or not url.strip():
        return {
            "configured": False,
            "success": False,
            "latest_nomor_urut": None,
            "message": "GOOGLE_APPS_SCRIPT_URL belum diatur di .env",
        }

    try:
        with httpx.Client(timeout=4.0, follow_redirects=True) as client:
            resp = client.get(url.strip(), params={"action": "get_latest_number"})
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "success":
                    return {
                        "configured": True,
                        "success": True,
                        "latest_nomor_urut": data.get("latest_nomor_urut"),
                        "next_nomor_urut": data.get("next_nomor_urut"),
                        "sheet_name": data.get("sheet_name"),
                        "total_rows": data.get("total_rows"),
                    }
                return {
                    "configured": True,
                    "success": False,
                    "latest_nomor_urut": None,
                    "message": data.get("message", "Respon Apps Script tidak sukses"),
                }
            return {
                "configured": True,
                "success": False,
                "latest_nomor_urut": None,
                "message": f"HTTP status error: {resp.status_code}",
            }
    except Exception as e:
        logger.warning(f"Gagal mengambil nomor urut terakhir dari Apps Script: {e}")
        return {
            "configured": True,
            "success": False,
            "latest_nomor_urut": None,
            "message": str(e),
        }


def format_surat_payload_for_spreadsheet(surat: SuratTugas) -> dict[str, Any]:
    """
    Menyiapkan payload kolom yang persis dengan struktur tab Register_2026:
    [nomor_urut, tanggal, jenis, kepada, hal, status_ttd, topik_tim]
    """
    # 1. nomor_urut
    nomor_urut = surat.nomor_surat.nomor_urut if surat.nomor_surat else 0

    # 2. tanggal surat
    tgl_surat = surat.created_at or surat.nomor_surat.tanggal_dibuat or datetime.now()
    tanggal_str = format_tanggal_indo(tgl_surat)

    # 3. jenis
    jenis_str = "ST"

    # 4. kepada
    rel_list = sorted(surat.pegawai_relasi, key=lambda r: r.urutan) if surat.pegawai_relasi else []
    if len(rel_list) == 1:
        kepada_str = rel_list[0].pegawai.nama
    elif len(rel_list) <= 3:
        kepada_str = ", ".join([r.pegawai.nama for r in rel_list])
    else:
        kepada_str = "Daftar Terlampir"

    # 5. hal (perihal + periode + lokasi)
    periode_str = format_periode_indo(surat.tanggal_mulai, surat.tanggal_selesai)
    lokasi_str = surat.lokasi or ""
    hal_parts = [surat.perihal]
    if periode_str:
        hal_parts.append(f"pada tanggal {periode_str}")
    if lokasi_str:
        hal_parts.append(f"di {lokasi_str}")
    hal_str = " ".join(hal_parts)

    # 6. status_ttd
    status_ttd = "Kapus"
    if surat.penandatangan:
        jab = (surat.penandatangan.jabatan or "").lower()
        if "plt" in jab:
            status_ttd = "Plt. Kapus"
        elif "plh" in jab:
            status_ttd = "Plh. Kapus"

    # 7. topik_tim
    topik_tim = surat.topik or "TU"

    # 8. konseptor
    konseptor = surat.konseptor or ""

    # 9. status_surat
    status_surat = "OK"

    # 10. Format nama folder bulanan Google Drive: "10 - Oktober 2026"
    tgl_ref = surat.tanggal_mulai or (surat.created_at.date() if surat.created_at else date.today())
    bulan_folder = f"{tgl_ref.month:02d} - {NAMA_BULAN[tgl_ref.month]} {tgl_ref.year}"

    # 11. Baca berkas PDF yang digenerate dan encode ke Base64 untuk arsip Google Drive
    pdf_base64 = None
    pdf_filename = None
    if surat.file_output_path and os.path.exists(surat.file_output_path):
        try:
            with open(surat.file_output_path, "rb") as f:
                pdf_base64 = base64.b64encode(f.read()).decode("utf-8")
            pdf_filename = os.path.basename(surat.file_output_path)
        except Exception as e:
            logger.warning(f"Gagal membaca file PDF surat {surat.id} untuk Google Drive: {e}")

    payload = {
        "nomor_urut": nomor_urut,
        "tanggal": tanggal_str,
        "jenis": jenis_str,
        "kepada": kepada_str,
        "hal": hal_str,
        "status_ttd": status_ttd,
        "topik_tim": topik_tim,
        "konseptor": konseptor,
        "status_surat": status_surat,
        "bulan_folder": bulan_folder,
    }

    if pdf_base64:
        payload["pdf_base64"] = pdf_base64
        payload["pdf_filename"] = pdf_filename

    return payload


def append_surat_tugas_to_apps_script(surat: SuratTugas) -> dict[str, Any]:
    """
    Mengirimkan HTTP POST ke Google Apps Script Web App untuk membuat baris baru di spreadsheet
    dan otomatis mengunggah arsip PDF ke Google Drive per bulan.
    """
    url = settings.GOOGLE_APPS_SCRIPT_URL
    if not url or not url.strip():
        return {
            "success": False,
            "error": "GOOGLE_APPS_SCRIPT_URL belum diatur di file .env backend.",
        }

    payload = format_surat_payload_for_spreadsheet(surat)

    try:
        # Timeout 45 detik untuk memberi waktu upload PDF Base64 ke Google Drive
        with httpx.Client(timeout=45.0, follow_redirects=True) as client:
            resp = client.post(url.strip(), json=payload)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "success":
                    if data.get("file_url"):
                        logger.info(
                            f"File PDF surat {surat.id} berhasil diarsipkan di Google Drive: {data.get('file_url')}"
                        )
                    return {"success": True, "data": data}
                return {"success": False, "error": data.get("message", "Gagal menyimpan baris.")}
            return {"success": False, "error": f"Apps Script HTTP error: {resp.status_code}"}
    except Exception as e:
        logger.error(f"Gagal mengirim data surat {surat.id} ke Apps Script: {e}")
        return {"success": False, "error": str(e)}


def sync_surat_tugas_to_sheets_sync(surat_tugas_id: int):
    """
    Fungsi dieksekusi di BackgroundTasks FastAPI setelah commit MySQL.
    """
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        surat = db.query(SuratTugas).filter(SuratTugas.id == surat_tugas_id).first()
        if not surat:
            logger.error(f"SuratTugas ID {surat_tugas_id} tidak ditemukan untuk sync Sheets.")
            return

        if not settings.SHEETS_SYNC_ENABLED:
            logger.info("SHEETS_SYNC_ENABLED=false. Sinkronisasi dilewati.")
            surat.sheets_sync_status = "synced"
            surat.sheets_synced_at = datetime.now(pytz.timezone(settings.APP_TIMEZONE))
            surat.sheets_sync_error = None
            db.commit()
            return

        # 1. Jalankan sinkronisasi via Google Apps Script jika URL tersedia
        if settings.GOOGLE_APPS_SCRIPT_URL and settings.GOOGLE_APPS_SCRIPT_URL.strip():
            res = append_surat_tugas_to_apps_script(surat)
            if res.get("success"):
                surat.sheets_sync_status = "synced"
                surat.sheets_synced_at = datetime.now(pytz.timezone(settings.APP_TIMEZONE))
                surat.sheets_sync_error = None
                db.commit()
                nomor_text = (
                    surat.nomor_surat.nomor_lengkap if surat.nomor_surat else f"ID {surat.id}"
                )
                logger.info(
                    f"Berhasil menambahkan surat tugas {nomor_text} ke Google Spreadsheet via Apps Script."
                )
                return
            else:
                surat.sheets_sync_status = "failed"
                surat.sheets_sync_error = res.get("error")
                db.commit()
                logger.warning(f"Gagal kirim ke Apps Script: {res.get('error')}")
                return

        # 2. Jika Apps Script URL belum diatur, tandai pending
        surat.sheets_sync_status = "pending"
        surat.sheets_sync_error = "Menunggu konfigurasi GOOGLE_APPS_SCRIPT_URL di backend/.env"
        db.commit()
        logger.info(f"Surat {surat.id} ditandai pending karena Apps Script URL belum diatur.")

    except Exception as e:
        logger.error(f"Gagal proses background sync surat ID {surat_tugas_id}: {e}")
        if surat:
            surat.sheets_sync_status = "failed"
            surat.sheets_sync_error = str(e)
            db.commit()
    finally:
        db.close()


def retry_failed_sync(db: Session) -> dict[str, Any]:
    """
    Mencoba kembali sinkronisasi seluruh surat yang statusnya pending atau failed.
    """
    pending_or_failed = (
        db.query(SuratTugas).filter(SuratTugas.sheets_sync_status.in_(["pending", "failed"])).all()
    )

    total = len(pending_or_failed)
    success = 0
    fail = 0

    for s in pending_or_failed:
        try:
            sync_surat_tugas_to_sheets_sync(s.id)
            db.refresh(s)
            if s.sheets_sync_status == "synced":
                success += 1
            else:
                fail += 1
        except Exception:
            fail += 1

    return {"retried_count": total, "success_count": success, "failed_count": fail}


def sync_from_spreadsheet_to_db(db: Session) -> dict[str, Any]:
    """
    Sinkronisasi dua arah: mengambil baris terbaru dari Google Spreadsheet ke database MySQL
    jika ada nomor surat baru yang dicatatkan manual di Spreadsheet.
    """
    url = settings.GOOGLE_APPS_SCRIPT_URL
    if not url or not url.strip():
        return {
            "success": False,
            "message": "GOOGLE_APPS_SCRIPT_URL belum dikonfigurasi.",
            "synced_count": 0,
        }

    try:
        with httpx.Client(timeout=8.0, follow_redirects=True) as client:
            resp = client.get(url.strip(), params={"action": "get_recent"})
            if resp.status_code != 200:
                return {
                    "success": False,
                    "message": f"HTTP error dari Apps Script: {resp.status_code}",
                    "synced_count": 0,
                }
            result = resp.json()
            if result.get("status") != "success":
                return {
                    "success": False,
                    "message": result.get("message", "Respon Apps Script tidak valid."),
                    "synced_count": 0,
                }

            rows = result.get("data", [])
            synced_count = 0
            current_year = datetime.now().year

            for item in rows:
                nomor_raw = item.get("nomor_urut")
                if not nomor_raw:
                    continue
                try:
                    num = int(nomor_raw)
                except (ValueError, TypeError):
                    continue

                # Cek apakah nomor urut sudah ada di DB
                existing = (
                    db.query(NomorSurat)
                    .filter(NomorSurat.tahun == current_year, NomorSurat.nomor_urut == num)
                    .first()
                )
                if not existing:
                    # Parse tanggal atau default
                    bulan_str = f"{datetime.now().month:02d}"
                    nomor_lengkap = f"{num}/SJ.9/KP.01.06/{bulan_str}/{current_year}"
                    new_nomor = NomorSurat(
                        nomor_urut=num,
                        tahun=current_year,
                        nomor_lengkap=nomor_lengkap,
                        tanggal_dibuat=datetime.now(),
                        perihal=item.get("hal"),
                        dibuat_oleh=item.get("kepada") or "Spreadsheet Sync",
                    )
                    db.add(new_nomor)
                    synced_count += 1

            if synced_count > 0:
                db.commit()

            return {
                "success": True,
                "sheet_latest": result.get("latest_nomor_urut"),
                "total_rows": result.get("total_rows"),
                "synced_count": synced_count,
                "message": f"Berhasil menyinkronkan {synced_count} nomor baru dari Spreadsheet.",
            }

    except Exception as e:
        logger.error(f"Gagal sync dari Spreadsheet ke DB: {e}")
        return {"success": False, "message": str(e), "synced_count": 0}
