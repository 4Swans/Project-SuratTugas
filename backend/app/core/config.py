from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str = "mysql+pymysql://root:@localhost:3306/surat_tugas"

    # Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"

    # Security
    SECRET_KEY: str = "supersecretjwtkeychangethisinproduction1234567890"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # CORS
    CORS_ORIGINS: str | list[str] = "http://localhost:3000"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Storage & Timezone
    STORAGE_DIR: str = "./storage"
    APP_TIMEZONE: str = "Asia/Jakarta"

    # Google Sheets Mirror Sync & Apps Script
    SHEETS_SYNC_ENABLED: bool = True
    GOOGLE_APPS_SCRIPT_URL: str | None = None
    GOOGLE_SHEET_URL: str = "https://docs.google.com/spreadsheets/d/1E3pMrc5I8QQEtIicvoGtHJQEFXB9nm8OfTqeVQHu2TM/edit?gid=599707024#gid=599707024"
    GOOGLE_SHEET_GID: str = "599707024"
    GOOGLE_SERVICE_ACCOUNT_FILE: str = "./credentials/service-account.json"
    GOOGLE_SHEET_ID: str = "1E3pMrc5I8QQEtIicvoGtHJQEFXB9nm8OfTqeVQHu2TM"
    SHEET_TAB_NOMOR_SURAT: str = "Register_2026"
    SHEET_TAB_LOG_SURAT: str = "Log Surat Tugas"
    SHEET_TAB_PEGAWAI: str = "Database Kepegawaian"
    SHEET_TAB_PEJABAT: str = "Database Pejabat Penandatangan"


settings = Settings()
