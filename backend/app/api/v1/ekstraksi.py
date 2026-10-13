from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.schemas.ekstraksi import EkstraksiUndanganResponse
from app.services import ekstraksi_service

router = APIRouter()

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("/undangan", response_model=EkstraksiUndanganResponse)
async def extract_undangan_endpoint(file: UploadFile = File(...)):
    """
    Upload dokumen undangan (PDF, Word, Scan Gambar) untuk diekstrak
    secara otomatis oleh Gemini API.

    Hasil ekstraksi ini TIDAK langsung disimpan sebagai Surat Tugas,
    melainkan dikembalikan ke staf TU untuk diverifikasi dan diedit.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Nama file tidak boleh kosong."
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ukuran file terlalu besar. Maksimum 20 MB.",
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File kosong.")

    result = ekstraksi_service.extract_undangan(
        file_bytes=file_bytes, filename=file.filename, content_type=file.content_type
    )
    return result
