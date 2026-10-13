from typing import Optional

from pydantic import BaseModel, Field


class EkstraksiUndanganResponse(BaseModel):
    nama_acara: Optional[str] = Field(
        None, description="Nama resmi kegiatan atau acara yang tertera di surat undangan"
    )
    tanggal_mulai: Optional[str] = Field(
        None, description="Tanggal mulai kegiatan dalam format YYYY-MM-DD"
    )
    tanggal_selesai: Optional[str] = Field(
        None, description="Tanggal selesai kegiatan dalam format YYYY-MM-DD"
    )
    lokasi: Optional[str] = Field(
        None, description="Lokasi atau tempat diselenggarakannya kegiatan"
    )
    topik: Optional[str] = Field(None, description="Topik atau pokok bahasan kegiatan")
    nomor_surat_undangan: Optional[str] = Field(None, description="Nomor resmi surat undangan")
    instansi_pengundang: Optional[str] = Field(
        None, description="Nama instansi atau organisasi yang mengundang"
    )
    dasar_surat: Optional[str] = Field(
        None, description="Formulasi kalimat dasar surat tugas yang siap pakai"
    )
    ringkasan: Optional[str] = Field(None, description="Ringkasan singkat isi surat undangan")
    file_name: Optional[str] = None
    file_path: Optional[str] = None
