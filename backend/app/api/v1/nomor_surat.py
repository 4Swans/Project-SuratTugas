from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.nomor_surat import NomorSurat
from app.schemas.nomor_surat import NomorSuratPreviewResponse, NomorSuratResponse
from app.services import nomor_surat_service

router = APIRouter()


@router.get("/preview", response_model=NomorSuratPreviewResponse)
def preview_next_nomor(db: Session = Depends(get_db)):
    """
    Melihat simulasi nomor surat berikutnya tanpa menyimpan atau mengunci database.
    """
    return nomor_surat_service.preview_next_nomor_surat(db)


@router.get("", response_model=list[NomorSuratResponse])
def read_nomor_surat_history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Mengambil riwayat nomor surat yang telah terbit.
    """
    records = db.query(NomorSurat).order_by(desc(NomorSurat.id)).offset(offset).limit(limit).all()
    return records
