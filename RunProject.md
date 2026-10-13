# Panduan Menjalankan Surat Tugas Generator

### 1. Database MySQL (XAMPP)

**Cara Menjalankan MySQL:**
```powershell
C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini --standalone
```
*(Atau nyalakan modul MySQL via XAMPP Control Panel)*

**Cara Menghentikan MySQL dari PowerShell:**
```powershell
# Cara 1: Menggunakan mysqladmin bawaan XAMPP (Direkomendasikan & Bersih)
C:\xampp\mysql\bin\mysqladmin.exe -u root shutdown

# Cara 2: Menghentikan proses mysqld
Stop-Process -Name mysqld -Force
```

---

### 2. Jalankan Backend (Terminal 1)
```powershell
cd c:\Project-SuratTugas\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Docs: `http://127.0.0.1:8000/docs`

---

### 3. Jalankan Frontend (Terminal 2)
```powershell
cd c:\Project-SuratTugas\frontend
npm run dev
```
Aplikasi Web: `http://localhost:3000`

---

### 4. Akun Login & Hak Akses (Role-Based Access Control)

Saat pertama kali membuka `http://localhost:3000`, sistem akan otomatis mengarahkan ke halaman login (`/login`). Pengguna wajib login terlebih dahulu untuk membuka aplikasi.

Tersedia 2 peran resmi dalam sistem:

| Peran (*Role*) | Username | Password | Deskripsi Hak Akses |
| :--- | :--- | :--- | :--- |
| **Superadmin** | `admin` | `admin@#!` | **Akses Penuh:** Kelola pengguna, ubah role akses akun lain, master data pegawai & pejabat, buat surat tugas, sinkronisasi spreadsheet. |
| **Staff TU** | `tupusaka` | `pusaka@#!` | **Operasional TU:** Buat surat tugas, ekstraksi AI undangan, kelola pegawai & pejabat, sinkronisasi Google Sheets, unduh dokumen. |

Dokumentasi lengkap hak akses, matriks izin, dan panduan manajemen pengguna dapat dilihat pada berkas:
📄 [`accounts.md`](file:///c:/Project-SuratTugas/accounts.md)