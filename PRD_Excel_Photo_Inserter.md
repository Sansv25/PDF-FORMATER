# Product Requirements Document (PRD)
## Excel Photo Inserter — Telkom Gedung Management
**Versi:** 1.0  
**Tanggal:** Mei 2026  
**Platform Target:** GitHub Pages (Static Web App)

---

## 1. Ringkasan Produk

Aplikasi web statis yang memungkinkan user untuk memasukkan foto-foto dari folder ke dalam kolom **FOTO PEKERJAAN** pada file Excel laporan pengelolaan gedung Telkom. Aplikasi berjalan sepenuhnya di browser (client-side), dapat di-deploy ke GitHub Pages, dan menghasilkan file Excel yang siap didownload.

---

## 2. Latar Belakang & Masalah

Laporan bulanan pengelolaan gedung Telkom (format `.xlsx`) memiliki struktur:
- **3 Sheet:** `KELAS 4 OFFICE`, `KELAS 4 IDLE`, `HALAMAN`
- Setiap sheet berisi daftar **Aktivitas Pekerjaan** (kolom B) dengan kolom foto kosong (kolom **C** dan **D**)
- Saat ini, memasukkan foto ke Excel dilakukan manual — menyita waktu dan rawan salah posisi
- Foto yang dimasukkan harus menyesuaikan tinggi baris yang sudah ada (tidak boleh mengubah ukuran kolom/baris)

**Solusi:** Aplikasi web yang membimbing user step-by-step untuk:
1. Upload file Excel
2. Upload folder gambar (3 folder → 3 sheet)
3. Mapping folder ke sheet secara manual
4. Memilih foto untuk setiap aktivitas secara visual
5. Preview hasil
6. Download Excel yang sudah berisi foto

---

## 3. Pengguna

| Atribut | Detail |
|---|---|
| **Primary User** | 1 orang (pemilik sistem sendiri) |
| **Frekuensi Penggunaan** | Bulanan (setiap periode laporan) |
| **Perangkat** | Desktop browser (Chrome/Edge diutamakan) |
| **Kemampuan Teknis** | Non-developer |

---

## 4. Alur Utama (User Flow)

```
STEP 1: Upload Excel
    └─> Validasi format .xlsx
    └─> Hapus otomatis gambar lama jika ada
    └─> Parse nama sheet & aktivitas

STEP 2: Upload Folder Gambar (3 folder)
    └─> User upload via ZIP atau drag-drop folder
    └─> Sistem mendeteksi nama folder & isi gambar
    └─> Tampilkan daftar folder + jumlah gambar

STEP 3: Mapping Sheet ↔ Folder
    └─> Tampilkan daftar sheet dari Excel
    └─> User pilih manual: Sheet ini → Folder ini
    └─> Validasi: semua sheet harus terpetakan

STEP 4: Penempatan Foto per Aktivitas
    └─> User pilih sheet/tab yang ingin dikerjakan
    └─> Tampilkan daftar aktivitas dari sheet tersebut
    └─> Per aktivitas: tampilkan thumbnail semua foto dari folder terpetakan
    └─> User klik foto yang ingin dimasukkan (multi-select)
    └─> Sistem atur posisi foto: C dan D dibagi rata

STEP 5: Preview Hasil
    └─> Tampilkan simulasi visual layout foto di tiap baris
    └─> User bisa kembali ke Step 4 untuk revisi

STEP 6: Generate & Download
    └─> Generate file Excel dengan foto tertanam
    └─> Download otomatis ke browser user
```

---

## 5. Fitur Detail

### 5.1 Upload Excel
- Format diterima: `.xlsx` saja
- Validasi: cek keberadaan minimal 1 sheet dengan kolom `AKTIFITAS PEKERJAAN` dan `FOTO PEKERJAAN`
- **Hapus gambar lama:** Jika Excel sudah berisi gambar (embed), hapus semua gambar di kolom C dan D sebelum proses berlanjut
- Tampilkan konfirmasi kepada user sebelum menghapus gambar lama: _"File ini sudah berisi X gambar. Gambar lama akan dihapus. Lanjutkan?"_

### 5.2 Upload Folder Gambar
- **Metode upload:**
  - **Opsi A:** Upload sebagai file `.zip` (semua browser)
  - **Opsi B:** Drag-drop folder langsung (Chrome/Edge only)
- User dapat upload hingga **3 folder** sekaligus atau satu per satu
- Setiap folder ditampilkan sebagai card: nama folder + jumlah gambar + thumbnail preview (3 gambar pertama)
- Format gambar diterima: `.jpg`, `.jpeg`, `.png`, `.webp`
- Gambar non-image diabaikan secara otomatis

