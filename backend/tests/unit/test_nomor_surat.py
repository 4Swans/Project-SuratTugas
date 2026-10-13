from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, NomorSurat
from app.services.nomor_surat_service import (
    generate_next_nomor_surat,
)


def test_nomor_surat_increment():
    # Setup in-memory sqlite for test
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSession()

    try:
        # Simulasi nomor surat pertama
        n1 = generate_next_nomor_surat(db, perihal="Test 1", commit=True)
        assert n1.nomor_urut == 1
        assert n1.tahun == datetime.now().year
        assert (
            f"1/SJ.9/KP.01.06/{datetime.now().month:02d}/{datetime.now().year}" == n1.nomor_lengkap
        )

        # Simulasi nomor surat kedua
        n2 = generate_next_nomor_surat(db, perihal="Test 2", commit=True)
        assert n2.nomor_urut == 2
        assert (
            f"2/SJ.9/KP.01.06/{datetime.now().month:02d}/{datetime.now().year}" == n2.nomor_lengkap
        )

    finally:
        db.close()


def test_nomor_surat_year_reset():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSession()

    try:
        # Masukkan nomor urut terakhir tahun sebelumnya (misal tahun 2025 nomor 999)
        old_nomor = NomorSurat(
            nomor_urut=999,
            tahun=2025,
            nomor_lengkap="999/SJ.9/KP.01.06/12/2025",
            perihal="Arsip 2025",
        )
        db.add(old_nomor)
        db.commit()

        # Generate nomor tahun sekarang -> harus reset mulai dari 1
        n_new = generate_next_nomor_surat(db, perihal="Surat Tahun Baru", commit=True)
        current_year = datetime.now().year
        if current_year != 2025:
            assert n_new.nomor_urut == 1
            assert n_new.tahun == current_year

    finally:
        db.close()
