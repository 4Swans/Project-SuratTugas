# CLAUDE.md — Sistem Otomatisasi Surat Tugas

Panduan untuk Claude Code saat bekerja di repository ini. Baca seluruhnya sebelum menulis kode.

## 1. Ringkasan Project

Sistem web internal untuk membantu staf TU membuat **Surat Tugas** secara otomatis:

1. TU meng-upload dokumen undangan (PDF / scan / Word).
2. **Gemini API** mengekstrak data acara (nama acara, tanggal, lokasi, topik, dst.) → form ter-prefill.
3. TU **mereview & mengedit** hasil ekstraksi, memilih pegawai yang ditugaskan dan penandatangan.
4. Backend meng-generate **nomor surat otomatis**, mengisi template surat, dan menghasilkan file `.docx` (opsional PDF).
5. Nomor surat & log tersimpan di database MySQL.
6. Data yang sama otomatis **disinkronkan ke Google Sheets** (mirror satu arah MySQL → Sheets), supaya Sheets yang masih dipakai tim tidak tertinggal dari MySQL.

> Project ini berawal dari rencana berbasis Google Sheets + Apps Script. Sekarang **dimigrasi ke stack FastAPI + MySQL + Next.js**. Logic bisnis di dokumen rencana lama tetap berlaku; hanya implementasinya yang berubah (lihat bagian 9).

## 2. Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.x (ORM), Alembic (migrasi), Pydantic v2 |
| Database | MySQL 8 (driver: `PyMySQL` atau `asyncmy`) |
| AI | Gemini API via SDK `google-genai` (structured output / JSON schema) |
| Sinkronisasi Sheets | Google Sheets API via `gspread` + Service Account (mirror satu arah dari MySQL) |
| Dokumen | `docxtpl` + `python-docx` untuk isi template `.docx`; LibreOffice headless untuk konversi PDF (opsional) |
| Frontend | Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui, react-hook-form + zod, TanStack Query |
| Testing | `pytest` + `httpx` (backend), Vitest / Playwright (frontend) |

## 3. Struktur Folder

```
surat-tugas/
├── CLAUDE.md
├── README.md
├── docker-compose.yml            # mysql + backend + frontend (dev)
├── .gitignore
│
├── backend/
│   ├── pyproject.toml            # atau requirements.txt
│   ├── .env.example
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/
│   ├── app/
│   │   ├── main.py               # inisialisasi FastAPI, CORS, include routers
│   │   ├── core/
│   │   │   ├── config.py         # Settings (pydantic-settings) dari env
│   │   │   ├── database.py       # engine, SessionLocal, get_db
│   │   │   ├── security.py       # auth (JWT) & hashing
│   │   │   └── logging.py
│   │   ├── models/               # SQLAlchemy models
│   │   │   ├── pegawai.py
│   │   │   ├── pejabat.py
│   │   │   ├── nomor_surat.py
│   │   │   ├── surat_tugas.py
│   │   │   └── user.py
│   │   ├── schemas/              # Pydantic request/response
│   │   ├── api/
│   │   │   ├── deps.py
│   │   │   └── v1/
│   │   │       ├── router.py
│   │   │       ├── pegawai.py
│   │   │       ├── pejabat.py
│   │   │       ├── nomor_surat.py
│   │   │       ├── ekstraksi.py      # upload undangan → Gemini
│   │   │       ├── surat_tugas.py    # generate & download
│   │   │       ├── sync.py           # status & retry sinkronisasi Sheets
│   │   │       └── auth.py
│   │   ├── services/             # SEMUA business logic ada di sini
│   │   │   ├── nomor_surat_service.py
│   │   │   ├── pegawai_service.py
│   │   │   ├── ekstraksi_service.py  # pemanggilan Gemini
│   │   │   ├── dokumen_service.py    # isi template, tabel lampiran
│   │   │   ├── sheets_sync_service.py # mirror MySQL → Google Sheets (upsert, retry)
│   │   │   └── pdf_service.py        # opsional
│   │   ├── templates/
│   │   │   └── surat_tugas.docx      # template dengan placeholder
│   │   ├── prompts/
│   │   │   └── ekstraksi_undangan.md # prompt Gemini (di-version di git)
│   │   └── utils/
│   ├── storage/                  # di-.gitignore
│   │   ├── undangan/             # file undangan ter-upload
│   │   └── output/               # surat tugas hasil generate
│   ├── scripts/
│   │   ├── import_pegawai.py         # import Data_Pegawai_Pusaka.xlsx (bersihkan + validasi)
│   │   ├── seed_pejabat.py
│   │   └── sync_sheets_full.py       # rekonsiliasi penuh MySQL → Sheets
│   ├── credentials/              # di-.gitignore (service account JSON)
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── fixtures/                 # contoh undangan + ground truth
│
├── frontend/
│   ├── package.json
│   ├── next.config.ts
│   ├── .env.example
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx              # dashboard / daftar surat
│       │   ├── login/
│       │   ├── surat-tugas/
│       │   │   ├── baru/page.tsx     # wizard: upload → review → pilih → generate
│       │   │   └── [id]/page.tsx     # detail + download
│       │   └── master-data/
│       │       ├── pegawai/
│       │       └── pejabat/
│       ├── components/
│       │   ├── ui/                   # shadcn/ui
│       │   ├── forms/                # form surat, multi-select pegawai
│       │   └── upload/
│       ├── lib/
│       │   ├── api.ts                # fetch wrapper ke backend
│       │   ├── schemas.ts            # zod schemas (selaras dengan Pydantic)
│       │   └── utils.ts
│       ├── hooks/
│       └── types/
│
├── data/                         # sumber data mentah (CSV) — jangan commit data sensitif
└── docs/
    ├── Rencana_Otomatisasi_Surat_Tugas.md
    ├── Persiapan_Project.md
    └── SOP_TU.md                 # panduan pemakaian untuk staf TU (dibuat belakangan)
```

