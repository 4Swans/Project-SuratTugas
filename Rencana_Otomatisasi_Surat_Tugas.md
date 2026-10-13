## 1. Arsitektur Sistem

```
┌─────────────────────────┐     ┌──────────────────────────┐
│ Sheet: Database Nomor    │     │ Sheet: Database          │
│ Surat                     │     │ Kepegawaian               │
│ - Nomor terakhir (772)     │     │ - Nama, NIP, Pangkat,      │
│ - Tahun berjalan            │     │   Jabatan, Unit             │
│ - Log semua surat terbit    │     │ - Status (Aktif/Cuti)        │
└──────────┬────────────────┘     └───────────┬───────────────┘
           │                                    │
           │        ┌───────────────────────────┘
           │        │
      ┌────▼────────▼─────┐        ┌──────────────────────────┐
      │  Google Apps Script  │◄─────┤ Sheet: Database Pejabat    │
      │  (logic utama)        │      │ Penandatangan (1 default    │
      │                        │      │ + 5 katim, dipilih manual)   │
      └────┬─────────────────┘      └──────────────────────────┘
           │
           │  ambil template, isi placeholder,
           │  buat halaman lampiran kalau perlu
           ▼
   ┌───────────────────────┐
   │ Google Docs Template    │
   │ Surat Tugas              │
   └──────────┬──────────────┘
              │
              ▼
   ┌───────────────────────┐
   │ Surat Tugas Jadi (Doc/PDF)│
   │ + Nomor otomatis          │
   │ + Log tersimpan ke DB      │
   └───────────────────────┘

Input awal: user upload dokumen undangan
       ↓
┌───────────────────────┐      ┌──────────────────────────┐
│ Google Drive OCR         │─────►│  LLM API (ekstraksi saja)  │
│ (convert scan → teks)     │      │  → nama_acara, tanggal,      │
└───────────────────────┘      │    lokasi, topik (JSON)        │
                                  └──────────┬──────────────────┘
                                             ▼
                              Form Input (ter-prefill, TU review & konfirmasi)
                                             ↓
                              (lanjut ke alur nomor surat & template di atas)
```

### Komponen yang Perlu Dibuat

| Komponen                                  | Isi                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sheet: Database Nomor Surat**           | Kolom: `nomor_urut`, `tahun`, `nomor_lengkap`, `tanggal_dibuat`, `perihal`, `dibuat_oleh`                                                                                                                                                                                                                                                    |
| **Sheet: Database Kepegawaian**           | Kolom: `nama`, `nip`, `pangkat_golongan`, `jabatan`, `unit_kerja`, `status` (Aktif/Cuti)                                                                                                                                                                                                                                                     |
| **Sheet: Database Pejabat Penandatangan** | Kolom: `nama`, `nip`, `pangkat_golongan`, `jabatan`, `is_default` (Y hanya untuk Kepala Pusat, N untuk 5 katim lainnya)                                                                                                                                                                                                                      |
| **Upload Undangan**                       | User upload file undangan (PDF/scan/Word) lewat Form atau folder Drive khusus                                                                                                                                                                                                                                                                |
| **Form Input**                            | Perihal/nama kegiatan, dasar surat (nomor undangan), tanggal & lokasi kegiatan, topik — **field-field ini di-prefill otomatis dari hasil ekstraksi**, tapi tetap bisa diedit manual sebelum submit. Ditambah: pilih pegawai yang ditugaskan (multi-select dari Database Kepegawaian), pilih penandatangan (dropdown, default = Kepala Pusat) |
| **Google Docs Template**                  | Surat tugas dengan placeholder, mis. `{{nomor_surat}}`, `{{perihal}}`, `{{daftar_pegawai}}`, `{{penandatangan}}`                                                                                                                                                                                                                             |
| **Apps Script**                           | Semua logic: generate nomor, lookup data, isi template, buat lampiran kalau perlu                                                                                                                                                                                                                                                            |

---

## 2. Detail Logic yang Perlu Dibangun

### 2.1 Generate Nomor Otomatis

```
1. Baca tahun sistem saat ini (mis. 2026)
2. Cek di Database Nomor Surat: apakah baris terakhir tahunnya sama dengan tahun sekarang?
   - Kalau BEDA (tahun baru) → nomor_urut mulai dari 1
   - Kalau SAMA → ambil nomor_urut terakhir, +1
3. Ambil bulan sistem saat ini (2 digit, mis. "08")
4. Gabungkan: {nomor_urut}/SJ.9/KP.01.06/{bulan_sistem}/{tahun_sistem}
5. Simpan baris baru ke Database Nomor Surat (supaya nomor berikutnya tahu harus mulai dari mana)
```

### 2.2 Lookup Data Pegawai