### 5.3 Mapping Sheet ↔ Folder (Manual)
- Tampilkan tabel mapping:

  | Sheet (dari Excel) | → | Folder Gambar |
  |---|---|---|
  | KELAS 4 OFFICE | → | [Dropdown: pilih folder] |
  | KELAS 4 IDLE | → | [Dropdown: pilih folder] |
  | HALAMAN | → | [Dropdown: pilih folder] |

- Dropdown berisi daftar folder yang sudah diupload
- Validasi: tidak boleh ada sheet tanpa folder terpetakan sebelum lanjut
- Boleh 2 sheet memakai folder yang sama (edge case)

### 5.4 Penempatan Foto per Aktivitas
- Tampilkan tab per sheet (misal: tab `OFFICE` | `IDLE` | `HALAMAN`)
- Per tab, tampilkan daftar aktivitas pekerjaan secara vertikal
- Per baris aktivitas:
  - Tampilkan nama aktivitas (dari kolom B Excel)
  - Tampilkan grid thumbnail semua foto dari folder yang terpetakan
  - User klik foto untuk memilih/deselect (multi-select)
  - Foto yang dipilih ditandai dengan border/highlight merah
  - Tampilkan counter: _"3 foto dipilih"_
  - Tombol **Clear** untuk hapus semua pilihan di baris tersebut

#### Aturan Penempatan Foto di Excel:
| Jumlah Foto Dipilih | Kolom C | Kolom D |
|---|---|---|
| 1 foto | 1 foto | kosong |
| 2 foto | 1 foto | 1 foto |
| 3 foto | 2 foto (atas-bawah) | 1 foto |
| 4 foto | 2 foto (atas-bawah) | 2 foto (atas-bawah) |
| 5 foto | 3 foto | 2 foto |
| N foto | ⌈N/2⌉ foto | ⌊N/2⌋ foto |

- **Ukuran foto:** Menyesuaikan tinggi baris yang sudah ada di Excel — foto dibagi rata secara vertikal dalam sel
- **Lebar foto:** Menyesuaikan lebar kolom C atau D masing-masing
- **Tidak ada perubahan ukuran kolom/baris** sama sekali

### 5.5 Preview Hasil
- Tampilkan simulasi visual per sheet dalam bentuk tabel HTML
- Tiap baris menampilkan:
  - Nomor + Nama aktivitas
  - Thumbnail foto yang akan masuk ke kolom C (disusun vertikal)
  - Thumbnail foto yang akan masuk ke kolom D (disusun vertikal)
- Navigasi tab per sheet
- Tombol **Edit** untuk kembali ke Step 4
- Tombol **Download Excel** untuk lanjut ke Step 6
- Indikator: baris aktivitas yang belum ada foto ditandai dengan label `Belum ada foto` (berwarna abu)

### 5.6 Generate & Download Excel
- Library yang digunakan: **ExcelJS** (client-side, mendukung embed gambar)
- Proses:
  1. Load file Excel asli (preserve semua format, formula, merge cell)
  2. Hapus semua gambar lama di kolom C & D (jika ada)
  3. Untuk setiap aktivitas yang memiliki foto: embed gambar ke posisi sel C dan D sesuai aturan pembagian
  4. Gambar di-fit ke dalam area sel (lebar kolom × tinggi baris / jumlah foto)
  5. Tidak ada perubahan pada kolom lain, baris header, merge cell, warna, atau font
- Output: file `.xlsx` dengan nama `[nama_file_asli]_foto.xlsx`
- Download otomatis via browser

---

## 6. Aturan Bisnis

| # | Aturan |
|---|---|
| BR-01 | Ukuran baris dan lebar kolom Excel **tidak boleh berubah** sama sekali |
| BR-02 | Gambar lama **wajib dihapus** sebelum gambar baru dimasukkan |
| BR-03 | Foto dibagi rata antara kolom C dan D (C mendapat sisa jika ganjil) |
| BR-04 | Jika user tidak memilih foto untuk suatu aktivitas, baris tersebut dibiarkan kosong |
| BR-05 | Mapping sheet ↔ folder **harus manual** — tidak ada auto-detect berdasarkan nama |
| BR-06 | Semua proses berjalan di browser (client-side) — tidak ada data dikirim ke server |
| BR-07 | File Excel asli tidak dimodifikasi — output selalu file baru |
| BR-08 | Format gambar yang diproses: JPG, JPEG, PNG, WEBP |

---

## 7. Spesifikasi Teknis

