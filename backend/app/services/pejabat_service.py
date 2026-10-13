from sqlalchemy.orm import Session

from app.models.pejabat import PejabatPenandatangan


def get_all_pejabat(db: Session) -> list[PejabatPenandatangan]:
    return (
        db.query(PejabatPenandatangan)
        .order_by(PejabatPenandatangan.is_default.desc(), PejabatPenandatangan.id.asc())
        .all()
    )


def get_default_pejabat(db: Session) -> PejabatPenandatangan | None:
    return db.query(PejabatPenandatangan).filter(PejabatPenandatangan.is_default.is_(True)).first()


def get_pejabat_by_id(db: Session, pejabat_id: int) -> PejabatPenandatangan | None:
    return db.query(PejabatPenandatangan).filter(PejabatPenandatangan.id == pejabat_id).first()