- User pilih nama dari dropdown (data validation) yang bersumber dari Database Kepegawaian
- Script otomatis tarik NIP, pangkat/golongan, jabatan berdasarkan nama yang dipilih —
  **petugas TU tidak perlu ketik ulang data ini secara manual**

### 2.3 Penentuan Penandatangan (pilihan manual, bukan otomatis)

Tidak perlu logic status cuti — cukup **dropdown pilihan** di form input:

```
1. Dropdown "Penandatangan" di form input, isinya diambil dari Database Pejabat
   Penandatangan (1 Kepala Pusat + 5 katim)
2. Default value dropdown = nama dengan is_default = Y (Kepala Pusat)
3. TU tinggal pakai default itu di kondisi normal, atau ganti manual ke salah satu
   dari 5 katim kalau Kepala Pusat sedang tidak bisa tanda tangan
4. Script ambil nama, NIP, jabatan pejabat yang dipilih itu untuk diisi ke bagian
   tanda tangan di template
```

Jauh lebih sederhana dari rencana sebelumnya — tidak perlu logic otomatis apapun,
cukup pastikan dropdown-nya menampilkan 6 pilihan (Kepala Pusat + 5 katim) dengan jelas.

### 2.4 Logika Jumlah Pegawai yang Ditugaskan

```
JIKA jumlah pegawai ≤ 3:
    Tulis nama-nama lengkap dengan detail (Nama/NIP/Pangkat/Jabatan) langsung di badan surat
      seperti contoh dokumen kamu

JIKA jumlah pegawai > 3:
    - Di badan surat, bagian "Kepada" ditulis "(Daftar Terlampir)"
    - Sistem otomatis membuat HALAMAN BARU di akhir dokumen (page break)
    - Halaman itu berisi TABEL dengan kolom: No, Nama, NIP, Pangkat/Golongan, Jabatan
    - Tabel diisi otomatis dari semua pegawai yang dipilih di form
```

Ini bagian paling teknis dari proyek ini — di Apps Script, ini berarti memanipulasi
Google Docs API untuk menyisipkan page break dan membuat tabel secara terprogram (bukan
cuma ganti teks placeholder biasa).

---

### 2.5 Ekstraksi Otomatis dari Dokumen Undangan (Fitur Baru)

**Kenapa ini beda dari 3.1-3.4:** bagian lain di sistem ini rule-based murni (nomor
surat, lookup pegawai, dst.) — hasilnya selalu pasti. Tapi undangan bisa datang dari
instansi manapun dengan format bebas (lihat contoh undangan ICISS kemarin — beda gaya
dari surat tugas internal kalian). Regex/pattern matching akan gampang gagal kalau
formatnya berubah-ubah. Di sinilah LLM dipakai — **tapi hanya untuk ekstraksi data**,
bukan untuk menyusun kalimat surat tugasnya (itu tetap dari template + rule biasa).

**Alur teknisnya:**

```
1. User upload file undangan (PDF/scan/Word) lewat Form
2. Kalau file berupa scan/gambar → konversi dulu pakai Google Drive OCR
   (Drive API bisa convert PDF/gambar jadi Google Doc dengan teks hasil OCR)
   Kalau file sudah PDF/Word berbasis teks digital → langsung ambil teksnya
3. Kirim teks hasil ekstraksi ke LLM API (lewat UrlFetchApp di Apps Script) dengan
   prompt yang meminta output HANYA dalam format JSON, contoh field yang diminta:
   nama_acara, tanggal_mulai, tanggal_selesai, lokasi, topik, nomor_surat_undangan,
   instansi_pengundang
4. Parse hasil JSON, isi otomatis ke field yang sesuai di Form Input
5. WAJIB: tampilkan hasil ekstraksi ke TU untuk DIKONFIRMASI/DIEDIT dulu sebelum
   lanjut ke proses generate surat tugas — jangan pernah langsung auto-submit tanpa
   direview manusia, karena ini dokumen resmi berkekuatan hukum
```

> **Prinsip penting:** LLM di sini berfungsi sebagai **asisten pengetikan**, bukan
> pengambil keputusan. Kalau ekstraksi salah/kurang lengkap, TU tinggal edit manual di
> form — bukan sistem gagal total. Ini beda dengan proyek Policy AI yang butuh evaluasi
> ground truth ketat karena jawabannya langsung dipakai; di sini selalu ada 1 manusia
> yang mengonfirmasi sebelum dokumen resmi terbit.

**API key untuk LLM** disimpan di Apps Script lewat `PropertiesService` (bukan ditulis
langsung di kode), supaya tidak mudah bocor kalau script di-share/di-review orang lain.

---

## 3. Pembagian Kerja

### Pranata Komputer

