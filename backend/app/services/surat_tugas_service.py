"""
Service orkestrator untuk pembuatan Surat Tugas:
1. Validasi input (pejabat penandatangan, daftar pegawai).
2. Generate nomor surat resmi (dengan row-level lock transaksional).
3. Buat file dokumen .docx (<=3 atau >3 pegawai).
4. Simpan record surat_tugas dan relasi surat_tugas_pegawai ke MySQL.
5. Commit transaksi.
6. Trigger sinkronisasi mirror Google Sheets via BackgroundTasks.
7. Jika terjadi error sebelum commit, seluruh transaksi di-rollback.
"""

import os
from datetime import date

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.models.pegawai import Pegawai
from app.models.surat_tugas import SuratTugas, SuratTugasPegawai
from app.schemas.surat_tugas import SuratTugasCreate
from app.services import (
    dokumen_service,
    nomor_surat_service,
    pegawai_service,
    pejabat_service,
)
from app.services.sheets_sync_service import sync_surat_tugas_to_sheets_sync


def create_surat_tugas(
    db: Session,
    payload: SuratTugasCreate,
    background_tasks: BackgroundTasks,
    dibuat_oleh: str | None = "Staf TU",
) -> SuratTugas:
    # 1. Validasi Pejabat Penandatangan
    penandatangan = pejabat_service.get_pejabat_by_id(db, payload.penandatangan_id)
    if not penandatangan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pejabat penandatangan dengan ID {payload.penandatangan_id} tidak ditemukan.",
        )

    # 2. Validasi Daftar Pegawai
    if not payload.pegawai_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Daftar pegawai yang ditugaskan tidak boleh kosong.",
        )

    # Pastikan ID pegawai unik
    unique_pegawai_ids = list(dict.fromkeys(payload.pegawai_ids))
    pegawai_records = pegawai_service.get_pegawai_by_ids(db, unique_pegawai_ids)

    # Urutkan pegawai sesuai urutan input user
    pegawai_map = {p.id: p for p in pegawai_records}
    ordered_pegawai: list[Pegawai] = []
    for pid in unique_pegawai_ids:
        if pid in pegawai_map:
            ordered_pegawai.append(pegawai_map[pid])
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pegawai dengan ID {pid} tidak ditemukan.",
            )

    # Siapkan data formatted untuk dokumen
    formatted_pegawai_list = []
    for p in ordered_pegawai:
        formatted_pegawai_list.append(
            {
                "nama": pegawai_service.format_nama_lengkap(p.nama, p.gelar),
                "nip": p.nip,
                "pangkat_gol": pegawai_service.format_pangkat_golongan(p.pangkat, p.golongan),
                "jabatan": p.jabatan,
            }
        )

    penandatangan_nama_fmt = pegawai_service.format_nama_lengkap(
        penandatangan.nama, penandatangan.gelar
    )
    penandatangan_jabatan_fmt = penandatangan.jabatan

    try:
        # 3. Generate nomor surat resmi dalam transaksi yang sama
        nomor_obj = nomor_surat_service.generate_next_nomor_surat(
            db, perihal=payload.perihal, dibuat_oleh=dibuat_oleh, commit=False
        )

        # 4. Generate file .docx
        safe_nomor = nomor_obj.nomor_lengkap.replace("/", "_")
        filename = f"Surat_Tugas_{safe_nomor}.docx"
        output_dir = os.path.join(settings.STORAGE_DIR, "output")
        output_path = os.path.join(output_dir, filename)

        template_path = os.path.join(
            os.path.dirname(__file__), "..", "templates", "surat_tugas.docx"
        )
        template_path = os.path.abspath(template_path)

        dokumen_service.generate_surat_tugas_docx(
            template_path=template_path,
            output_path=output_path,
            nomor_surat=nomor_obj.nomor_lengkap,
            dasar_surat=payload.dasar_surat,
            perihal=payload.perihal,
            tanggal_mulai=payload.tanggal_mulai,
            tanggal_selesai=payload.tanggal_selesai,
            lokasi=payload.lokasi,
            penandatangan_nama=penandatangan_nama_fmt,
            penandatangan_jabatan=penandatangan_jabatan_fmt,
            tanggal_surat=date.today(),
            menimbang=payload.menimbang,
            pegawai_list=formatted_pegawai_list,
        )

        # 5. Konversi ke PDF resmi naskah dinas
        pdf_filename = f"Surat_Tugas_{safe_nomor}.pdf"
        pdf_path = os.path.join(output_dir, pdf_filename)
        dokumen_service.convert_docx_to_pdf(docx_path=output_path, pdf_path=pdf_path)

        # 6. Simpan record SuratTugas
        surat_tugas = SuratTugas(
            nomor_surat_id=nomor_obj.id,
            menimbang=payload.menimbang,
            dasar_surat=payload.dasar_surat,
            perihal=payload.perihal,
            tanggal_mulai=payload.tanggal_mulai,
            tanggal_selesai=payload.tanggal_selesai,
            lokasi=payload.lokasi,
            topik=payload.topik,
            konseptor=payload.konseptor,
            penandatangan_id=penandatangan.id,
            file_output_path=pdf_path,
            dibuat_oleh=dibuat_oleh,
            sheets_sync_status="pending",
        )
        db.add(surat_tugas)
        db.flush()

        # 6. Simpan relasi SuratTugasPegawai
        for idx, p in enumerate(ordered_pegawai, start=1):
            rel = SuratTugasPegawai(surat_tugas_id=surat_tugas.id, pegawai_id=p.id, urutan=idx)
            db.add(rel)

        # Commit transaksi utama
        db.commit()
        db.refresh(surat_tugas)

        logger.info(f"Surat Tugas {nomor_obj.nomor_lengkap} berhasil dibuat dan disimpan.")

        # 7. Daftarkan sinkronisasi Google Sheets ke BackgroundTasks
        background_tasks.add_task(sync_surat_tugas_to_sheets_sync, surat_tugas.id)

        return surat_tugas

    except Exception as e:
        db.rollback()
        logger.error(f"Gagal membuat surat tugas: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal memproses pembuatan surat tugas: {e!s}",
        )
