from sqlalchemy import Column, DateTime, Integer, String, Text, UniqueConstraint, func

from app.core.database import Base


class NomorSurat(Base):
    __tablename__ = "nomor_surat"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nomor_urut = Column(Integer, nullable=False)
    tahun = Column(Integer, nullable=False)
    nomor_lengkap = Column(String(100), unique=True, index=True, nullable=False)
    tanggal_dibuat = Column(DateTime(timezone=True), server_default=func.now())
    perihal = Column(Text, nullable=True)
    dibuat_oleh = Column(String(100), nullable=True)

    __table_args__ = (UniqueConstraint("tahun", "nomor_urut", name="uq_tahun_nomor_urut"),)
