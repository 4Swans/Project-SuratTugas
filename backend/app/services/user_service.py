from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, RoleInfo

VALID_ROLES = ["superadmin", "staff_tu"]

ROLE_DETAILS = [
    RoleInfo(
        role="superadmin",
        label="Superadmin",
        description="Akses penuh ke semua fitur: manajemen pengguna, ubah role akses, master data pegawai & pejabat, pembuatan surat tugas, dan sinkronisasi.",
        badge_color="purple",
        permissions=[
            "Kelola Pengguna & Hak Akses",
            "Buat & Edit Surat Tugas",
            "Kelola Pegawai & Pejabat",
            "Sinkronisasi Google Sheets",
            "Unduh DOCX & PDF",
        ],
    ),
    RoleInfo(
        role="staff_tu",
        label="Staff TU",
        description="Akses operasional: pembuatan surat tugas baru, ekstraksi undangan AI, kelola data pegawai & pejabat, sinkronisasi Google Sheets, dan unduh berkas.",
        badge_color="emerald",
        permissions=[
            "Buat Surat Tugas Baru",
            "Ekstraksi Undangan AI",
            "Kelola Pegawai & Pejabat",
            "Sinkronisasi Google Sheets",
            "Unduh DOCX & PDF",
        ],
    ),
]


def get_available_roles() -> list[RoleInfo]:
    return ROLE_DETAILS


def ensure_seed_users(db: Session) -> None:
    seeds = [
        {
            "username": "admin",
            "password": "admin@#!",
            "nama": "Superadmin Pusaka",
            "role": "superadmin",
        },
        {
            "username": "tupusaka",
            "password": "pusaka@#!",
            "nama": "Staff Tata Usaha Pusaka",
            "role": "staff_tu",
        },
    ]

    for seed in seeds:
        existing = db.query(User).filter(User.username == seed["username"]).first()
        if not existing:
            new_user = User(
                username=seed["username"],
                password_hash=get_password_hash(seed["password"]),
                nama=seed["nama"],
                role=seed["role"],
            )
            db.add(new_user)
        else:
            # Pastikan password dan role sesuai dengan spesifikasi terbaru
            existing.password_hash = get_password_hash(seed["password"])
            existing.role = seed["role"]
            existing.nama = seed["nama"]

    # Hapus akun lama yang sudah tidak digunakan
    obsolete_usernames = ["tu_pusaka", "operator_pusaka", "staff_pusaka"]
    for old_u in obsolete_usernames:
        old_user = db.query(User).filter(User.username == old_u).first()
        if old_user:
            db.delete(old_user)

    db.commit()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def get_users(
    db: Session,
    query: str | None = None,
    role: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[User]:
    q = db.query(User)
    if role:
        q = q.filter(User.role == role.lower().strip())
    if query:
        term = f"%{query.strip()}%"
        q = q.filter(or_(User.username.ilike(term), User.nama.ilike(term)))
    return q.order_by(User.id.asc()).offset(offset).limit(limit).all()


def create_user(db: Session, data: UserCreate) -> User:
    role = data.role.lower().strip()
    if role not in VALID_ROLES:
        raise ValueError(
            f"Role '{data.role}' tidak valid. Pilihan role yang tersedia: {', '.join(VALID_ROLES)}"
        )

    existing = get_user_by_username(db, data.username.strip())
    if existing:
        raise ValueError(f"Username '{data.username}' sudah digunakan. Silakan pilih username lain.")

    user = User(
        username=data.username.strip(),
        password_hash=get_password_hash(data.password),
        nama=data.nama.strip(),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user: User, data: UserUpdate) -> User:
    if data.username and data.username.strip() != user.username:
        new_username = data.username.strip()
        existing = get_user_by_username(db, new_username)
        if existing and existing.id != user.id:
            raise ValueError(f"Username '{new_username}' sudah digunakan.")
        user.username = new_username

    if data.nama and data.nama.strip():
        user.nama = data.nama.strip()

    if data.role:
        new_role = data.role.lower().strip()
        if new_role not in VALID_ROLES:
            raise ValueError(f"Role '{data.role}' tidak valid. Pilihan: {', '.join(VALID_ROLES)}")
        user.role = new_role

    if data.password and len(data.password.strip()) >= 6:
        user.password_hash = get_password_hash(data.password.strip())

    db.commit()
    db.refresh(user)
    return user


def update_user_role(
    db: Session, user: User, new_role: str, current_admin_id: int
) -> User:
    target_role = new_role.lower().strip()
    if target_role not in VALID_ROLES:
        raise ValueError(
            f"Role '{new_role}' tidak valid. Pilihan yang tersedia: {', '.join(VALID_ROLES)}"
        )

    # Validasi jika Superadmin mengubah role dirinya sendiri menjadi non-superadmin
    if user.id == current_admin_id and target_role != "superadmin":
        superadmin_count = (
            db.query(User).filter(User.role.in_(["superadmin", "admin"])).count()
        )
        if superadmin_count <= 1:
            raise ValueError(
                "Tidak dapat mengubah role akun ini karena merupakan satu-satunya Superadmin di sistem."
            )

    user.role = target_role
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: User, current_admin_id: int) -> bool:
    if user.id == current_admin_id:
        raise ValueError("Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.")

    if user.role in ["superadmin", "admin"]:
        superadmin_count = (
            db.query(User).filter(User.role.in_(["superadmin", "admin"])).count()
        )
        if superadmin_count <= 1:
            raise ValueError(
                "Tidak dapat menghapus akun Superadmin satu-satunya di sistem."
            )

    db.delete(user)
    db.commit()
    return True
