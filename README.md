# 📸 Excel Photo Inserter — Telkom Gedung

Aplikasi web untuk memasukkan foto pekerjaan ke dalam laporan Excel **Pengelolaan Gedung Telkom** secara otomatis. Berjalan 100% di browser, tanpa backend, tanpa install.

🔗 **Live App:** `https://<username>.github.io/excel-photo-inserter`

---

## ✨ Fitur

- Upload file Excel laporan (`.xlsx`)
- Upload folder gambar sebagai ZIP atau drag-drop langsung
- Mapping manual: sheet Excel ↔ folder gambar
- Pilih foto per aktivitas pekerjaan secara visual
- Foto dibagi rata di kolom **C** dan **D**
- Preview layout sebelum download
- Download Excel hasil dengan foto tertanam
- Hapus otomatis foto lama jika Excel sudah berisi gambar

---

## 🚀 Cara Deploy ke GitHub Pages

### 1. Fork / Clone Repository

```bash
git clone https://github.com/<username>/excel-photo-inserter.git
cd excel-photo-inserter
```

### 2. Push ke GitHub

```bash
git add .
git commit -m "initial commit"
git push origin main
```

### 3. Aktifkan GitHub Pages

1. Buka repository di GitHub
2. Klik **Settings** → **Pages**
3. Di bagian **Source**, pilih branch `main` dan folder `/ (root)`
4. Klik **Save**
5. Tunggu 1–2 menit, lalu akses URL yang muncul

---

## 📁 Struktur File

```
excel-photo-inserter/
├── index.html          ← Aplikasi utama (single file, semua logic di sini)
├── README.md           ← Dokumentasi ini
├── assets/
│   └── logo-telkom.png ← Logo Telkom (opsional)
└── docs/
    └── PRD.md          ← Product Requirements Document
```

---

## 🖥️ Cara Penggunaan

1. **Buka aplikasi** di browser (Chrome / Edge direkomendasikan)
2. **Upload Excel** — file `.xlsx` laporan pengelolaan gedung
3. **Upload folder gambar** — upload sebagai ZIP (atau drag-drop folder di Chrome/Edge)
   - Siapkan 3 folder sesuai 3 sheet: `OFFICE`, `IDLE`, `HALAMAN`
4. **Mapping** — pilih folder mana yang sesuai untuk tiap sheet
5. **Pilih foto** — untuk setiap aktivitas pekerjaan, klik foto yang sesuai
6. **Preview** — cek layout foto sebelum diproses
7. **Download** — unduh file Excel yang sudah berisi foto

---

## ⚙️ Teknologi

| Teknologi | Kegunaan |
|---|---|
| HTML5 + CSS3 + JavaScript | Antarmuka dan logika aplikasi |
| [ExcelJS](https://github.com/exceljs/exceljs) | Baca & tulis file Excel dengan gambar |
| [JSZip](https://stuk.github.io/jszip/) | Ekstrak file ZIP dari folder gambar |
| GitHub Pages | Hosting gratis, tanpa backend |

---

## 📋 Aturan Penempatan Foto

| Jumlah Foto | Kolom C | Kolom D |
|---|---|---|
| 1 | 1 foto | — |
| 2 | 1 foto | 1 foto |
| 3 | 2 foto | 1 foto |
| 4 | 2 foto | 2 foto |
| N | ⌈N/2⌉ foto | ⌊N/2⌋ foto |

- Foto menyesuaikan **tinggi baris yang sudah ada** (tidak mengubah ukuran baris/kolom)
- Foto lama dihapus otomatis sebelum foto baru dimasukkan

---

## 🔒 Privasi

Semua file diproses **di browser Anda sendiri**. Tidak ada data, foto, atau file Excel yang dikirim ke server manapun.

---

## 📄 Lisensi

Internal use — Telkom Indonesia