## 4. Perintah Umum

```bash
# Database (dev)
docker compose up -d mysql

# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"            # atau pip install -r requirements.txt
alembic upgrade head
python scripts/import_pegawai.py ../data/Data_Pegawai_Pusaka.xlsx
python scripts/seed_pejabat.py
uvicorn app.main:app --reload --port 8000
pytest -v
ruff check . && ruff format .

# Frontend
cd frontend
npm install
npm run dev                        # http://localhost:3000
npm run lint && npm run typecheck && npm test
```

API docs otomatis: `http://localhost:8000/docs`

## 5. Environment Variables

`backend/.env` (jangan pernah di-commit; sediakan `.env.example`):

```
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/surat_tugas
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
SECRET_KEY=
ACCESS_TOKEN_EXPIRE_MINUTES=480
CORS_ORIGINS=http://localhost:3000
STORAGE_DIR=./storage
APP_TIMEZONE=Asia/Jakarta

# Sinkronisasi Google Sheets
SHEETS_SYNC_ENABLED=true
GOOGLE_SERVICE_ACCOUNT_FILE=./credentials/service-account.json
GOOGLE_SHEET_ID=
SHEET_TAB_NOMOR_SURAT=Database Nomor Surat
SHEET_TAB_LOG_SURAT=Log Surat Tugas
SHEET_TAB_PEGAWAI=Database Kepegawaian
SHEET_TAB_PEJABAT=Database Pejabat Penandatangan
```

`frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Aturan:** API key hanya ada di backend. Frontend tidak boleh memanggil Gemini langsung.

## 6. Domain & Aturan Bisnis (WAJIB dipatuhi)

### 6.1 Nomor Surat

Format: `{nomor_urut}/SJ.9/KP.01.06/{bulan}/{tahun}`
Contoh: `773/SJ.9/KP.01.06/08/2026`

Algoritma (di `nomor_surat_service.py`):

1. Ambil tanggal sekarang dengan timezone `Asia/Jakarta`.
2. Ambil baris terakhir tabel `nomor_surat`. Jika `tahun` berbeda dengan tahun sekarang → `nomor_urut = 1`; jika sama → `nomor_urut_terakhir + 1`.
3. `bulan` = 2 digit (`"08"`), `tahun` = 4 digit.
4. Simpan baris baru ke `nomor_surat` **dalam transaksi yang sama** dengan pembuatan surat.

Aturan penting:
- Gunakan **transaksi + row lock** (`SELECT ... FOR UPDATE`) supaya dua request bersamaan tidak menghasilkan nomor kembar.
- Tambahkan **UNIQUE constraint** `(tahun, nomor_urut)` di database sebagai pengaman terakhir.
- Nomor urut terakhir awal (`772` untuk 2026) **belum diverifikasi** dengan arsip — jangan hardcode; nilainya di-seed lewat script dan harus dikonfirmasi tim Pengolah Data.
- Jika generate dokumen gagal, transaksi di-rollback agar nomor tidak "bolong".

### 6.2 Data Pegawai

Sumber data: `data/Data_Pegawai_Pusaka.xlsx` (30 pegawai). **Struktur kolom di MySQL dan di Google Sheets mengikuti file ini**:

| Kolom Sheets | Kolom MySQL | Contoh |
|--------------|-------------|--------|
| No | *(nomor urut saat sinkronisasi, bukan PK)* | 1 |
| Nama | `nama` | Oki Suryowahono |
| NIP | `nip` (VARCHAR, UNIQUE) | 197909072008031001 |
| Golongan | `golongan` | IV/c |
| Pangkat | `pangkat` | Pembina Tingkat I |
| Jabatan | `jabatan` | Kepala Pusat Kebijakan Strategis |
| Jurusan | `jurusan` | Magister Teknik Elektro - Institut Teknologi Bandung |
| Pendidikan Terakhir | `pendidikan_terakhir` | S-2 |
| Gelar | `gelar` | S.T., M.T. |
| Jenis Kelamin | `jenis_kelamin` | Laki-Laki / Perempuan |

Tambahan yang **hanya ada di MySQL** (tidak dikirim ke Sheets): `id`, `status` (`Aktif`/`Cuti`, default `Aktif`), `created_at`, `updated_at`. Kolom `unit_kerja` dari rencana awal dihapus karena tidak ada di data sumber.

Aturan:
- Multi-select pegawai di form; NIP, pangkat, golongan, dan jabatan **selalu diambil dari database**, bukan diketik TU.
- **NIP wajib disimpan sebagai string/teks (18 digit), bukan angka.** Di Sheets, kirim dengan `value_input_option="RAW"` dan format kolom sebagai Plain Text agar tidak dibulatkan menjadi notasi ilmiah.
- Pegawai berstatus `Cuti` boleh ditampilkan tapi diberi penanda; jangan otomatis disembunyikan tanpa konfirmasi.
- Golongan dan pangkat disimpan **terpisah**. Untuk tampilan di surat/lampiran, gabungkan lewat satu fungsi di `pegawai_service.py` (`format_pangkat_golongan`), misalnya `Pembina Tingkat I (IV/c)`. Jangan menggabungkan di tempat lain.
- Kelompok kepegawaian di data: **PNS** (golongan `III/a`–`IV/c`), **PPPK** (golongan `IX`, pangkat berakhiran "(PPPK)"), **PJLP** (golongan kosong → `NULL`, pangkat "Penyedia Jasa Lainnya Perorangan (PJLP)"). Golongan kosong pada PJLP adalah kondisi normal, bukan error.
- Nama tampil di surat: `nama` + `, ` + `gelar` (mis. `Oki Suryowahono, S.T., M.T.`). Format akhir gelar (termasuk gelar depan seperti "Dr.") perlu dikonfirmasi.

**Pembersihan yang dilakukan `import_pegawai.py`** (temuan pada file sumber):
- Trim spasi berlebih di semua kolom teks (mis. pangkat `"Pembina  "`, `"Penata  "`, jabatan `"Pendukung Pengolah Data dan Informasi "`).
- NIP: hapus spasi/strip, wajib 18 digit, tolak duplikat.
- Laporkan (jangan diam-diam perbaiki) nilai yang mencurigakan agar diverifikasi Pengolah Data, misalnya typo pada jurusan/institusi (`Teknik Elekto`, `Master of Publik Administration`, `Padjajaran`), keterangan aneh (`(Beragama)` pada nama universitas), dan gelar yang penulisannya tidak seragam (`MH`, `S. Kom`, `SE, M.S.E`, `S.IPol`).
- Satu kolom `Jurusan` berisi gabungan "program studi - institusi"; disimpan apa adanya, jangan dipecah tanpa keputusan tim.

### 6.3 Penandatangan

- Tabel `pejabat_penandatangan`: `nama, nip, golongan, pangkat, jabatan, gelar, is_default` (gaya penulisan sama dengan data pegawai; Kepala Pusat juga tercatat di data pegawai, tetapi tabel pejabat tetap terpisah).
- Total 6 pilihan: 1 Kepala Pusat (`is_default = true`) + 5 Koordinator Tim.
- Hanya **satu** baris boleh `is_default = true` (validasi di service).
- Tidak ada logic otomatis berdasarkan cuti — TU memilih manual di dropdown; default = Kepala Pusat.

### 6.4 Jumlah Pegawai (≤3 vs >3)

- **≤ 3 pegawai**: nama + NIP + pangkat/golongan + jabatan ditulis langsung di badan surat.
- **> 3 pegawai**: badan surat menulis `(Daftar Terlampir)`, lalu tambahkan **page break** dan **tabel lampiran** dengan kolom `No | Nama | NIP | Pangkat/Golongan | Jabatan`.
- Ini bagian paling kompleks di `dokumen_service.py` — wajib punya unit test untuk 1, 2, 3, 4, dan 10+ pegawai.

### 6.5 Ekstraksi Undangan via Gemini

- Gemini **hanya untuk ekstraksi data**, bukan untuk menyusun kalimat surat. Kalimat surat selalu berasal dari template + rule.
- Field yang diekstrak: `nama_acara, tanggal_mulai, tanggal_selesai, lokasi, topik, nomor_surat_undangan, instansi_pengundang`.
- Gunakan structured output (JSON schema / `response_schema`) dan validasi hasilnya dengan Pydantic. Field yang tidak ditemukan dikembalikan `null`, **jangan dikarang**.
- PDF dan gambar dikirim langsung ke Gemini sebagai input multimodal (tidak perlu OCR terpisah). File Word diekstrak teksnya dengan `python-docx` lalu dikirim sebagai teks.
- Prompt disimpan di `app/prompts/ekstraksi_undangan.md`, bukan ditulis inline di kode.
- Set `temperature` rendah (0–0.2).
- **Human-in-the-loop wajib:** hasil ekstraksi selalu ditampilkan ke TU untuk direview/diedit. Tidak boleh ada jalur yang meng-generate surat langsung dari hasil ekstraksi tanpa konfirmasi manusia (dokumen resmi berkekuatan hukum).

### 6.6 Template Dokumen

File: `backend/app/templates/surat_tugas.docx`. Placeholder (sintaks Jinja `docxtpl`):

```
{{ nomor_surat }}  {{ perihal }}  {{ dasar_surat }}  {{ tanggal_kegiatan }}
{{ lokasi }}  {{ topik }}  {{ daftar_pegawai }}
{{ penandatangan_nama }}  {{ penandatangan_nip }}  {{ penandatangan_jabatan }}
```

Jangan mengubah nama placeholder tanpa memperbarui `dokumen_service.py` dan test-nya.

### 6.7 Sinkronisasi ke Google Sheets

**Prinsip:** MySQL adalah *single source of truth*. Google Sheets adalah **mirror satu arah (MySQL → Sheets)**. Sheets tidak pernah dibaca balik untuk mengubah MySQL.

Yang disinkronkan (nama tab dari env):

| Tab Sheets | Sumber MySQL | Kapan disinkronkan |
|------------|--------------|--------------------|
| Database Nomor Surat | `nomor_surat` | Setiap surat berhasil dibuat |
| Log Surat Tugas | `surat_tugas` + pegawai + penandatangan | Setiap surat berhasil dibuat |
| Database Kepegawaian | `pegawai` | Setiap create/update/delete pegawai; kolom sama persis dengan `Data_Pegawai_Pusaka.xlsx` (lihat 6.2) |
| Database Pejabat Penandatangan | `pejabat_penandatangan` | Setiap perubahan pejabat; kolom: `No, Nama, NIP, Golongan, Pangkat, Jabatan, Gelar, Default (Y/N)` |

Header tab "Database Kepegawaian" (urutan tetap): `No | Nama | NIP | Golongan | Pangkat | Jabatan | Jurusan | Pendidikan Terakhir | Gelar | Jenis Kelamin`. Kolom `No` diisi ulang berurutan setiap sinkronisasi. Kunci upsert = `NIP`.

Kolom tab "Database Nomor Surat" mengikuti rencana awal: `nomor_urut, tahun, nomor_lengkap, tanggal_dibuat, perihal, dibuat_oleh`. Tab "Log Surat Tugas" berisi: `nomor_lengkap, perihal, dasar_surat, tanggal_mulai, tanggal_selesai, lokasi, daftar_pegawai, penandatangan, dibuat_oleh, tanggal_dibuat`.

**Alur saat surat di-generate:**

1. Transaksi MySQL: buat nomor + simpan `surat_tugas` + pegawai → **commit**.
2. Setelah commit berhasil, jalankan sinkronisasi (FastAPI `BackgroundTasks`, fungsi sinkron `def`, bukan `async def`, karena `gspread` bersifat blocking).
3. Hasil sinkronisasi dicatat di kolom `sheets_sync_status` pada `surat_tugas`: `pending` → `synced` atau `failed` (+ `sheets_sync_error`).

**Aturan penting:**
- **Kegagalan Sheets tidak boleh membatalkan surat.** Jangan rollback nomor surat atau menggagalkan response hanya karena Google API error/timeout. Surat tetap sah di MySQL; status sync menjadi `failed` dan akan di-retry.
- **Idempotent (upsert)**: kunci baris = `nomor_lengkap` (untuk pegawai: `nip`). Sebelum menambah baris, cek apakah sudah ada; jika ada, update. Retry tidak boleh membuat baris ganda.
- **Retry**: endpoint `POST /sync/sheets/retry` dan/atau job terjadwal mengambil semua baris `pending`/`failed` lalu mengirim ulang, dengan exponential backoff.
- **Rekonsiliasi penuh**: `scripts/sync_sheets_full.py` menulis ulang seluruh tab dari MySQL (untuk pengisian awal, perbaikan drift, atau setelah Sheets terhapus). Gunakan batch update, bukan satu request per baris (kuota Sheets API terbatas).
- **Batch**: untuk sinkronisasi banyak baris gunakan `append_rows` / `update` satu kali, bukan loop `append_row`.
- **Autentikasi**: Service Account. File JSON disimpan di `backend/credentials/` (di-.gitignore), dan email service account harus diberi akses **Editor** pada Spreadsheet.
- **Proteksi Sheets**: tab hasil mirror sebaiknya diproteksi (hanya service account yang boleh edit). Edit manual di Sheets akan **ditimpa** saat sinkronisasi berikutnya. Data harus diubah lewat aplikasi web.
- Dapat dimatikan dengan `SHEETS_SYNC_ENABLED=false` (dev/test tidak boleh menyentuh Sheets produksi; gunakan spreadsheet terpisah untuk dev).
- Header tab harus sesuai; `sheets_sync_service.py` memvalidasi header saat startup dan memberi peringatan jika tidak cocok.

## 7. Skema Database (ringkas)

```
pegawai(id, nama, nip VARCHAR(18) UNIQUE, golongan NULL, pangkat, jabatan,
        jurusan, pendidikan_terakhir, gelar, jenis_kelamin,
        status DEFAULT 'Aktif', created_at, updated_at)

