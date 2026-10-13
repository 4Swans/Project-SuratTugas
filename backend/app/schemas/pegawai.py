from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PegawaiBase(BaseModel):
    nama: str
    nip: str
    golongan: str | None = None
    pangkat: str
    jabatan: str
    jurusan: str | None = None
    pendidikan_terakhir: str | None = None
    gelar: str | None = None
    jenis_kelamin: str | None = None
    status: str = "Aktif"


class PegawaiCreate(PegawaiBase):
    pass


class PegawaiUpdate(BaseModel):
    nama: str | None = None
    nip: str | None = None
    golongan: str | None = None
    pangkat: str | None = None
    jabatan: str | None = None
    jurusan: str | None = None
    pendidikan_terakhir: str | None = None
    gelar: str | None = None
    jenis_kelamin: str | None = None
    status: str | None = None


class PegawaiResponse(PegawaiBase):
    id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
    pangkat_golongan_display: str | None = None
    nama_lengkap_display: str | None = None

    model_config = ConfigDict(from_attributes=True)
