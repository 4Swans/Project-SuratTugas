from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.pejabat import PejabatPenandatangan
from app.schemas.pejabat import PejabatResponse
from app.services import pegawai_service, pejabat_service

router = APIRouter()


def _format_pejabat_response(p: PejabatPenandatangan) -> PejabatResponse:
    res = PejabatResponse.model_validate(p)
    res.pangkat_golongan_display = pegawai_service.format_pangkat_golongan(p.pangkat, p.golongan)
    res.nama_lengkap_display = pegawai_service.format_nama_lengkap(p.nama, p.gelar)
    return res


@router.get("", response_model=list[PejabatResponse])
def read_pejabat_list(db: Session = Depends(get_db)):
    """
    Mengambil 6 pilihan pejabat penandatangan dengan tanda default pada Kepala Pusat.
    """
    pejabat_list = pejabat_service.get_all_pejabat(db)
    return [_format_pejabat_response(p) for p in pejabat_list]


@router.get("/{pejabat_id}", response_model=PejabatResponse)
def read_pejabat(pejabat_id: int, db: Session = Depends(get_db)):
    """
    Mengambil detail satu pejabat penandatangan berdasarkan ID.
    """
    p = pejabat_service.get_pejabat_by_id(db, pejabat_id)
    if not p:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pejabat dengan ID {pejabat_id} tidak ditemukan.",
        )
    return _format_pejabat_response(p)
