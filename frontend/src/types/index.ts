export interface Pegawai {
  id: number;
  nama: string;
  nip: string;
  golongan: string | null;
  pangkat: string;
  jabatan: string;
  jurusan?: string | null;
  pendidikan_terakhir?: string | null;
  gelar?: string | null;
  jenis_kelamin?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  pangkat_golongan_display?: string;
  nama_lengkap_display?: string;
}

export interface Pejabat {
  id: number;
  nama: string;
  nip: string;
  golongan: string | null;
  pangkat: string;
  jabatan: string;
  gelar?: string | null;
  is_default: boolean;
  pangkat_golongan_display?: string;
  nama_lengkap_display?: string;
}

export interface NomorSurat {
  id: number;
  nomor_urut: number;
  tahun: number;
  nomor_lengkap: string;
  tanggal_dibuat: string;
  perihal?: string | null;
  dibuat_oleh?: string | null;
}

export interface NomorSuratPreview {
  nomor_urut: number;
  tahun: number;
  bulan: string;
  nomor_lengkap: string;
  latest_nomor_urut?: number;
  source?: "database" | "spreadsheet";
  sheet_connected?: boolean;
  sheet_latest_urut?: number | null;
  db_latest_urut?: number;
}

export interface SuratTugas {
  id: number;
  nomor_surat: NomorSurat;
  menimbang?: string | null;
  dasar_surat: string;
  perihal: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  lokasi: string;
  topik?: string | null;
  konseptor?: string | null;
  penandatangan: Pejabat;
  pegawai_list: Pegawai[];
  file_output_path?: string | null;
  sheets_sync_status: "pending" | "synced" | "failed";
  created_at: string;
}

export interface SuratTugasCreatePayload {
  menimbang?: string;
  dasar_surat: string;
  perihal: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  lokasi: string;
  topik?: string;
  konseptor?: string;
  penandatangan_id: number;
  pegawai_ids: number[];
  dibuat_oleh?: string;
}

export interface EkstraksiUndanganResult {
  nama_acara?: string | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  lokasi?: string | null;
  topik?: string | null;
  nomor_surat_undangan?: string | null;
  instansi_pengundang?: string | null;
  dasar_surat?: string | null;
  ringkasan?: string | null;
  file_name?: string | null;
  file_path?: string | null;
}

export interface SheetsSyncStatus {
  enabled: boolean;
  apps_script_url_configured: boolean;
  sheet_url: string;
  sheet_gid: string;
  total_surat: number;
  synced_count: number;
  pending_count: number;
  failed_count: number;
  last_sync_time?: string | null;
  latest_db_nomor_urut: number;
  latest_sheet_nomor_urut?: number | null;
  is_number_in_sync: boolean;
  connection_message?: string | null;
}

export type UserRole = "superadmin" | "staff_tu" | string;

export interface User {
  id: number;
  username: string;
  nama: string;
  role: UserRole;
}

export interface RoleInfo {
  role: string;
  label: string;
  description: string;
  badge_color: string;
  permissions: string[];
}

export interface UserCreatePayload {
  username: string;
  nama: string;
  role: string;
  password: string;
}

export interface UserUpdatePayload {
  nama?: string;
  username?: string;
  role?: string;
  password?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

