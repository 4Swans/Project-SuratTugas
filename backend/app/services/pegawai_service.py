from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.pegawai import Pegawai


def format_nama_lengkap(nama: str, gelar: str | None = None) -> str:
    """
    Format nama lengkap dengan gelar.
    Menangani gelar depan (seperti Dr.) dan gelar belakang (seperti S.T., M.T.).
    Contoh:
    - Oki Suryowahono + S.T., M.T. -> Oki Suryowahono, S.T., M.T.
    - Anna Christina + Dr. S.T., M.T. -> Dr. Anna Christina, S.T., M.T.
    """
    nama = nama.strip()
    if not gelar or not gelar.strip():
        return nama

    gelar = gelar.strip()

    # Cek apakah ada gelar depan seperti "Dr." atau "Prof."
    gelar_depan = []
    gelar_belakang = []

    parts = [p.strip() for p in gelar.split(",") if p.strip()]
    for p in parts:
        sub_tokens = p.split()
        for tok in sub_tokens:
            if tok.lower() in ["dr.", "dr", "prof.", "prof", "dra.", "drs."]:
                gelar_depan.append(tok if tok.endswith(".") else tok + ".")
            else:
                gelar_belakang.append(tok)

    prefix = " ".join(gelar_depan) + " " if gelar_depan else ""
    suffix = (
        ", " + ", ".join(parts_cleaned)
        if (
            parts_cleaned := [
                p
                for p in parts
                if not any(
                    d.lower().rstrip(".") == p.lower().rstrip(".")
                    for d in ["dr", "prof", "dra", "drs"]
                )
            ]
        )
        else ""
    )

    result = f"{prefix}{nama}{suffix}".strip()
    return result


def format_pangkat_golongan(pangkat: str | None, golongan: str | None) -> str:
    """
    Format pangkat dan golongan sesuai aturan dokumen resmi Komdigi:
    - PNS: 'Pembina / IVa' atau 'Pembina Tingkat I / IVb'
    - PPPK: 'Penata Muda (PPPK)' (tanpa garis miring/golongan)
    - PJLP: 'Penyedia Jasa Lainnya Perorangan (PJLP)' (tanpa golongan)
    """
    pangkat = pangkat.strip() if pangkat else ""
    golongan = golongan.strip() if golongan else ""

    if not pangkat:
        return golongan

    # PJLP
    if "PJLP" in pangkat.upper() or "PENYEDIA JASA" in pangkat.upper():
        return "Penyedia Jasa Lainnya Perorangan (PJLP)"

    # PPPK
    if "PPPK" in pangkat.upper() or golongan == "IX":
        if "PPPK" in pangkat.upper():
            return pangkat
        return f"{pangkat} (PPPK)"

    # PNS
    if golongan:
        # Format golongan sesuai naskah dinas resmi (contoh: IIIb, IVc)
        clean_gol = golongan.replace("/", "").strip()
        return f"{pangkat} / {clean_gol}"

    return pangkat


def get_pegawai_list(
    db: Session,
    query: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[Pegawai]:
    q = db.query(Pegawai)
    if status:
        q = q.filter(Pegawai.status == status)
    if query:
        search = f"%{query}%"
        q = q.filter(
            or_(
                Pegawai.nama.ilike(search),
                Pegawai.nip.ilike(search),
                Pegawai.jabatan.ilike(search),
            )
        )
    return q.order_by(Pegawai.id.asc()).offset(offset).limit(limit).all()


def get_pegawai_by_id(db: Session, pegawai_id: int) -> Pegawai | None:
    return db.query(Pegawai).filter(Pegawai.id == pegawai_id).first()


def get_pegawai_by_nips(db: Session, nips: list[str]) -> list[Pegawai]:
    return db.query(Pegawai).filter(Pegawai.nip.in_(nips)).all()


def get_pegawai_by_ids(db: Session, ids: list[int]) -> list[Pegawai]:
    return db.query(Pegawai).filter(Pegawai.id.in_(ids)).all()
