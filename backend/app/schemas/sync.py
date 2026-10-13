from datetime import datetime

from pydantic import BaseModel


class SheetsSyncStatusResponse(BaseModel):
    enabled: bool
    apps_script_url_configured: bool
    sheet_url: str
    sheet_gid: str
    total_surat: int
    synced_count: int
    pending_count: int
    failed_count: int
    last_sync_time: datetime | None = None
    latest_db_nomor_urut: int = 0
    latest_sheet_nomor_urut: int | None = None
    is_number_in_sync: bool = True
    connection_message: str | None = None


class SheetsSyncRetryResponse(BaseModel):
    message: str
    retried_count: int
    success_count: int
    failed_count: int


class SheetsSyncPullResponse(BaseModel):
    success: bool
    message: str
    synced_count: int
    sheet_latest: int | None = None
    total_rows: int | None = None
