"""
Script untuk seeding 6 pejabat penandatangan ke database MySQL (tabel pejabat_penandatangan).
1 Kepala Pusat (is_default = True) + 5 Koordinator Tim / Kasubbag TU (is_default = False).
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.pejabat import PejabatPenandatangan

PEJABAT_DATA = [
    {
        "nama": "Oki Suryowahono",
        "nip": "197909072008031001",
        "golongan": "IV/c",
        "pangkat": "Pembina Tingkat I",
        "jabatan": "Kepala Pusat Kebijakan Strategis",
        "gelar": "S.T., M.T.",
        "is_default": True,
    },
    {
        "nama": "Asriani Sri Wahyuni",
        "nip": "197707312011012003",
        "golongan": "IV/a",
        "pangkat": "Pembina",
        "jabatan": "Koordinator Tim Kebijakan Ekosistem Digital",
        "gelar": "SE, M.S.E",
        "is_default": False,
    },
    {
        "nama": "Dyah Purwaningrum",
        "nip": "197711122006042032",
        "golongan": "IV/b",
        "pangkat": "Pembina Tingkat I",
        "jabatan": "Koordinator Tim Tata Kelola dan Akuntabilitas",
        "gelar": "SE, MSc.",
        "is_default": False,
    },
    {
        "nama": "Septa Dewi Anggraeni",
        "nip": "198109082009122001",
        "golongan": "IV/a",
        "pangkat": "Pembina",
        "jabatan": "Koordinator Tim Komunikasi dan Kemitraan Strategis",
        "gelar": "MH",
        "is_default": False,
    },
    {
        "nama": "Achmad Yansyuru",
        "nip": "198504012011011011",
        "golongan": "III/d",
        "pangkat": "Penata Tingkat I",
        "jabatan": "Koordinator Tim Analisis Strategis",
        "gelar": "S.Sos, M.Sc",
        "is_default": False,
    },
    {
        "nama": "Anna Christina",
        "nip": "198204142008032002",
        "golongan": "IV/a",
        "pangkat": "Pembina",
        "jabatan": "Kepala Subbagian Tata Usaha",
        "gelar": "Dr. S.T., M.T.",
        "is_default": False,
    },
]


def seed_pejabat():
    db = SessionLocal()
    try:
        inserted = 0
        updated = 0
        default_count = 0

        for item in PEJABAT_DATA:
            if item["is_default"]:
                default_count += 1

            existing = (
                db.query(PejabatPenandatangan)
                .filter(PejabatPenandatangan.nip == item["nip"])
                .first()
            )

            if existing:
                existing.nama = item["nama"]
                existing.golongan = item["golongan"]
                existing.pangkat = item["pangkat"]
                existing.jabatan = item["jabatan"]
                existing.gelar = item["gelar"]
                existing.is_default = item["is_default"]
                updated += 1
            else:
                pejabat = PejabatPenandatangan(**item)
                db.add(pejabat)
                inserted += 1

        if default_count != 1:
            raise ValueError(f"Hanya boleh tepat 1 pejabat default! Ditemukan: {default_count}")

        db.commit()
        print(f"Seeding pejabat penandatangan berhasil: {inserted} baru, {updated} diperbarui.")
    except Exception as e:
        db.rollback()
        print(f"Gagal seeding pejabat: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_pejabat()
