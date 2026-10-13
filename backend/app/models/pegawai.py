from sqlalchemy import Column, DateTime, Integer, String, func

from app.core.database import Base


class Pegawai(Base):
    __tablename__ = "pegawai"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nama = Column(String(255), nullable=False)
    nip = Column(String(18), unique=True, index=True, nullable=False)
    golongan = Column(String(50), nullable=True)  # PJLP bernilai NULL
    pangkat = Column(String(100), nullable=False)
    jabatan = Column(String(255), nullable=False)
    jurusan = Column(String(255), nullable=True)
    pendidikan_terakhir = Column(String(50), nullable=True)
    gelar = Column(String(100), nullable=True)
    jenis_kelamin = Column(String(20), nullable=True)
    status = Column(String(20), default="Aktif", nullable=False)  # 'Aktif' / 'Cuti'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