pejabat_penandatangan(id, nama, nip VARCHAR(18) UNIQUE, golongan NULL, pangkat, jabatan, gelar, is_default)

nomor_surat(id, nomor_urut, tahun, nomor_lengkap UNIQUE, tanggal_dibuat,
            perihal, dibuat_oleh)          -- UNIQUE(tahun, nomor_urut)

surat_tugas(id, nomor_surat_id FK, dasar_surat, perihal, tanggal_mulai,
            tanggal_selesai, lokasi, topik, penandatangan_id FK,
            file_undangan_path, file_output_path, dibuat_oleh, created_at,
            sheets_sync_status ENUM('pending','synced','failed'),
            sheets_synced_at, sheets_sync_error)

surat_tugas_pegawai(surat_tugas_id FK, pegawai_id FK, urutan)

user(id, username UNIQUE, password_hash, nama, role)
```

Perubahan skema **selalu lewat migrasi Alembic**, jangan edit tabel manual.

## 8. Alur API (v1)

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| POST | `/auth/login` | Login staf TU |
| GET | `/pegawai` | Daftar pegawai (filter `status`, pencarian nama) |
| GET | `/pejabat` | 6 pilihan penandatangan (default ditandai) |
| POST | `/ekstraksi/undangan` | Upload undangan → hasil ekstraksi Gemini (JSON, belum disimpan sebagai surat) |
| POST | `/surat-tugas` | Buat surat: generate nomor + isi template + simpan log (transaksional) |
| GET | `/surat-tugas` | Riwayat surat |
| GET | `/surat-tugas/{id}/download` | Unduh `.docx` (`?format=pdf` bila PDF diaktifkan) |
| GET | `/sync/sheets/status` | Ringkasan sinkronisasi: jumlah `synced` / `pending` / `failed` |
| POST | `/sync/sheets/retry` | Kirim ulang baris `pending`/`failed` ke Sheets |
| POST | `/sync/sheets/full` | Rekonsiliasi penuh MySQL → Sheets (khusus admin) |

## 9. Perbedaan dari Rencana Lama (Apps Script)

| Rencana lama | Implementasi sekarang |
|--------------|-----------------------|
| Google Sheets sebagai database | MySQL sebagai sumber data utama; Google Sheets tetap ada sebagai **mirror satu arah** (bagian 6.7) |
| Google Apps Script | FastAPI (service layer) |
| Google Docs template + Docs API | Template `.docx` + `docxtpl`/`python-docx` |
| Google Drive OCR → LLM | Gemini multimodal langsung membaca PDF/gambar |
| Google Form / custom menu | Halaman web Next.js |
| `PropertiesService` untuk API key | Environment variable di backend |

Logic bisnis (bagian 6) tidak berubah.

## 10. Konvensi Kode

**Umum**
- Identifier kode dalam bahasa Inggris; istilah domain dan nama kolom database mengikuti bahasa Indonesia (`nama`, `nip`, `golongan`, `pangkat`, `nomor_surat`).
- Teks UI, pesan error untuk user, dan isi surat dalam bahasa Indonesia.
- Commit message ringkas, format `feat:`, `fix:`, `refactor:`, `test:`, `docs:`.

**Backend**
- Router tipis: validasi input → panggil service → return schema. Business logic hanya di `services/`.
- Semua endpoint memakai Pydantic schema untuk request dan response; jangan return model ORM langsung.
- Type hint wajib; lint dengan `ruff`.
- Error bisnis memakai `HTTPException` dengan pesan berbahasa Indonesia yang jelas.
- Jangan log isi undangan, NIP, atau API key di level `INFO` ke atas.

**Frontend**
- TypeScript strict, tanpa `any`.
- Server state lewat TanStack Query; form lewat react-hook-form + zod.
- Semua request ke backend lewat `lib/api.ts`.
- Wizard pembuatan surat: **Upload → Review hasil ekstraksi → Pilih pegawai & penandatangan → Konfirmasi → Generate**. Langkah Review tidak boleh dilewati.
- Tampilkan state loading & error yang jelas, terutama saat ekstraksi Gemini (bisa beberapa detik).

## 11. Testing

Skenario yang **harus** punya test otomatis:

- Nomor surat: increment normal, **reset saat pergantian tahun**, format bulan 2 digit, dua request bersamaan tidak menghasilkan nomor kembar.
- Isi template dengan 1, 2, 3 pegawai (detail di badan surat) dan 4+ pegawai (`(Daftar Terlampir)` + halaman lampiran + tabel).
- Masing-masing dari 6 penandatangan muncul benar di surat.
- Ekstraksi: mock Gemini di unit test; gunakan `tests/fixtures/` (10–15 contoh undangan + ground truth JSON) untuk evaluasi akurasi terpisah, **bukan** di CI biasa (memakai kuota API).
- Validasi output Gemini: JSON tidak valid, field kosong, dan tanggal ambigu ditangani tanpa crash.
- Sinkronisasi Sheets (mock `gspread`, jangan sentuh Sheets asli di test):
  - Surat berhasil dibuat → baris muncul di tab Nomor Surat dan Log Surat Tugas, status `synced`.
  - Sheets error/timeout → surat **tetap tersimpan**, nomor tidak di-rollback, status `failed`.
  - Retry setelah gagal → baris masuk tepat satu kali (tidak duplikat).
  - Update data pegawai/pejabat di MySQL → tab terkait ikut ter-update.
  - Rekonsiliasi penuh menghasilkan isi Sheets yang identik dengan MySQL.
  - NIP 18 digit tetap utuh sebagai teks di Sheets (tidak berubah jadi angka/notasi ilmiah), termasuk NIP PJLP yang diawali `393`.
- Import pegawai: 30 baris terimpor, NIP unik, pegawai PJLP tersimpan dengan `golongan = NULL`, spasi berlebih ter-trim, dan `format_pangkat_golongan` benar untuk PNS, PPPK, dan PJLP.

## 12. Fase Pengembangan

Ikuti urutan ini — **logic dulu, tampilan belakangan**:

1. **Data** — Bersihkan & standarisasi data pegawai, pejabat, dan nomor surat awal; skema + migrasi + script import.
2. **Logic dasar** — Service nomor surat, lookup pegawai, endpoint pejabat.
3. **Template ≤3 pegawai** — Data acara diinput manual (belum ada ekstraksi). Sinkronisasi Google Sheets (nomor surat + log surat) ikut dibangun di fase ini, karena Sheets harus selalu sejalan dengan MySQL sejak surat pertama.
4. **Kasus kompleks** — Lampiran tabel untuk >3 pegawai; UI wizard lengkap.
5. **Ekstraksi Gemini** — Upload undangan, prefill form, evaluasi dengan ground truth.
6. **Polish** — Konversi PDF, riwayat surat, auth/role, SOP untuk TU.

Jangan mengerjakan fase 5 sebelum fase 1–4 stabil.

## 13. Hal yang Tidak Boleh Dilakukan

- Meng-hardcode API key, password, atau data pegawai asli ke source code / git.
- Meng-commit file di `data/`, `backend/storage/`, atau `.env`.
- Membiarkan LLM menulis kalimat surat atau menentukan penandatangan/pegawai.
- Meng-generate surat resmi tanpa langkah review manusia.
- Menghitung nomor surat di frontend atau di luar transaksi database.
- Mengubah skema database tanpa migrasi Alembic.
- Membaca dari Google Sheets untuk mengubah data MySQL (sinkronisasi hanya satu arah: MySQL → Sheets).
- Membatalkan/rollback surat atau nomor surat hanya karena sinkronisasi Sheets gagal.
- Meng-commit file service account (`backend/credentials/`) atau memakai Sheets produksi untuk dev/test.

## 14. Catatan Terbuka (perlu konfirmasi tim)

- Nomor urut terakhir 2026 (772) — verifikasi dengan arsip.
- Format resmi gelar, pangkat, dan jabatan 6 penandatangan (cek SK pengangkatan).
- Apakah konversi PDF dibutuhkan, dan di mana server akan di-host (menentukan apakah LibreOffice tersedia).
- Mekanisme login: akun individual per staf TU atau akun bersama.
- Verifikasi data sumber pegawai: kolom Jenis Kelamin untuk beberapa nama perlu dicek ulang (mis. Achmad Yansyuru dan Fadhlan Irham Rinaldi tercatat `Perempuan`), serta typo dan gelar yang tidak seragam (lihat 6.2).
- Format tampilan pangkat/golongan di surat untuk PPPK dan PJLP (mis. `Penata Muda (PPPK) (IX)` terlihat janggal) dan format gelar depan seperti "Dr.".
- Apakah `status` (Aktif/Cuti) perlu ikut tampil di Sheets. Saat ini hanya ada di MySQL karena tidak ada di file sumber.
- Apakah tim masih perlu mengedit langsung di Google Sheets? Jika ya, perlu diputuskan ulang (saat ini Sheets hanya mirror dan edit manual akan ditimpa).
- Struktur kolom final tab "Log Surat Tugas" di Sheets dan siapa yang berhak mengakses spreadsheet-nya.
