# Skenario Test Case Manual — FinTrack

Fitur yang diuji:
1. Budget Rollover
2. Recurring Income (Auto-Salary)
3. Cloud Backup

Cara pakai: ikuti langkah tiap test case, centang checkbox sesuai hasil. Tulis hasil aktual jika tidak sesuai ekspektasi.

---

## Persiapan Umum

- Jalankan app: `npx expo start` lalu buka di device/simulator.
- Sebagian test butuh data transaksi **bulan lalu** — gunakan date picker di form transaksi untuk meng-input tanggal mundur.
- Sebagian test butuh simulasi **pergantian bulan** — ubah tanggal device (Settings > Date & Time) lalu buka ulang app. **Ingat kembalikan tanggal device setelah selesai.**
- Test rollover sebaiknya dilakukan di awal bulan atau dengan simulasi tanggal device.

---

## 1. Budget Rollover

### BR-01: Setup budget dengan rollover aktif
**Prasyarat:** Tidak ada budget untuk bulan ini.

1. Buka tab **Anggaran**.
2. Tap salah satu kategori (misal "Makanan").
3. Isi batas anggaran, misal **Rp 1.000.000**.
4. Aktifkan toggle **"Teruskan sisa ke bulan depan"**.
5. Tap **Simpan**.

**Ekspektasi:**
- [ ] Budget tersimpan, progress bar muncul.
- [ ] Toggle rollover tetap aktif setelah form ditutup (buka lagi untuk cek: "Sisa bulan lalu +Rp 0" tidak muncul karena belum ada bulan sebelumnya).

---

### BR-02: Sisa bulan lalu diteruskan ke bulan ini
**Prasyarat:**
- Budget "Makanan" Rp 1.000.000 dengan rollover aktif di bulan **lalu** (input via date picker transaksi tanggal bulan lalu, atau simulasi tanggal device).
- Ada transaksi expense "Makanan" bulan lalu total **Rp 600.000** (sisa = Rp 400.000).

1. Pastikan tanggal device/saat ini sudah masuk **bulan baru**.
2. Tutup app, buka lagi (atau pull-to-refresh dashboard).
3. Buka tab **Anggaran**.

**Ekspektasi:**
- [ ] Muncul teks hijau: **"Sisa bulan lalu +Rp 400.000"** pada kategori Makanan.
- [ ] Limit yang tampil = **Rp 1.400.000** (1.000.000 + 400.000).
- [ ] Summary card "Total Anggaran" ikut bertambah.
- [ ] Dashboard > "Anggaran Bulan Ini" menampilkan limit efektif Rp 1.400.000.

---

### BR-03: Tanpa rollover, sisa tidak diteruskan
**Prasyarat:** Budget "Transportasi" bulan lalu Rp 500.000, terpakai Rp 300.000, **rollover NONAKTIF**.

1. Buka tab **Anggaran** di bulan baru.

**Ekspektasi:**
- [ ] Tidak ada indikator "Sisa bulan lalu" untuk Transportasi.
- [ ] Limit Transportasi = Rp 500.000 (atau sesuai yang di-set), tanpa tambahan.

---

### BR-04: Budget habis terpakai — tidak ada carryover negatif
**Prasyarat:** Budget "Belanja" bulan lalu Rp 500.000, terpakai **Rp 700.000** (melebihi), rollover aktif.

1. Buka tab **Anggaran** di bulan baru.

**Ekspektasi:**
- [ ] Tidak ada indikator "Sisa bulan lalu" (sisa dihitung `max(0, limit - spent)` = 0).
- [ ] Limit bulan ini tidak berkurang karena kelebihan bulan lalu.

---

### BR-05: Nyalakan rollover setelah bulan berjalan
1. Di bulan baru, buka budget kategori yang bulan lalu ada sisanya.
2. Aktifkan toggle rollover, tap **Simpan**.

