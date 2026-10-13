# 📋 Persiapan Project Otomatisasi Surat Tugas

> Dokumen ini merangkum **semua hal yang harus disiapkan** sebelum dan selama pengembangan sistem otomatisasi surat tugas, berdasarkan [Rencana_Otomatisasi_Surat_Tugas.md](file:///c:/Project-SuratTugas/Rencana_Otomatisasi_Surat_Tugas.md).

---

## 🖥️ Pranata Komputer

### A. Persiapan Infrastruktur & Akses

| No | Yang Harus Disiapkan | Keterangan | Status |
|----|----------------------|------------|--------|
| 1 | **Akun Google Workspace** | Akun yang akan digunakan sebagai owner seluruh file (Sheets, Docs, Script) | ⬜ |
| 2 | **Google Apps Script Project** | Buat project Apps Script baru, terhubung ke Google Sheet utama | ⬜ |
| 3 | **Aktivasi Google Drive API** | Diperlukan untuk fitur OCR (convert PDF/scan → teks) di tahap lanjut | ⬜ |
| 4 | **API Key LLM** | Dapatkan API key (Gemini / OpenAI / lainnya) untuk fitur ekstraksi data undangan. Simpan via `PropertiesService`, **jangan hardcode di script** | ⬜ |
| 5 | **Folder Google Drive khusus** | Folder untuk menyimpan: (a) file undangan yang diupload, (b) surat tugas hasil generate | ⬜ |

### B. Persiapan File & Template

| No | Yang Harus Disiapkan | Keterangan | Status |
|----|----------------------|------------|--------|
| 1 | **Google Sheet utama** | Spreadsheet dengan minimal 3 sheet/tab terpisah: `Database Nomor Surat`, `Database Kepegawaian`, `Database Pejabat Penandatangan` | ⬜ |
| 2 | **Google Docs Template Surat Tugas** | Template surat dengan placeholder yang sudah disepakati, misalnya: `{{nomor_surat}}`, `{{perihal}}`, `{{tanggal_kegiatan}}`, `{{lokasi}}`, `{{daftar_pegawai}}`, `{{penandatangan_nama}}`, `{{penandatangan_nip}}`, `{{penandatangan_jabatan}}` | ⬜ |
| 3 | **Template halaman lampiran** | Format tabel lampiran untuk kasus >3 pegawai (kolom: No, Nama, NIP, Pangkat/Golongan, Jabatan) | ⬜ |

### C. Logic / Script yang Harus Dibangun (Urut Prioritas)

| Prioritas | Modul | Detail Teknis | Referensi |
|-----------|-------|---------------|-----------|
| 🔴 **1** | **Generate Nomor Surat Otomatis** | Baca nomor terakhir dari DB → cek tahun (reset jika tahun baru) → format: `{urut}/SJ.9/KP.01.06/{bulan}/{tahun}` → simpan log ke DB | Bagian 2.1 |
| 🔴 **2** | **Lookup Database Kepegawaian** | Dropdown pilih nama → otomatis tarik NIP, pangkat/golongan, jabatan. TU tidak perlu ketik ulang | Bagian 2.2 |
| 🔴 **3** | **Dropdown Penandatangan** | Ambil 6 pilihan dari DB Pejabat Penandatangan → default = Kepala Pusat (`is_default = Y`) → TU bisa ganti manual | Bagian 2.3 |
| 🟡 **4** | **Isi Template (Kasus ≤3 Pegawai)** | Replace semua placeholder di template Docs dengan data aktual. Nama pegawai ditulis lengkap di badan surat | Bagian 2.4 |
| 🟡 **5** | **Isi Template (Kasus >3 Pegawai)** | Badan surat tulis "(Daftar Terlampir)" → sisipkan **page break** → generate **tabel** di halaman baru via Google Docs API. **Ini bagian paling kompleks** | Bagian 2.4 |
| 🟡 **6** | **Setup Trigger** | `onFormSubmit` (jika pakai Google Form) atau custom menu "Generate Surat Tugas" di Sheet | Bagian 3 |
| 🔵 **7** | **OCR Konversi Undangan** | Google Drive API: upload file scan/PDF → convert ke Google Docs → ambil teks hasil OCR | Bagian 2.5 |
| 🔵 **8** | **Ekstraksi Data via LLM** | Kirim teks ke LLM API via `UrlFetchApp` → prompt terstruktur minta output JSON → parse → prefill form | Bagian 2.5 |
| ⚪ **9** | **(Opsional) Auto-convert ke PDF** | Convert Google Docs hasil generate ke PDF otomatis + simpan ke folder Drive tertentu | Opsional |

### D. Testing yang Harus Dilakukan

| Skenario Test | Detail |
|---------------|--------|
| Jumlah pegawai: 1, 2, 3 orang | Pastikan format badan surat benar (detail langsung di surat) |
| Jumlah pegawai: 4+ orang | Pastikan muncul "(Daftar Terlampir)" + halaman lampiran dengan tabel |
| 6 pilihan penandatangan | Test masing-masing penandatangan muncul benar di surat |
| Pergantian tahun | Simulasi nomor surat reset ke 1 saat tahun berganti |
| Undangan format berbeda | Scan buram, PDF rapi, format asing — untuk uji fitur OCR + LLM |

---

## 📊 Pengolah Data dan Informasi

### A. Persiapan Database (PRIORITAS UTAMA — Harus Selesai Duluan)

> **⚠️ PENTING:** Tanpa data yang bersih, semua logic di atasnya percuma. Ini adalah langkah pertama yang harus diselesaikan sebelum Pranata Komputer mulai coding.

#### 1. Database Kepegawaian

| No | Yang Harus Disiapkan | Standar yang Harus Dipenuhi | Status |
|----|----------------------|----------------------------|--------|
| 1 | **Data dari CSV** | Sumber: [Data Pegawai Pusaka.csv](file:///c:/Project-SuratTugas/Data/Data%20Pegawai%20Pusaka.csv) (30 pegawai) | ⬜ |
| 2 | **Standarisasi NIP** | Format konsisten — tidak ada spasi, strip, atau karakter aneh di tengah NIP | ⬜ |
| 3 | **Cek nama** | Pastikan tidak ada typo, nama ditulis sesuai SK/dokumen resmi | ⬜ |
| 4 | **Standarisasi jabatan** | Gunakan istilah baku sesuai nomenklatur resmi | ⬜ |
| 5 | **Standarisasi pangkat** | Pastikan penulisan konsisten (mis. "Pembina Tingkat I", bukan kadang "Pembina Tk. I") | ⬜ |
| 6 | **Standarisasi golongan** | Format baku: `III/a`, `IV/b`, dst. Untuk PPPK: `IX`. Untuk PJLP: kosong | ⬜ |
| 7 | **Tambah kolom `status`** | Isi `Aktif` / `Cuti` untuk setiap pegawai | ⬜ |
| 8 | **Standarisasi gelar** | Pastikan penulisan gelar konsisten dengan format resmi | ⬜ |

**Kolom final yang dibutuhkan di database:**

```
nama | nip | pangkat_golongan | jabatan | unit_kerja | status | gelar | jenis_kelamin | pendidikan_terakhir | jurusan
```

#### 2. Database Nomor Surat

| No | Yang Harus Disiapkan | Detail | Status |
|----|----------------------|--------|--------|
| 1 | **Nomor urut terakhir** | Cek arsip fisik/digital — nomor surat terakhir yang sudah terbit di tahun 2026 (disebut 772 di rencana, **verifikasi ulang angka aktualnya**) | ⬜ |
| 2 | **Tahun berjalan** | 2026 | ⬜ |
| 3 | **Format tabel** | Kolom: `nomor_urut`, `tahun`, `nomor_lengkap`, `tanggal_dibuat`, `perihal`, `dibuat_oleh` | ⬜ |

#### 3. Database Pejabat Penandatangan

| No | Yang Harus Disiapkan | Detail | Status |
|----|----------------------|--------|--------|
| 1 | **Data Kepala Pusat** | Nama, NIP, pangkat/golongan, jabatan → set `is_default = Y` | ⬜ |
| 2 | **Data 5 Koordinator Tim** | Nama, NIP, pangkat/golongan, jabatan masing-masing → set `is_default = N` | ⬜ |
| 3 | **Konsistensi penulisan** | Gelar dan jabatan harus sesuai format resmi (cek SK pengangkatan) | ⬜ |

**Kolom final:**

```
nama | nip | pangkat_golongan | jabatan | is_default (Y/N)
```

### B. Persiapan Form Input

| No | Yang Harus Disiapkan | Detail | Status |
|----|----------------------|--------|--------|
| 1 | **Daftar field wajib** | Tentukan field yang harus diisi TU: perihal, dasar surat (nomor undangan), tanggal kegiatan, lokasi, topik | ⬜ |
| 2 | **Multi-select pegawai** | Daftar pegawai yang bisa dipilih (sumber dari Database Kepegawaian) | ⬜ |
| 3 | **Dropdown penandatangan** | 6 pilihan (1 Kepala Pusat + 5 katim) | ⬜ |
| 4 | **Validasi field** | Tentukan mana yang boleh kosong, mana yang wajib diisi | ⬜ |

### C. Persiapan Bahan Uji Ekstraksi

| No | Yang Harus Disiapkan | Detail | Status |
|----|----------------------|--------|--------|
| 1 | **Kumpulkan 10-15 contoh undangan** | Dari berbagai instansi, format berbeda-beda (scan, PDF digital, Word) | ⬜ |
| 2 | **Buat ground truth** | Untuk tiap undangan, catat manual jawaban yang benar: `nama_acara`, `tanggal`, `lokasi`, `topik`, `nomor_surat_undangan`, `instansi_pengundang` | ⬜ |
| 3 | **Evaluasi akurasi** | Setelah fitur ekstraksi jadi, bandingkan hasil otomatis vs ground truth → hitung tingkat akurasi | ⬜ |

### D. Dokumentasi & Validasi

| No | Yang Harus Disiapkan | Detail | Status |
|----|----------------------|--------|--------|
| 1 | **Validasi hasil generate** | Cek beberapa surat hasil generate vs format asli — pastikan penomoran, susunan kalimat, dan tabel benar | ⬜ |
| 2 | **SOP pemakaian** | Buat panduan sederhana cara pakai sistem untuk staf TU (langkah demi langkah, dengan screenshot) | ⬜ |

---

## 📅 Urutan Pengerjaan yang Disarankan

```
Fase 1 [DATA]        → Pengolah Data: Bersihkan 3 database + Siapkan template
   ↓
Fase 2 [LOGIC DASAR] → Pranata Komputer: Logic nomor surat + Lookup pegawai + Dropdown penandatangan
   ↓
Fase 3 [TEMPLATE]    → Pranata Komputer: Isi template ≤3 pegawai | Pengolah Data: Validasi hasil
   ↓
Fase 4 [KOMPLEKS]    → Pranata Komputer: Tabel lampiran >3 pegawai + Trigger otomatis
   ↓
Fase 5 [AI]          → Pranata Komputer: OCR + LLM ekstraksi | Pengolah Data: Ground truth + Evaluasi
   ↓
Fase 6 [POLISH]      → Pranata Komputer: Auto-PDF, notifikasi | Pengolah Data: SOP + Dokumentasi
```

> **💡 Prinsip utama:** Logic dulu, baru rapikan tampilan/UX. Pastikan Fase 1 (data bersih) benar-benar selesai sebelum mulai coding — kalau datanya berantakan, semua logic akan gagal.

---

## ✅ Checklist Ringkas

### Pranata Komputer
- [ ] Akun Google Workspace & Apps Script project
- [ ] Aktivasi Google Drive API
- [ ] API Key LLM (simpan di `PropertiesService`)
- [ ] Folder Drive khusus (undangan & output surat)
- [ ] Google Docs Template dengan placeholder
- [ ] Script: Generate nomor surat otomatis
- [ ] Script: Lookup data pegawai
- [ ] Script: Dropdown penandatangan
- [ ] Script: Isi template (≤3 dan >3 pegawai)
- [ ] Script: Trigger otomatis
- [ ] Script: OCR konversi undangan
- [ ] Script: Ekstraksi LLM
- [ ] Testing semua skenario

### Pengolah Data dan Informasi
- [ ] Bersihkan & standarisasi Database Kepegawaian
- [ ] Susun Database Nomor Surat (verifikasi nomor terakhir)
- [ ] Susun Database Pejabat Penandatangan (6 orang)
- [ ] Desain field form input
- [ ] Kumpulkan 10-15 contoh undangan beragam
- [ ] Buat ground truth untuk evaluasi ekstraksi
- [ ] Evaluasi akurasi hasil ekstraksi
- [ ] Validasi surat hasil generate
- [ ] Dokumentasi SOP pemakaian untuk TU
