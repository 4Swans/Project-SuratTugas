from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class SuratTugas(Base):
    __tablename__ = "surat_tugas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nomor_surat_id = Column(Integer, ForeignKey("nomor_surat.id"), unique=True, nullable=False)
    menimbang = Column(Text, nullable=True)
    dasar_surat = Column(Text, nullable=False)
    perihal = Column(Text, nullable=False)
    tanggal_mulai = Column(Date, nullable=False)
    tanggal_selesai = Column(Date, nullable=False)
    lokasi = Column(Text, nullable=False)
    topik = Column(Text, nullable=True)
    konseptor = Column(String(255), nullable=True)
    penandatangan_id = Column(Integer, ForeignKey("pejabat_penandatangan.id"), nullable=False)
    file_undangan_path = Column(String(500), nullable=True)
    file_output_path = Column(String(500), nullable=True)
    dibuat_oleh = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Sinkronisasi Google Sheets
    sheets_sync_status = Column(
        Enum("pending", "synced", "failed", name="sheets_sync_status_enum"),
        default="pending",
        nullable=False,
    )
    sheets_synced_at = Column(DateTime(timezone=True), nullable=True)
    sheets_sync_error = Column(Text, nullable=True)

    # Relationships
    nomor_surat = relationship("NomorSurat", backref="surat_tugas", uselist=False)
    penandatangan = relationship("PejabatPenandatangan")
    pegawai_relasi = relationship(
        "SuratTugasPegawai",
        back_populates="surat_tugas",
        order_by="SuratTugasPegawai.urutan",
        cascade="all, delete-orphan",
    )


class SuratTugasPegawai(Base):
    __tablename__ = "surat_tugas_pegawai"

    id = Column(Integer, primary_key=True, autoincrement=True)
    surat_tugas_id = Column(
        Integer, ForeignKey("surat_tugas.id", ondelete="CASCADE"), nullable=False
    )
    pegawai_id = Column(Integer, ForeignKey("pegawai.id"), nullable=False)
    urutan = Column(Integer, nullable=False, default=1)

    surat_tugas = relationship("SuratTugas", back_populates="pegawai_relasi")
    pegawai = relationship("Pegawai")
