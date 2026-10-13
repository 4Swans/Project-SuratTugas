from pydantic import BaseModel, ConfigDict


class PejabatBase(BaseModel):
    nama: str
    nip: str
    golongan: str | None = None
    pangkat: str
    jabatan: str
    gelar: str | None = None
    is_default: bool = False


class PejabatResponse(PejabatBase):
    id: int
    pangkat_golongan_display: str | None = None
    nama_lengkap_display: str | None = None

    model_config = ConfigDict(from_attributes=True)
