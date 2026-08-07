# 📌 KONTEKS PROJEK INTEGRASI DATABASE FAKULTAS VOKASI

Dokumen ini dibuat khusus sebagai **Panduan & Handover untuk AI Agent / Developer** agar langsung memahami konteks arsitektur, aturan integrasi, dan status pengerjaan penggabungan database 3 aplikasi Fakultas Vokasi.

---

## 🎯 1. Gambaran Besar (Big Picture)

Fakultas Vokasi sedang menyatukan database dari **3 Aplikasi Utama** ke dalam 1 Sistem Terpusat (**SIMPEL**):

```
                       ┌────────────────────────────────────────┐
                       │          SIMPEL (Aplikasi Inti)         │
                       │    Master Database & Central Server     │
                       └───────────────────┬────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
      ┌─────────────▼──────────────┐                ┌─────────────▼──────────────┐
      │      SIGAP / SIPPFV        │                │     APLIKASI KETIGA        │
      │  (Penjaminan Mutu & IKU)   │                │   (Module Selanjutnya)     │
      │     Status: SELESAI ✅     │                │   Status: TARGET BERIKUTNYA│
      └────────────────────────────┘                └────────────────────────────┘
```

1. **Aplikasi 1: SIMPEL (Central Core System)**
   - Pemilik resmi **Master Data** seluruh fakultas.
   - Tabel Master Utama:
     - `study_programs` (Master Program Studi resmi)
     - `users` (Master Pegawai, Dosen, Mahasiswa, Superadmin)

2. **Aplikasi 2: SIGAP / SIPPFV (Modul Penjaminan Mutu & IKU)**
   - **STATUS: SELESAI DIINTEGRASIKAN ✅**
   - Menggunakan master `study_programs` dan `users` milik SIMPEL.
   - Memiliki tabel otorisasi modul bernama **`SIGAP`**.

3. **Aplikasi 3: Aplikasi Ketiga (Next Target)**
   - **STATUS: TUGAS SELANJUTNYA 🎯**
   - Harus mengikuti standar arsitektur integrasi yang telah berhasil diterapkan pada SIGAP.

---

## 📐 2. Aturan Standar Arsitektur Integrasi (PENTING BILA DITERAPKAN DI APLIKASI KETIGA)

Arsitektur yang telah disepakati dan terbukti sukses di SIGAP:

### A. Tabel Master yang Diikuti:
- **Master Prodi:** Menggunakan tabel `study_programs` dari SIMPEL.
  - Kode Prodi Resmi SIMPEL: `ADP`, `AKT`, `MP`, `PUR`, `PTI`, `PROMKES`, `BOGA`, `BUSANA`, `RIAS`, `ELKO`, `ELKA`, `MESIN`, `OTO`, `SIPIL`.
- **Master User:** Menggunakan tabel `users` dari SIMPEL.

### B. Pola Otorisasi Akun Modul (Pola 2 Role):
1. **Role ADMIN:**
   - Terikat ke **`users.id` (SIMPEL)** lewat Foreign Key `id_user`.
   - Username menggunakan **`@username` dari tabel `users` SIMPEL** (contoh: `@wisnurachmadprihadi`).
   - Password **TIDAK DISIMPAN DUPLIKAT** di modul. Login Admin langsung memverifikasi password ke tabel `users.password` milik SIMPEL (`bcrypt`).
2. **Role PRODI:**
   - Terikat ke **`study_programs.id` (SIMPEL)** lewat Foreign Key `id_prodi`.
   - Menggunakan Username khusus prodi (contoh: `d4-te`, `d4-ak`) + password modul untuk akun bersama prodi (*shared prodi account*).

---

## 💻 3. Ringkasan Implementasi di SIGAP (Aplikasi 2)

Jika perlu merujuk kode atau pola yang sudah berjalan di SIGAP:
- **Service Login 3-Tabel:** `src/services/auth.service.ts`
- **Service User & Dropdown SIMPEL:** `src/services/user.service.ts`
- **Service Prodi Master SIMPEL:** `src/services/prodi.service.ts`
- **Tampilan Manajemen User:** `src/pages/ManajemenUser.tsx`
  - Dropdown `ADMIN` menampilkan nama + `@username` dari SIMPEL.
  - Otomatis mengurutkan role `ADMIN` di paling atas tabel.
- **Proteksi Akses (Role Access Guard):** `src/SippApp.tsx` & `src/components/Topbar.tsx`
  - Non-admin (Prodi) otomatis di-redirect ke Dashboard dan dilarang membuka halaman Admin.

---

## 📝 4. Catatan Penting untuk AI Agent / Developer Selanjutnya

> ⚠️ **HIMBAUAN PENTING:**  
> 1. **DILARANG MERUBAH / MERUSAK** kode aplikasi SIGAP yang sudah berjalan lancar ini. Dokumen ini murni sebagai catatan konteks.
> 2. Untuk pengerjaan **Aplikasi Ketiga**, gunakan dokumen ini sebagai acuan arsitektur agar aplikasi ketiga bisa langsung terhubung ke database SIMPEL dengan pola yang persis sama.

---
*Dokumen ini dibuat otomatis sebagai sistem handover konteks projek.*