**Ekspektasi:**
- [ ] Indikator "Sisa bulan lalu" langsung muncul (engine dijalankan ulang setelah simpan).
- [ ] Matikan toggle, simpan → indikator hilang.

---

### BR-06: Perhitungan progress bar memakai effective limit
**Prasyarat:** Budget "Makanan": limit 1.000.000 + rollover 400.000 = **effective 1.400.000**. Transaksi bulan ini total 1.100.000.

1. Buka tab **Anggaran**.

**Ekspektasi:**
- [ ] Progress = 1.100.000 / 1.400.000 = **79%** (bukan 110%).
- [ ] Warna bar: **kuning/orange** (>70%).
- [ ] Alert budget (90%/100%) dihitung terhadap 1.400.000, bukan 1.000.000.

---

### BR-07: Alur transisi bulan penuh (simulasi tanggal device)
1. Set budget bulan ini (rollover aktif), tambah transaksi expense kecil (sisa > 0).
2. Ubah tanggal device ke **1 bulan berikutnya**.
3. Tutup & buka kembali app.
4. Cek tab Anggaran dan Dashboard.

**Ekspektasi:**
- [ ] Sisa bulan lalu muncul sebagai rollover.
- [ ] Transaksi "bulan lalu" masih terlihat di Riwayat.
- [ ] Kembalikan tanggal device → app tidak error.

---

### BR-08: Backup/restore tetap menyimpan setting rollover
1. Lakukan **Backup Data** (Settings > Data).
2. Restore ke state kosong / device lain.
3. Buka tab Anggaran.

**Ekspektasi:**
- [ ] Rollover amount & toggle aktif tetap tersimpan setelah restore.

---

## 2. Recurring Income (Auto-Salary)

### RI-01: Banner "Atur gaji otomatis?" muncul
**Prasyarat:**
- Settings > Periode Gaji: toggle **aktif**, tanggal gaji di-set (misal 25), kategori gaji dipilih.
- Ada minimal 1 transaksi income di kategori gaji (untuk estimasi nominal).
- **Belum ada** recurring income aktif.

1. Buka **Settings > Transaksi Berulang**.

**Ekspektasi:**
- [ ] Banner muncul di atas list: "Atur gaji otomatis?" + nominal estimasi + tanggal berikutnya.
- [ ] Nominal = rata-rata income kategori gaji 3 bulan terakhir.
- [ ] Tanggal = tanggal gaji berikutnya sesuai setting payroll.

---

### RI-02: Pre-fill form dari banner
1. Tap banner "Atur gaji otomatis?".

**Ekspektasi:**
- [ ] Form terbuka dengan:
  - Tipe: **Pemasukan** (tab hijau aktif)
  - Jumlah: terisi estimasi gaji
  - Kategori: kategori gaji terpilih
  - Frekuensi: **Bulanan**
  - Catatan: "Gaji (Otomatis)"
  - Dompet: dompet pertama terpilih
- [ ] Tombol Simpan aktif.

---

### RI-03: Simpan recurring income → transaksi otomatis dibuat
1. Dari banner, tap **Simpan**.
2. Jika tanggal gaji berikutnya = hari ini atau sudah lewat → buka tab Dashboard (atau tutup/buka app).

**Ekspektasi:**
- [ ] Card recurring income muncul di daftar Transaksi Berulang (ikon + nominal hijau).
- [ ] Engine membuat transaksi income otomatis (catatan berakhiran "(Otomatis)") di **Riwayat**.
- [ ] **Saldo dompet bertambah** sesuai nominal.
- [ ] Banner "Atur gaji otomatis?" **hilang** (karena sudah ada recurring income aktif).
- [ ] `next_date` maju satu bulan setelah diproses.

---

### RI-04: Prompt setelah menambah gaji manual
**Prasyarat:** Payroll aktif, kategori gaji terpilih, belum ada recurring income aktif.

