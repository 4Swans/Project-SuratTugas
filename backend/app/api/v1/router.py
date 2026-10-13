from fastapi import APIRouter

from app.api.v1 import (
    auth,
    ekstraksi,
    nomor_surat,
    pegawai,
    pejabat,
    surat_tugas,
    sync,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Autentikasi"])
api_router.include_router(users.router, prefix="/users", tags=["Manajemen Pengguna"])
api_router.include_router(pegawai.router, prefix="/pegawai", tags=["Pegawai"])
api_router.include_router(pejabat.router, prefix="/pejabat", tags=["Pejabat Penandatangan"])
api_router.include_router(nomor_surat.router, prefix="/nomor-surat", tags=["Nomor Surat"])
api_router.include_router(surat_tugas.router, prefix="/surat-tugas", tags=["Surat Tugas"])
api_router.include_router(ekstraksi.router, prefix="/ekstraksi", tags=["Ekstraksi Undangan AI"])
api_router.include_router(sync.router, prefix="/sync", tags=["Sinkronisasi Sheets"])

