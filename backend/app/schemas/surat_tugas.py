from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.nomor_surat import NomorSuratResponse
from app.schemas.pegawai import PegawaiResponse
from app.schemas.pejabat import PejabatResponse


class PegawaiTugasItem(BaseModel):
    pegawai_id: int
    urutan: int = 1


class SuratTugasCreate(BaseModel):
    menimbang: str | None = None
    dasar_surat: str
    perihal: str
    tanggal_mulai: date
    tanggal_selesai: date
    lokasi: str
    topik: str | None = None
    konseptor: str | None = None
    penandatangan_id: int
    pegawai_ids: list[int]
    dibuat_oleh: str | None = "Staf TU"


class SuratTugasResponse(BaseModel):
    id: int
    nomor_surat: NomorSuratResponse
    menimbang: str | None = None
    dasar_surat: str
    perihal: str
    tanggal_mulai: date
    tanggal_selesai: date
    lokasi: str
    topik: str | None = None
    konseptor: str | None = None
    penandatangan: PejabatResponse
    pegawai_list: list[PegawaiResponse]
    file_output_path: str | None = None
    sheets_sync_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