1. Tab **+** (Tambah Transaksi).
2. Pilih tipe **Pemasukan**, kategori **Gaji**, isi nominal, simpan.

**Ekspektasi:**
- [ ] Muncul alert: **"Gaji rutin? Jadikan pemasukan ini sebagai transaksi berulang otomatis setiap bulan?"**
- [ ] Tap "Ya, Atur" → recurring income dibuat; next_date = tanggal yang sama bulan depan.
- [ ] Tap "Tidak" → tidak terjadi apa-apa.

---

### RI-05: Prompt TIDAK muncul saat tidak relevan
**Prasyarat:** Payroll nonaktif ATAU kategori bukan gaji ATAU sudah ada recurring income aktif.

1. Tambah transaksi income kategori selain gaji (atau saat payroll off).

**Ekspektasi:**
- [ ] Tidak ada prompt apa pun.

---

### RI-06: Forecast 30 hari memasukkan estimasi gaji
**Prasyarat:** Payroll aktif, ada estimasi gaji, **belum ada** recurring income aktif.

1. Buka dashboard > card Safe to Spend > tap link ke halaman **Forecast** (atau `/forecast`).

**Ekspektasi:**
- [ ] Grafik proyeksi saldo melonjak naik di tanggal gaji berikutnya.
- [ ] Hanya terjadi **satu kali** dalam 30 hari (satu titik income).

---

### RI-07: Tidak ada double-counting
**Prasyarat:** Sudah ada recurring income aktif (dari RI-03).

1. Buka halaman **Forecast**.

**Ekspektasi:**
- [ ] Income gaji hanya muncul dari recurring income, bukan 2x (tidak ada lonjakan ganda di tanggal yang sama).

---

### RI-08: Safe to Spend memperhitungkan gaji bulan ini
**Prasyarat:** Payroll aktif, gaji berikutnya **masih di bulan yang sama** (≤ akhir bulan), belum ada recurring income.

1. Buka Dashboard.

**Ekspektasi:**
- [ ] Nilai "Sisa Budget Harian" lebih tinggi dibanding sebelum fitur ini (gaji menambah effective balance).
- [ ] Status warna bisa berubah dari danger/caution menjadi healthy jika gaji cukup besar.

---

### RI-09: Edge case tanggal gaji (31 → bulan pendek)
1. Set tanggal gaji = **31**.
2. Simulasi bulan berjalan tanpa tanggal 31 (Februari/April).

**Ekspektasi:**
- [ ] Banner & next_date jatuh ke hari terakhir bulan tersebut (28/29/30) — tidak error.
- [ ] Engine tetap memproses tanpa crash.

---

### RI-10: Nonaktifkan payroll → banner hilang
1. Settings > Periode Gaji: toggle **off**.
2. Buka **Transaksi Berulang**.

**Ekspektasi:**
- [ ] Banner "Atur gaji otomatis?" tidak muncul.
- [ ] Recurring income yang sudah dibuat tetap ada dan tetap jalan.

---

## 3. Cloud Backup

### CB-01: Toggle Backup Otomatis
1. Buka **Settings > Backup Otomatis** (section di bawah "Data").

**Ekspektasi:**
- [ ] Ada item "Backup Otomatis" dengan status "Belum pernah backup otomatis".
- [ ] Tap → checkbox tercentang & opsi frekuensi muncul: **Harian / Mingguan / Bulanan**.
- [ ] Tap lagi → opsi tersembunyi.

---

### CB-02: Pilih frekuensi
1. Aktifkan Backup Otomatis.
2. Pilih **Mingguan**, lalu buka app lagi (tutup & buka).

**Ekspektasi:**
- [ ] Chip frekuensi terpilih tetap tersimpan (buka ulang Settings → masih Mingguan).

---

### CB-03: Backup otomatis berjalan sesuai jadwal
**Prasyarat:** Backup Otomatis aktif, interval 1 hari (Harian), `last_auto_backup_date` kosong/belum ada.

