from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin
from app.models.user import User
from app.schemas.user import (
    RoleInfo,
    UserCreate,
    UserResponse,
    UserRoleUpdate,
    UserUpdate,
)
from app.services import user_service

router = APIRouter()


@router.get("/roles", response_model=list[RoleInfo])
def get_roles(current_user: User = Depends(get_current_user)):
    """
    Mengambil daftar role yang tersedia dan hak akses masing-masing.
    """
    return user_service.get_available_roles()


@router.get("", response_model=list[UserResponse])
def list_users(
    q: str | None = Query(None, description="Pencarian nama atau username"),
    role: str | None = Query(None, description="Filter berdasarkan role (superadmin, staff_tu)"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Mengambil daftar seluruh pengguna (khusus Superadmin).
    """
    user_service.ensure_seed_users(db)
    users = user_service.get_users(db, query=q, role=role, limit=limit, offset=offset)
    return [UserResponse.model_validate(u) for u in users]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_new_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Membuat pengguna baru dan menetapkan role akses (khusus Administrator).
    """
    try:
        new_user = user_service.create_user(db, payload)
        return UserResponse.model_validate(new_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{user_id}", response_model=UserResponse)
def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Mengambil detail satu pengguna berdasarkan ID.
    """
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pengguna dengan ID {user_id} tidak ditemukan.",
        )
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Memperbarui profil pengguna, username, password, atau role (khusus Administrator).
    """
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pengguna dengan ID {user_id} tidak ditemukan.",
        )

    try:
        updated = user_service.update_user(db, user, payload)
        return UserResponse.model_validate(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Memperbarui role hak akses pengguna secara langsung (khusus Administrator).
    """
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pengguna dengan ID {user_id} tidak ditemukan.",
        )

    try:
        updated = user_service.update_user_role(
            db=db, user=user, new_role=payload.role, current_admin_id=admin.id
        )
        return UserResponse.model_validate(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Menghapus akun pengguna (khusus Administrator).
    """
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pengguna dengan ID {user_id} tidak ditemukan.",
        )

    try:
        user_service.delete_user(db, user=user, current_admin_id=admin.id)
        return {"success": True, "message": f"Pengguna '{user.username}' berhasil dihapus."}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