| Tugas                                              | Detail                                                                                                                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bangun logic generate nomor otomatis               | Termasuk logic reset tahunan (3.1)                                                                                                                                                      |
| Bangun script lookup Database Kepegawaian          | Dropdown otomatis isi NIP/pangkat/jabatan                                                                                                                                               |
| Bangun konversi OCR untuk file undangan            | Pakai Google Drive API untuk convert PDF/scan jadi teks (3.5)                                                                                                                           |
| Bangun pemanggilan LLM API untuk ekstraksi data    | Prompt terstruktur, parsing hasil JSON, isi ke form (3.5)                                                                                                                               |
| Bangun dropdown pilihan penandatangan              | Ambil dari Database Pejabat Penandatangan, default otomatis ke Kepala Pusat (3.3) — cukup sederhana, tidak perlu logic status                                                           |
| Bangun logic kondisional jumlah pegawai (≤3 vs >3) | Termasuk generate tabel lampiran di halaman baru (3.4) — bagian paling kompleks                                                                                                         |
| Setup trigger otomatis                             | `onFormSubmit` (kalau pakai Google Form) atau custom menu di Sheet ("Generate Surat Tugas")                                                                                             |
| Testing menyeluruh                                 | Coba semua skenario: 1 orang, 2 orang, 3 orang, 4+ orang, tiap-tiap 6 pilihan penandatangan, pergantian tahun, undangan dengan format berbeda-beda (scan buram, PDF rapi, format asing) |
| (Opsional lanjutan)                                | Eksplorasi convert Doc ke PDF otomatis + auto-simpan ke folder Drive tertentu                                                                                                           |

### Pengolah Data dan Informasi

| Tugas                                         | Detail                                                                                                                                                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bersihkan & standarisasi Database Kepegawaian | Pastikan format NIP konsisten (jangan ada yang pakai spasi/strip beda-beda), nama tidak typo, jabatan pakai istilah baku — kalau datanya berantakan, lookup otomatis bisa gagal/salah ambil                     |
| Susun Database Nomor Surat awal               | Isi baris terakhir sesuai arsip nyata (772 di tahun 2026), supaya nomor berikutnya nyambung benar, bukan mulai dari 0                                                                                           |
| Susun Database Pejabat Penandatangan          | Data 6 pejabat (1 Kepala Pusat + 5 katim): nama, NIP, pangkat/golongan, jabatan masing-masing — pastikan penulisan gelar/jabatan konsisten dengan format resmi                                                  |
| Desain form input                             | Field apa saja yang wajib diisi TU saat input data undangan (perihal, dasar surat, tanggal, lokasi, topik)                                                                                                      |
| Kumpulkan contoh undangan beragam format      | Minimal 10-15 undangan asli dengan format berbeda-beda (dari berbagai instansi) untuk bahan uji ekstraksi                                                                                                       |
| Evaluasi akurasi ekstraksi (ground truth)     | Baca manual tiap undangan contoh, catat jawaban yang benar (nama acara, tanggal, lokasi), bandingkan dengan hasil ekstraksi otomatis — skill ini sama persis dengan ground truth evaluation di proyek Policy AI |
| Uji coba & validasi hasil generate            | Sebelum dipakai resmi, cek beberapa surat hasil generate dibandingkan format asli — pastikan penomoran, susunan kalimat, dan tabel lampiran benar                                                               |
| Dokumentasi SOP pemakaian untuk tim TU        | Panduan sederhana cara pakai sistem untuk staf TU yang mungkin tidak familiar dengan Google Sheets/Script                                                                                                       |

---

## 4. Urutan Pengembangan yang Disarankan

Sama seperti prinsip di proyek Policy AI — **logic dulu, baru rapikan tampilan/UX**:

1. **Bersihkan 3 database dulu** (Nomor Surat, Kepegawaian, Pejabat Penandatangan) — tanpa
   data yang bersih, semua logic di atasnya percuma
2. **Bangun & uji logic generate nomor** secara terpisah dulu (paling sederhana, cepat
   dites, dan jadi fondasi semua fitur lain)
3. **Bangun logic isi template untuk kasus sederhana dulu** (≤3 pegawai, penandatangan
   normal/tidak cuti) — **di tahap ini, data acara masih diinput MANUAL dulu** (belum
   pakai ekstraksi otomatis)
4. **Baru tambahkan kasus kompleks**: >3 pegawai (tabel lampiran)
5. **Baru tambahkan fitur ekstraksi otomatis dari undangan** (3.5) — sengaja ditaruh
   belakangan karena ini fitur paling kompleks & paling banyak variabel yang bisa gagal
   (kualitas scan, format bebas, dll.). Kalau fitur inti (nomor, template, lampiran) belum
   solid, jangan tambah kerumitan ekstraksi AI di atasnya
6. **Terakhir**, baru rapikan hal lain: auto-PDF, notifikasi email, dsb.
