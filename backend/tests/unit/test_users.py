import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services import user_service


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


def test_seed_and_create_user(db_session):
    user_service.ensure_seed_users(db_session)
    users = user_service.get_users(db_session)
    assert len(users) == 2

    # Tambah user baru
    new_user = user_service.create_user(
        db_session,
        UserCreate(
            username="dita_pusaka",
            nama="Dita Rahmawati",
            role="staff_tu",
            password="password123",
        ),
    )
    assert new_user.id is not None
    assert new_user.username == "dita_pusaka"
    assert new_user.role == "staff_tu"

    # Cek duplicate
    with pytest.raises(ValueError):
        user_service.create_user(
            db_session,
            UserCreate(
                username="dita_pusaka",
                nama="Dita Duplikat",
                role="staff_tu",
                password="password123",
            ),
        )


def test_update_user_and_role(db_session):
    user_service.ensure_seed_users(db_session)
    admin = user_service.get_user_by_username(db_session, "admin")
    staff = user_service.get_user_by_username(db_session, "tupusaka")

    # Update role staff_tu -> superadmin
    updated_staff = user_service.update_user_role(
        db_session, user=staff, new_role="superadmin", current_admin_id=admin.id
    )
    assert updated_staff.role == "superadmin"

    # Update nama dan username
    updated_staff2 = user_service.update_user(
        db_session,
        user=updated_staff,
        data=UserUpdate(nama="Staff Promoted Superadmin"),
    )
    assert updated_staff2.nama == "Staff Promoted Superadmin"


def test_prevent_demoting_or_deleting_last_admin(db_session):
    user_service.ensure_seed_users(db_session)
    admin = user_service.get_user_by_username(db_session, "admin")

    # Hanya ada 1 superadmin, coba ubah role sendiri ke staff_tu -> harus ditolak
    with pytest.raises(ValueError, match="satu-satunya Superadmin"):
        user_service.update_user_role(
            db_session, user=admin, new_role="staff_tu", current_admin_id=admin.id
        )

    # Coba hapus akun sendiri -> harus ditolak
    with pytest.raises(ValueError, match="tidak dapat menghapus akun Anda sendiri"):
        user_service.delete_user(db_session, user=admin, current_admin_id=admin.id)
