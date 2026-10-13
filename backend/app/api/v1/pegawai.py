from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.pegawai import Pegawai
from app.schemas.pegawai import PegawaiResponse
from app.services import pegawai_service

router = APIRouter()


def _format_pegawai_response(p: Pegawai) -> PegawaiResponse:
    res = PegawaiResponse.model_validate(p)
    res.pangkat_golongan_display = pegawai_service.format_pangkat_golongan(p.pangkat, p.golongan)
    res.nama_lengkap_display = pegawai_service.format_nama_lengkap(p.nama, p.gelar)
    return res


@router.get("", response_model=list[PegawaiResponse])
def read_pegawai_list(
    q: str | None = Query(None, description="Pencarian nama, NIP, atau jabatan"),
    status: str | None = Query(None, description="Filter status (Aktif/Cuti)"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Mengambil daftar pegawai dengan pencarian dan filter status.
    """
    pegawai_list = pegawai_service.get_pegawai_list(
        db, query=q, status=status, limit=limit, offset=offset
    )
    return [_format_pegawai_response(p) for p in pegawai_list]


@router.get("/{pegawai_id}", response_model=PegawaiResponse)
def read_pegawai(pegawai_id: int, db: Session = Depends(get_db)):
    """
    Mengambil detail satu pegawai berdasarkan ID.
    """
    p = pegawai_service.get_pegawai_by_id(db, pegawai_id)
    if not p:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pegawai dengan ID {pegawai_id} tidak ditemukan.",
        )
    return _format_pegawai_response(p)
