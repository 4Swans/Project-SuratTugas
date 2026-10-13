# Dokumentasi Akun & Hak Akses Pengguna (RBAC)
### Surat Tugas Generator — Pusat Kebijakan Strategis Komdigi

Dokumen ini memuat daftar akun resmi, kredensial masuk, dan pemetaan hak akses (*Role-Based Access Control*) pada aplikasi **Surat Tugas Generator**.

---

## 1. Daftar Akun Resmi & Kredensial

Aplikasi memiliki 2 (dua) tingkat peran resmi: **Superadmin** dan **Staff TU**.

| No | Peran (*Role*) | Username | Password | Nama Akun | Keterangan Akses |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Superadmin** | `admin` | `admin@#!` | Superadmin Pusaka | **Akses Penuh:** Kelola seluruh data sistem, manajemen pengguna, ubah role hak akses, master data, dan pembuatan surat tugas. |
| **2** | **Staff TU** | `tupusaka` | `pusaka@#!` | Staff Tata Usaha Pusaka | **Operasional TU:** Buat surat tugas baru, ekstraksi AI undangan, kelola data pegawai & pejabat, sinkronisasi spreadsheet, dan unduh dokumen. |

> [!IMPORTANT]
> - Simpan kredensial ini dengan aman.
> - Saat pertama kali membuka `http://localhost:3000`, sistem akan secara otomatis mengarahkan ke halaman login (`/login`). Pengguna wajib masuk terlebih dahulu untuk dapat menggunakan aplikasi.

---

## 2. Matriks Hak Akses (*Permission Matrix*)

| Modul / Fitur Aplikasi | Superadmin (`admin`) | Staff TU (`tupusaka`) |
| :--- | :---: | :---: |
| **Login ke Sistem** | ✅ Ya | ✅ Ya |
| **Akses Dashboard & Statistik** | ✅ Ya | ✅ Ya |
| **Buat Surat Tugas Baru** | ✅ Ya | ✅ Ya |
| **Ekstraksi AI Undangan (Gemini AI)** | ✅ Ya | ✅ Ya |
| **Pratinjau & Unduh Dokumen (Word .docx & PDF)** | ✅ Ya | ✅ Ya |
| **Kelola Master Data Pegawai** | ✅ Ya | ✅ Ya |
| **Kelola Master Data Pejabat Penandatangan** | ✅ Ya | ✅ Ya |
| **Sinkronisasi Google Spreadsheet** | ✅ Ya | ✅ Ya |
| **Akses Menu Manajemen Pengguna** | ✅ Ya | ❌ Tidak |
| **Tambah Akun Pengguna Baru** | ✅ Ya | ❌ Tidak |
| **Edit Data & Reset Password Pengguna Lain** | ✅ Ya | ❌ Tidak |
| **Ubah Role Hak Akses Pengguna** | ✅ Ya | ❌ Tidak |
| **Hapus Akun Pengguna** | ✅ Ya | ❌ Tidak |

---

## 3. Mekanisme Keamanan Sistem

1. **Proteksi Rute (*Authentication Guard*)**:
   - Seluruh halaman utama (`/`, `/surat-tugas/*`, `/master-data/*`, `/manajemen-user`) dilindungi oleh *AppShell Guard*.
   - Jika sesi belum aktif, sistem secara otomatis mengarahkan pengguna ke halaman login (`http://localhost:3000/login`).
   - Setelah login berhasil, pengguna akan langsung dialihkan ke halaman utama dashboard.
2. **Pencegahan Kunci Akses (*Deadlock Prevention*)**:
   - Superadmin dicegah menghapus akunnya sendiri yang sedang aktif digunakan.
   - Superadmin tidak dapat diturunkan role-nya jika merupakan satu-satunya Superadmin yang tersisa di sistem.
3. **Validasi Dua Lapis (*Double-Layer RBAC*)**:
   - **Frontend**: Menu dan tombol manajemen pengguna hanya ditampilkan untuk akun yang memiliki peran Superadmin.
   - **Backend**: Endpoint REST API `/api/v1/users` memvalidasi token JWT dan menolak permintaan dari non-Superadmin dengan status `HTTP 403 Forbidden`.

---

## 4. Panduan Manajemen Pengguna (Khusus Superadmin)

1. Masuk menggunakan akun Superadmin (`admin` / `admin@#!`).
2. Klik menu **Manajemen User** di navbar atas, atau buka `http://localhost:3000/manajemen-user`.
3. **Mengubah Role Akses Pengguna**:
   - Pada tabel pengguna, pilih role baru melalui dropdown pemilih role pada kolom *Ubah Role Langsung*, atau klik ikon perisai untuk melihat dialog konfirmasi hak akses.
4. **Menambah Pengguna Baru**:
   - Klik tombol **+ Tambah Pengguna** di pojok kanan atas.
   - Masukkan Nama Lengkap, Username, Password (minimal 6 karakter), dan pilih role (`Superadmin` atau `Staff TU`).
5. **Mengubah Data atau Password**:
   - Klik tombol pensil (Edit) pada baris pengguna yang ingin diperbarui.
   - Masukkan password baru (opsional, jika ingin mereset).

---

*Terakhir diperbarui: 8 Oktober 2026 • Pusat Kebijakan Strategis Kementerian Komunikasi dan Digital RI*
