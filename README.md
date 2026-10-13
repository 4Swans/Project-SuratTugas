# Sistem Otomatisasi Surat Tugas — Pusat Kebijakan Strategis Komdigi

Sistem web terintegrasi untuk membantu staf Tata Usaha (TU) Pusat Kebijakan Strategis, Kementerian Komunikasi dan Digital RI dalam menerbitkan **Surat Tugas** secara cepat, akurat, dan otomatis.

---

## 🌟 Fitur Utama

1. **Ekstraksi AI Undangan (Gemini API)**:
   - Unggah surat undangan dalam format PDF, Word (`.docx`), atau Foto/Scan dokumen.
   - Model multimodal Gemini otomatis mengekstrak nama acara, tanggal kegiatan, nomor surat undangan, instansi pengundang, dan lokasi.
   - **Human-in-the-loop**: Hasil ekstraksi wajib dikonfirmasi/diedit staf TU sebelum surat resmi dicetak.

2. **Penomoran Surat Transaksional**:
   - Format resmi: `{nomor_urut}/SJ.9/KP.01.06/{bulan}/{tahun}` (WIB / `Asia/Jakarta`).
   - Dilengkapi *row-level lock* (`SELECT ... FOR UPDATE`) untuk mencegah duplikasi nomor jika ada request bersamaan.
   - Reset nomor urut otomatis ke `1` pada setiap pergantian tahun.

3. **Generator Dokumen PDF (.pdf) Resmi Otomatis**:
   - Menghasilkan file `.pdf` siap cetak/tanda tangan berdasarkan template resmi Pusat Kebijakan Strategis Komdigi melalui Microsoft Word COM Engine.
   - **Bagian Menimbang**: Kolom konsideran dapat diedit/disesuaikan secara fleksibel di formulir dan pratinjau.
   - **Pegawai ≤ 3 orang**: Detail nama (tanpa nomor), NIP, pangkat/golongan, dan jabatan dicantumkan langsung di badan surat dengan penataan otomatis agar **pasti muat dalam 1 halaman**.
   - **Pegawai > 3 orang**: Di badan surat tertulis `(Daftar Terlampir)`, diikuti *page break* dan tabel lampiran lengkap bergaris rapi di halaman baru.
   - **Posisi Tanda Tangan**: Rapi di sisi kanan dokumen, sejajar vertikal antara tanggal, jabatan, dan nama penandatangan.
   - **Live Split Preview**: Pratinjau dokumen interaktif yang diperbarui secara langsung (*real-time*) saat mengisi formulir.

4. **Database Kepegawaian & Pejabat**:
   - Memuat 30 pegawai Pusaka (PNS, PPPK, PJLP) dengan NIP 18 digit teks.
   - Pilihan 6 pejabat penandatangan (Kepala Pusat sebagai default + 5 Koordinator Tim).

5. **Mirror Satu Arah ke Google Sheets (Opsional)**:
   - MySQL berfungsi sebagai *single source of truth*.
   - Setiap surat yang berhasil dibuat otomatis disinkronkan ke Google Sheets via `BackgroundTasks` FastAPI secara *idempotent* (upsert).

---

## 🏗️ Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, `python-docx`, `pywin32` (Word Automation)
- **Database**: MySQL 8 / MariaDB (driver: `PyMySQL`)
- **AI**: Gemini API (`gemini-3.1-flash-lite`) via SDK `google-genai`
- **Frontend**: Next.js (App Router), TypeScript, Vanilla CSS design system, TanStack Query, Lucide Icons

---

## 🚀 Panduan Menjalankan Sistem Secara Lokal

### 1. Database MySQL
Pastikan MySQL di XAMPP atau Docker sudah berjalan dan database `surat_tugas` tersedia di port `3306`.

### 2. Backend (FastAPI)
```bash
cd backend

# Aktifkan virtual environment
.\.venv\Scripts\Activate.ps1

# Jalankan server API
uvicorn app.main:app --reload --port 8000
```
- API Docs Swagger: `http://localhost:8000/docs`
- Menjalankan Test Otomatis: `pytest -v`
- Linting Code: `ruff check .`

### 3. Frontend (Next.js)
```bash
cd frontend

# Jalankan server frontend dev
npm run dev
```
- Web Application: `http://localhost:3000`

---

## 🧪 Struktur Pengujian Otomatis

Suite pengujian otomatis mencakup 15 test:
- Pengujian nomor surat transaksional & reset tahunan
- Pengujian generator Word untuk 1 pegawai vs 4+ pegawai (lampiran tabel)
- Pengujian parsing file Word (.docx) dan mock response Gemini AI
- Pengujian endpoint API (daftar pegawai, pejabat, pembuatan & unduh surat)
