import os

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_optional, get_db
from app.models.surat_tugas import SuratTugas
from app.models.user import User
from app.schemas.nomor_surat import NomorSuratResponse
from app.schemas.pegawai import PegawaiResponse
from app.schemas.pejabat import PejabatResponse
from app.schemas.surat_tugas import SuratTugasCreate, SuratTugasResponse
from app.services import pegawai_service, surat_tugas_service

router = APIRouter()


def _format_surat_tugas_response(st: SuratTugas) -> SuratTugasResponse:
    # Format pegawai list
    pegawai_res_list = []
    for rel in st.pegawai_relasi:
        p = rel.pegawai
        p_res = PegawaiResponse.model_validate(p)
        p_res.pangkat_golongan_display = pegawai_service.format_pangkat_golongan(
            p.pangkat, p.golongan
        )
        p_res.nama_lengkap_display = pegawai_service.format_nama_lengkap(p.nama, p.gelar)
        pegawai_res_list.append(p_res)

    # Format penandatangan
    pejabat_res = PejabatResponse.model_validate(st.penandatangan)
    pejabat_res.pangkat_golongan_display = pegawai_service.format_pangkat_golongan(
        st.penandatangan.pangkat, st.penandatangan.golongan
    )
    pejabat_res.nama_lengkap_display = pegawai_service.format_nama_lengkap(
        st.penandatangan.nama, st.penandatangan.gelar
    )

    nomor_res = NomorSuratResponse.model_validate(st.nomor_surat)

    return SuratTugasResponse(
        id=st.id,
        nomor_surat=nomor_res,
        menimbang=st.menimbang,
        dasar_surat=st.dasar_surat,
        perihal=st.perihal,
        tanggal_mulai=st.tanggal_mulai,
        tanggal_selesai=st.tanggal_selesai,
        lokasi=st.lokasi,
        topik=st.topik,
        konseptor=st.konseptor,
        penandatangan=pejabat_res,
        pegawai_list=pegawai_res_list,
        file_output_path=st.file_output_path,
        sheets_sync_status=st.sheets_sync_status,
        created_at=st.created_at,
    )


@router.post("", response_model=SuratTugasResponse, status_code=status.HTTP_201_CREATED)
def create_surat(
    payload: SuratTugasCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Membuat Surat Tugas resmi baru:
    - Generate nomor urut transaksi
    - Generate dokumen .docx
    - Commit ke DB
    - Trigger sinkronisasi Google Sheets
    """
    dibuat_oleh = current_user.nama if current_user else (payload.dibuat_oleh or "Staf TU")
    surat = surat_tugas_service.create_surat_tugas(
        db=db,
        payload=payload,
        background_tasks=background_tasks,
        dibuat_oleh=dibuat_oleh,
    )
    return _format_surat_tugas_response(surat)


@router.get("", response_model=list[SuratTugasResponse])
def read_surat_tugas_list(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Mengambil daftar riwayat surat tugas.
    """
    surat_list = (
        db.query(SuratTugas).order_by(desc(SuratTugas.id)).offset(offset).limit(limit).all()
    )
    return [_format_surat_tugas_response(s) for s in surat_list]


@router.get("/{surat_id}", response_model=SuratTugasResponse)
def read_surat_tugas(surat_id: int, db: Session = Depends(get_db)):
    """
    Mengambil detail satu surat tugas.
    """
    surat = db.query(SuratTugas).filter(SuratTugas.id == surat_id).first()
    if not surat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Surat Tugas dengan ID {surat_id} tidak ditemukan.",
        )
    return _format_surat_tugas_response(surat)


@router.get("/{surat_id}/download")
def download_surat_tugas(surat_id: int, db: Session = Depends(get_db)):
    """
    Mengunduh dokumen .docx surat tugas hasil generate.
    """
    surat = db.query(SuratTugas).filter(SuratTugas.id == surat_id).first()
    if not surat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Surat Tugas dengan ID {surat_id} tidak ditemukan.",
        )

    file_path = surat.file_output_path
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File dokumen surat tugas fisik tidak ditemukan di server.",
        )

    # Jika file terdaftar masih bertipe .docx, periksa apakah file .pdf sudah ada
    if file_path.lower().endswith(".docx"):
        candidate_pdf = file_path[:-5] + ".pdf"
        if os.path.exists(candidate_pdf):
            file_path = candidate_pdf

    filename = os.path.basename(file_path)
    media_type = (
        "application/pdf"
        if file_path.lower().endswith(".pdf")
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