1. Tutup app, buka kembali.
2. Tunggu beberapa detik (proses di background `_layout`).

**Ekspektasi:**
- [ ] Settings > Backup Otomatis menampilkan "Backup terakhir: [tanggal hari ini]".
- [ ] Tidak ada error/crash.

---

### CB-04: Tidak backup berulang dalam interval
1. Catat tanggal backup terakhir (hari ini).
2. Tutup & buka app lagi beberapa kali pada hari yang sama.

**Ekspektasi:**
- [ ] Tanggal "Backup terakhir" **tidak berubah** (masih hari ini) — tidak backup ganda dalam interval.

---

### CB-05: Backup lokal tampil di Files (iOS)
**Prasyarat:** Build dev via `expo run:ios` (konfigurasi `enableFileSharing` butuh rebuild native).

1. Setelah backup otomatis/manual terjadi, buka app **Files** di iOS.
2. Buka folder **On My iPhone > FinTrack**.

**Ekspektasi:**
- [ ] File `FinTrack_AutoBackup_YYYYMMDD_HHMMSS.json` terlihat.
- [ ] Jika iCloud Drive aktif di device, file ikut tersinkronisasi ke iCloud.

---

### CB-06: Google Drive (Android)
**Prasyarat:** Android, Backup Otomatis aktif & sudah waktunya backup.

1. Buka app (backup otomatis akan berjalan).
2. Saat pertama kali → dialog izin akses folder muncul.

**Ekspektasi:**
- [ ] Pilih folder di **Google Drive** → izin diberikan.
- [ ] File backup `.json` tersimpan di folder tersebut.
- [ ] Backup berikutnya **tidak** meminta izin lagi (URI tersimpan).

---

### CB-07: Backup manual tetap berfungsi + tercatat
1. Settings > Data > **Backup Data**.

**Ekspektasi:**
- [ ] Share sheet muncul seperti biasa.
- [ ] Setelah selesai, Settings > Backup Otomatis menampilkan "Backup terakhir: [tanggal hari ini]" (tercatat dari backup manual).

---

### CB-08: Restore masih berfungsi
1. Settings > Data > **Restore Data**.
2. Pilih file backup (auto atau manual).

**Ekspektasi:**
- [ ] Data pulih (transaksi, budget + rollover, recurring, dll).
- [ ] Pesan sukses menampilkan jumlah transaksi/kategori/dompet.

---

### CB-09: Alert pengingat backup
**Prasyarat:** Backup Otomatis **nonaktif**, dan tidak ada backup dalam 7 hari terakhir (kosongkan data app atau ubah tanggal device maju >7 hari dari `last_backup_date`).

1. Buka app (masukkan PIN jika kunci aktif).

**Ekspektasi:**
- [ ] Muncul alert: **"💾 Backup Data — Sudah lebih dari 7 hari..."** setelah unlock (PIN/biometrik).
- [ ] Tap "Buka Pengaturan" → berpindah ke tab Pengaturan.
- [ ] Jika Auto Backup aktif → alert **tidak** muncul.

---

### CB-10: Auto backup tidak mengganggu saat error
1. Aktifkan auto backup, lalu matikan jaringan (atau pakai Android tanpa izin folder).

**Ekspektasi:**
- [ ] App tetap berjalan normal, tidak crash.
- [ ] Backup lokal tetap dibuat (error cloud diabaikan, tercatat via console saja).

---

## Catatan Tambahan

- **Perubahan tanggal device** untuk simulasi rollover/backup wajib dikembalikan setelah selesai agar data lain tidak terpengaruh.
- Konfigurasi `expo-file-system` (CB-05) baru berlaku setelah **rebuild native** (`npx expo run:ios` / `run:android`), bukan saat pakai Expo Go.
- Semua engine (rollover, recurring, backup) berjalan saat **app dibuka** (trigger di `_layout.tsx`) — tidak ada timer background.