### 7.1 Stack Teknologi
| Layer | Teknologi |
|---|---|
| **Frontend** | HTML5 + CSS3 + Vanilla JavaScript |
| **Excel Processing** | [ExcelJS](https://github.com/exceljs/exceljs) (browser build) |
| **ZIP Handling** | [JSZip](https://stuk.github.io/jszip/) |
| **Deployment** | GitHub Pages (static hosting) |
| **Build Tool** | Tidak diperlukan (pure static) |

### 7.2 Struktur File Repository
```
/
├── index.html          ← Aplikasi utama (single file)
├── README.md
└── (opsional) /assets  ← Icon, logo Telkom
```

### 7.3 Batasan Teknis
- Semua proses **client-side** — tidak ada backend, tidak ada database
- Kompatibel dengan **Chrome 90+** dan **Edge 90+**
- Ukuran gambar tidak dikompres — kualitas asli dipertahankan
- Batas praktis file upload: ~50MB total (batasan browser)

---

## 8. Antarmuka (UI/UX)

### 8.1 Identitas Visual
- Warna utama: **Merah Telkom** (`#E31937`)
- Font: Bersih dan profesional
- Layout: Single-page, step wizard (1 → 2 → 3 → 4 → 5 → 6)
- Progress bar di bagian atas menunjukkan posisi step saat ini

### 8.2 Komponen Utama
| Komponen | Keterangan |
|---|---|
| **Step Indicator** | Breadcrumb/progress bar 6 langkah di header |
| **Drop Zone** | Area drag-drop untuk upload Excel dan folder/ZIP |
| **Folder Card** | Card per folder: nama, jumlah foto, 3 thumbnail preview |
| **Mapping Table** | Tabel sheet → dropdown folder |
| **Activity List** | Daftar aktivitas per sheet dengan grid thumbnail foto |
| **Photo Thumbnail** | Gambar kecil 72×72px, klik untuk select/deselect |
| **Preview Table** | Simulasi layout foto sebelum download |
| **Toast Notification** | Notifikasi sukses/error di pojok layar |

### 8.3 Responsivitas
- Dioptimalkan untuk **desktop** (lebar minimum 900px)
- Mobile tidak menjadi prioritas utama

---

## 9. Penanganan Error

| Kondisi Error | Pesan ke User |
|---|---|
| Upload bukan file .xlsx | _"File harus berformat .xlsx"_ |
| Excel tidak punya sheet yang dikenali | _"Struktur sheet tidak sesuai template"_ |
| Folder ZIP kosong / tidak ada gambar | _"Folder tidak berisi gambar yang valid"_ |
| Ada sheet yang belum dipetakan ke folder | _"Semua sheet harus dipetakan ke folder gambar"_ |
| Gagal generate Excel | _"Terjadi kesalahan saat membuat file. Coba lagi."_ |
| Format gambar tidak didukung | File tersebut dilewati secara diam-diam (tidak dimasukkan ke daftar) |

---

## 10. Yang Tidak Termasuk (Out of Scope)

- ❌ Login / autentikasi
- ❌ Penyimpanan data ke server atau cloud
- ❌ Kompresi / resize gambar otomatis
- ❌ Dukungan format Excel lain (`.xls`, `.xlsm`)
- ❌ Edit nama aktivitas atau konten Excel
- ❌ Fitur undo/redo
- ❌ Mode mobile
- ❌ Riwayat penggunaan / history

---

## 11. Kriteria Selesai (Definition of Done)

- [ ] User dapat upload Excel dan sistem membaca sheet + aktivitas dengan benar
- [ ] User dapat upload 3 folder (via ZIP atau drag-drop) dan melihat isinya
- [ ] Mapping sheet ↔ folder dapat dilakukan manual
- [ ] Thumbnail foto tampil di setiap baris aktivitas
- [ ] Multi-select foto berfungsi dengan highlight visual
- [ ] Preview layout foto sebelum download tampil dengan benar
- [ ] File Excel output memiliki foto di kolom C & D sesuai pembagian rata
- [ ] Ukuran baris & kolom Excel tidak berubah
- [ ] Gambar lama terhapus saat Excel lama di-re-upload
- [ ] Aplikasi berjalan tanpa error di Chrome/Edge terbaru
- [ ] Dapat di-deploy dan berjalan di GitHub Pages

---

## 12. Prioritas Pengembangan

| Fase | Fitur | Prioritas |
|---|---|---|
| **Fase 1** | Upload Excel + parse sheet & aktivitas | 🔴 Wajib |
| **Fase 1** | Upload folder (ZIP) + tampilkan thumbnail | 🔴 Wajib |
| **Fase 1** | Mapping sheet ↔ folder | 🔴 Wajib |
| **Fase 1** | Pilih foto per aktivitas (manual) | 🔴 Wajib |
| **Fase 1** | Generate & download Excel dengan foto | 🔴 Wajib |
| **Fase 2** | Preview sebelum download | 🟡 Penting |
| **Fase 2** | Hapus gambar lama otomatis | 🟡 Penting |
| **Fase 2** | Drag-drop folder langsung (tanpa ZIP) | 🟢 Nice to have |
| **Fase 2** | Toast notifikasi + error handling lengkap | 🟢 Nice to have |
