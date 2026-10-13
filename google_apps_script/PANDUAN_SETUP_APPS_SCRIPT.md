# Panduan Integrasi Google Spreadsheet & Google Apps Script

Panduan ini menjelaskan langkah mudah untuk menghubungkan Google Spreadsheet [Copy of Salinan dari Penomoran Pusat Kebijakan Strategis](https://docs.google.com/spreadsheets/d/1E3pMrc5I8QQEtIicvoGtHJQEFXB9nm8OfTqeVQHu2TM/edit?gid=599707024#gid=599707024) ke aplikasi Surat Tugas PUSAKA.

---

## 1. Buka Google Sheet & Apps Script
1. Buka spreadsheet pada browser Anda:
   **[Buka Google Spreadsheet](https://docs.google.com/spreadsheets/d/1E3pMrc5I8QQEtIicvoGtHJQEFXB9nm8OfTqeVQHu2TM/edit?gid=599707024#gid=599707024)**
2. Pada menu atas, klik **Ekstensi** (*Extensions*) > **Apps Script**.
3. Tab baru editor Apps Script akan terbuka.

---

## 2. Salin Kode Script
1. Buka file [`google_apps_script/Code.gs`](file:///c:/Project-SuratTugas/google_apps_script/Code.gs).
2. Hapus seluruh isi default pada editor Apps Script (`function myFunction() { ... }`).
3. Tempelkan (*paste*) seluruh isi dari [`Code.gs`](file:///c:/Project-SuratTugas/google_apps_script/Code.gs).
4. Klik tombol **Simpan** (ikon disket atau `Ctrl + S`).

---

## 3. Terapkan Sebagai Aplikasi Web (Deploy as Web App)
1. Di pojok kanan atas editor Apps Script, klik tombol biru **Terapkan** (*Deploy*) > **Penerapan baru** (*New deployment*).
2. Di sebelah kiri tulisan *"Pilih jenis"*, klik ikon **Gerigi** (⚙️) lalu pilih **Aplikasi web** (*Web app*).
3. Isi kolom pengaturan berikut:
   - **Deskripsi**: `Surat Tugas PUSAKA Sync API`
   - **Jalankan sebagai** (*Execute as*): **Saya** (*Me* / email Anda)
   - **Yang memiliki akses** (*Who has access*): **Siapa saja** (*Anyone*) *(Penting: pilih Siapa saja agar aplikasi backend lokal dapat terhubung tanpa kendala CORS/OAuth)*
4. Klik tombol **Terapkan** (*Deploy*).
5. Jika muncul jendela otorisasi akun Google (*Authorization Required*):
   - Klik **Tinjau izin** (*Review Permissions*)
   - Pilih akun Google Anda
   - Klik **Advanced** (Lanjutan) di kiri bawah
   - Klik **Go to (Buka) Surat Tugas PUSAKA (unsafe / tidak aman)**
   - Klik **Allow** (Izinkan)
6. Setelah selesai, Google akan menampilkan dialog dengan **URL Aplikasi Web** (*Web App URL*):
   Format URL: `https://script.google.com/macros/s/AKfycb.../exec`
7. Salin (*Copy*) URL tersebut.

---

## 4. Masukkan URL ke Aplikasi Backend
1. Buka file [`backend/.env`](file:///c:/Project-SuratTugas/backend/.env).
2. Cari baris `GOOGLE_APPS_SCRIPT_URL=` lalu tempelkan URL Anda:
   ```env
   GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec
   ```
3. Simpan file `.env`.

---

## 5. Cara Kerja Sinkronisasi Otomatis
- **Sinkronisasi Nomor Surat**:
  Setiap kali membuka halaman Buat Surat Tugas atau Dashboard, aplikasi backend secara otomatis memeriksa nomor urut terbesar di tab `Register_2026` (Kolom A) dan menyinkronkannya dengan database MySQL.
- **Pencatatan Otomatis (Append / Update Row)**:
  Saat surat tugas dibuat dan diterbitkan:
  Aplikasi backend otomatis mengirimkan data surat ke spreadsheet Anda dan mengisi baris dengan format kolom:
  1. `nomor_urut` (misal: 887)
  2. `tanggal` (misal: 1 Oktober 2026)
  3. `jenis` (`ST`)
  4. `kepada` (Nama pegawai atau *Daftar Terlampir*)
  5. `hal` (Perihal kegiatan, tanggal, dan lokasi lengkap)
  6. `status_ttd` (*Kapus* / *Plt. Kapus*)
  7. `topik_tim` (Topik tim: *TU*, *BE*, *FE*, *DTO*, dll.)
  8. `konseptor` (Nama pengusul/konseptor surat tugas)
  9. `status_surat` (Otomatis terisi **`OK`**)

---

## 6. Cara Memperbarui Script yang Sudah Diterapkan (Update Deployment)
Jika Anda sudah pernah menerapkan Apps Script dan ingin memperbarui kodenya ke versi terbaru yang mendukung kolom **KONSEPTOR** dan **Status Surat**:
1. Buka editor Apps Script pada Google Spreadsheet Anda.
2. Salin seluruh isi terbaru dari file [`google_apps_script/Code.gs`](file:///c:/Project-SuratTugas/google_apps_script/Code.gs) dan tempelkan (*replace all*) di editor Apps Script.
3. Klik ikon **Simpan** (`Ctrl + S`).
4. Klik tombol **Terapkan** (*Deploy*) > **Kelola penerapan** (*Manage deployments*).
5. Pada panel kiri, klik penerapan yang sedang aktif, lalu klik ikon **Pensil** (*Edit*).
6. Pada dropdown **Versi** (*Version*), pilih **Versi baru** (*New version*).
7. Klik tombol **Terapkan** (*Deploy*).
8. URL tetap sama dan kini otomatis mendukung pengisian kolom KONSEPTOR dan Status Surat "OK".
