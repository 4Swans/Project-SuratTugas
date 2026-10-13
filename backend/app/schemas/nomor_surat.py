from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NomorSuratPreviewResponse(BaseModel):
    nomor_urut: int
    tahun: int
    bulan: str
    nomor_lengkap: str
    latest_nomor_urut: int | None = None
    source: str | None = "database"
    sheet_connected: bool | None = False
    sheet_latest_urut: int | None = None
    db_latest_urut: int | None = None


class NomorSuratResponse(BaseModel):
    id: int
    nomor_urut: int
    tahun: int
    nomor_lengkap: str
    tanggal_dibuat: datetime
    perihal: str | None = None
    dibuat_oleh: str | None = None

    model_config = ConfigDict(from_attributes=True)
