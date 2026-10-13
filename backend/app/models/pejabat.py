from sqlalchemy import Boolean, Column, Integer, String

from app.core.database import Base


class PejabatPenandatangan(Base):
    __tablename__ = "pejabat_penandatangan"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nama = Column(String(255), nullable=False)
    nip = Column(String(18), unique=True, index=True, nullable=False)
    golongan = Column(String(50), nullable=True)
    pangkat = Column(String(100), nullable=False)
    jabatan = Column(String(255), nullable=False)
    gelar = Column(String(100), nullable=True)
    is_default = Column(Boolean, default=False, nullable=False)
