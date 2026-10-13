from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Username unik")
    nama: str = Field(..., min_length=2, max_length=100, description="Nama lengkap pengguna")
    role: str = Field(
        default="staff_tu",
        description="Peran akses: superadmin (Superadmin) atau staff_tu (Staff TU)",
    )


class UserCreate(UserBase):
    password: str = Field(
        ..., min_length=6, description="Password pengguna, minimal 6 karakter"
    )


class UserUpdate(BaseModel):
    nama: Optional[str] = Field(None, min_length=2, max_length=100)
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    role: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)


class UserRoleUpdate(BaseModel):
    role: str = Field(
        ...,
        description="Role baru pengguna: superadmin atau staff_tu",
    )


class UserResponse(BaseModel):
    id: int
    username: str
    nama: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class RoleInfo(BaseModel):
    role: str
    label: str
    description: str
    badge_color: str
    permissions: list[str]
