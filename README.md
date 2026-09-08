# 💸 FinTrack - Personal Finance Manager

![Expo](https://img.shields.io/badge/Expo-1C1E24?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

FinTrack adalah aplikasi pencatat keuangan pribadi modern dan kaya fitur yang dibangun menggunakan **React Native (Expo SDK 57)**. Aplikasi ini dirancang beroperasi secara *offline-first* dengan database lokal (SQLite) untuk memastikan privasi data, kecepatan, dan ketersediaan tanpa bergantung pada koneksi internet.

Hadir dengan desain antarmuka (UI) modern bertema hijau-to-cyan yang elegan, dilengkapi dukungan otomatis Mode Gelap & Terang. Dashboard baru menampilkan hero gradient full-bleed dengan saldo besar, aksi cepat, analitik 3-tab yang ringkas, widget anggaran & target menabung di satu layar, serta sparkline kekayaan bersih. Font Inter untuk tipografi premium.

---

## ✨ Fitur Utama

- **📊 Dashboard Interaktif v2**: Pantau total saldo di **hero gradient full-bleed** dengan rangkuman pemasukan/pengeluaran, indikator tren, dan chip periode gaji. **4 aksi cepat** (Tambah, Transfer, Anggaran, Target) langsung dari dashboard. Analitik keuangan dalam **satu kartu bertab** (Ringkas/Kategori/Tren) — tidak perlu scroll 3 layar lagi. Dilengkapi **widget anggaran** (top-3 progress bar), **ring target menabung** (SVG progress ring horizontal), **sparkline kekayaan bersih** 12 bulan, dan wawasan finansial yang bisa dibuka/tutup.
- **📈 Visualisasi Data (Charts)**: Analisis pengeluaran dan pemasukan dengan *Overview Donut Chart*, *Expense Category Donut Chart*, *Category Bar Chart*, dan *Grouped Monthly Trend Bar Chart* (6 bulan, menampilkan income & expense berdampingan — bukan hanya salah satu). Semua dalam satu kartu bertab yang menghemat ruang.
- **📊 Kategori Bulan Ini**: Bar chart pengeluaran dan pemasukan per kategori untuk **bulan kalender berjalan** (terlepas dari filter periode gaji), diurutkan **terbesar dari kiri** (6 kategori teratas) lengkap dengan label nominal. Seksi otomatis sembunyi bila bulan ini belum ada transaksi.
- **🪙 Harga Emas & 💵 Kurs USD/IDR**: Grafik area 1B/3B/6B (**default 3 bulan**) — emas per gram (Rupiah) dan kurs tengah USD→IDR. **Sentuh/geser grafik** untuk crosshair + tooltip tanggal & harga. Kartu bisa **dilipat/dibuka** (default terbuka). Sumber publik tanpa API key: Yahoo Finance (emas GC=F) & Frankfurter/ECB (kurs), dengan cache offline 6 jam.
- **📰 Berita Ekonomi Nasional & Internasional**: Dua kartu carousel (satu berita per halaman + dots yang bisa diketuk) berisi berita ekonomi Indonesia dan global via Google News RSS (tanpa API key, cache 1 jam). Kartu bisa dilipat/dibuka; ketuk berita untuk dibaca di browser dalam aplikasi.
- **✨ Animasi Dashboard**: Angka saldo/pemasukan/pengeluaran **count-up** yang meluncur, orb gradient melayang di hero, parallax hero + sticky pill saldo saat scroll, entrance stagger per seksi, progress bar & ring yang benar-benar beranimasi, dan skeleton loading yang selaras dengan layout asli.
- **🧭 Custom Tab Bar & ➕ Draggable FAB**: Tab bar pil melayang tanpa label dengan indikator glow pada tab aktif dan ikon yang berubah saat fokus. Tombol tambah transaksi (+) **bisa digeser** ke posisi mana pun (dengan batas area aman) dan tampil sedikit transparan agar tidak menutupi konten.
- **👛 Multi-Dompet (Wallets)**: Kelola berbagai sumber dana seperti Uang Tunai, Rekening Bank, dan E-Wallet dengan saldo yang terpisah. Tandai satu dompet sebagai **Dompet Utama** (primary), tambah dompet baru dengan pilihan ikon dan warna, **edit dompet** (nama/ikon/warna/saldo awal — perubahan saldo awal otomatis menggeser saldo berjalan tanpa mengubah transaksi), serta hapus dengan konfirmasi yang memberi tahu jumlah transaksi terdampak.
- **🎯 Manajemen Anggaran (Budgeting)**: Cegah pemborosan dengan mengatur batas anggaran bulanan per kategori. Dilengkapi *progress bar* visual dengan indikator warna (hijau <70%, kuning 70–90%, merah >90%). **Widget anggaran di dashboard** menampilkan 3 kategori teratas yang paling mendekati batas.
- **🔄 Budget Rollover**: Aktifkan toggle **"Teruskan sisa ke bulan depan"** per kategori anggaran — sisa yang tidak terpakai otomatis ditambahkan ke limit bulan berikutnya (envelope budgeting). Engine berjalan otomatis saat app dibuka & setelah simpan budget, dengan indikator "Sisa bulan lalu +Rp X" di layar Anggaran dan dashboard. Alert 90%/100% dihitung terhadap *effective limit* (limit + rollover).
- **📝 Pencatatan Cepat**: Tambah transaksi pemasukan atau pengeluaran hanya dalam beberapa ketukan. Mendukung auto-format mata uang (Rupiah), pemilihan kategori, dompet, dan tanggal.
- **🩺 Kesehatan Finansial (Financial Literacy)**: Skor kesehatan keuangan 0-100 di dashboard berdasarkan rasio tabungan, dana darurat, budget adherence, dan analisis 50/30/20. Dilengkapi tips personal otomatis dari data transaksi Anda.
- **🖼️ Lampiran Foto/Resi**: Lampirkan foto bukti transaksi langsung dari kamera atau galeri. Arsip digital untuk setiap transaksi dengan preview thumbnail.
- **🏷️ Tag/Label per Transaksi**: Tambahkan tag bebas ke transaksi untuk kategorisasi alternatif. Dilengkapi autocomplete, filter chips di riwayat, dan tampilan detail.
- **📄 Riwayat dengan Infinite Scroll**: Daftar transaksi menggunakan pagination otomatis (infinite scroll) dengan 40 item per halaman untuk performa lancar.
- **📊 Insight & Spending Pattern**: Analisis perbandingan pengeluaran bulan lalu vs bulan ini per kategori, deteksi anomali (lonjakan >100%), dan alert defisit anggaran.
- **🔄 Transaksi Berulang (Recurring)**: Buat transaksi otomatis berulang harian, mingguan, bulanan, atau tahunan — mendukung tipe **pemasukan** (gaji) maupun pengeluaran. Engine berjalan otomatis saat aplikasi dibuka dan menangani periode yang terlewat.
- **💰 Gaji Otomatis (Auto-Salary)**: Terintegrasi dengan **Periode Gaji** di Pengaturan. Banner **"Atur gaji otomatis?"** muncul di layar Transaksi Berulang (nominal rata-rata 3 bulan terakhir + tanggal gaji berikutnya di-pre-fill otomatis). Setelah menambah pemasukan kategori gaji, aplikasi menawarkan menjadikannya transaksi berulang. **Forecast 30 hari & Safe to Spend** kini memperhitungkan gaji yang akan datang (tanpa double-counting jika recurring income sudah aktif).
- **📂 Ekspor Laporan**: Ekspor data transaksi ke format **Excel (`.xlsx`)** untuk analisis mendalam, atau **PDF** untuk laporan siap bagikan dengan desain gradient header dan bagan warna.
- **🔍 Detail & Edit Transaksi**: Lihat detail lengkap transaksi, edit nominal/kategori/dompet, atau hapus transaksi (dengan pembalikan saldo otomatis).
- **💰 Transfer antar Dompet**: Pindahkan dana dari satu dompet ke dompet lain dengan mudah. Saldo otomatis terupdate di kedua dompet.
- **🔍 Pencarian & Filter**: Cari transaksi berdasarkan catatan/ nama kategori, filter berdasarkan kategori, dompet, tipe, atau **rentang tanggal multi-bulan**.
- **📂 Kustomisasi Kategori**: Tambah, edit, atau hapus kategori transaksi sendiri dengan pilihan ikon dan warna.
- **💾 Backup & Restore**: Ekspor seluruh data ke JSON untuk cadangan, atau impor dari file JSON untuk memulihkan data. Format **backup v7** mencakup seluruh 18 tabel (termasuk `debts`, `debt_payments`, dan `goal_contributions`) dan preferensi aplikasi (tema, notifikasi, periode gaji); backup lama tetap bisa direstore. File divalidasi sebelum restore agar data rusak tidak menimpa data aktif.
- **🧾 Kontribusi Target yang Dapat Diaudit**: Setiap penambahan dana ke target menabung kini dicatat sebagai **entri ledger internal** (terlihat di riwayat, tidak dihitung sebagai pengeluaran konsumtif di laporan). Dilengkapi riwayat dana per target dan pembatalan kontribusi yang mengembalikan saldo dompet.
- **🔁 Transfer Pair-aware**: Transfer antar dompet dicatat sebagai satu pasangan transaksi yang selalu diedit/dihapus bersama-sama — menghapus satu leg otomatis membatalkan leg pasangannya dan mengembalikan saldo kedua dompet.
- **☁️ Backup Otomatis (Cloud)**: Section **"Backup Otomatis"** baru di Pengaturan — jadwal **Harian/Mingguan/Bulanan** otomatis setiap app dibuka. Di iOS file backup tampil di **Files & iCloud** (via konfigurasi `expo-file-system`), di Android bisa disimpan langsung ke **Google Drive** (izin folder sekali, URI tersimpan). Pengingat otomatis muncul jika >7 hari tanpa backup & auto-backup nonaktif.
- **📱 Onboarding**: Panduan 3 langkah untuk pengguna baru saat pertama kali membuka aplikasi.
- **✏️ Edit Cepat**: Long-press pada item transaksi di daftar untuk langsung Edit atau Hapus tanpa perlu masuk ke halaman detail.
- **🎉 Animasi Sukses**: Checkmark animasi memuaskan setelah berhasil menyimpan transaksi baru.
- **⚡ Quick-Amount Chips**: 6 tombol nominal cepat (10K–500K) untuk input transaksi tanpa keyboard.
- **👆 Haptic Feedback**: Getaran halus di berbagai interaksi (pilih kategori, submit form, ubah filter) untuk umpan balik taktil.
- **⌛ Skeleton Loaders**: Shimmer placeholder saat pertama kali membuka dashboard atau daftar transaksi.
- **📈 Trend Indicator**: Indikator persentase kenaikan/penurunan pemasukan vs pengeluaran dibandingkan bulan lalu.
- **🔔 Pengingat Anggaran**: Notifikasi (Alert) otomatis saat pengeluaran kategori mencapai 90% atau lebih dari batas anggaran.
- **🔒 Offline & Privat**: Seluruh data disimpan langsung di memori perangkat Anda menggunakan SQLite. Tidak ada data yang dikirim ke server eksternal. 100% offline.
- **🎯 Target Menabung (Savings Goals)**: Tetapkan target tabungan dengan nominal dan deadline. Pantau progress secara visual dengan progress bar dan persentase. **Widget ring SVG di dashboard** menampilkan semua target aktif dalam strip horizontal yang bisa discroll. Tambah dana langsung dari halaman target.
- **⏰ Pengingat Tagihan (Bill Reminders)**: Catat tagihan rutin (listrik, internet, dll) dengan frekuensi bulanan/tahunan. Dapatkan pengingat otomatis via **sinkronisasi ke Kalender Sistem** (Google Calendar / Apple Calendar) dengan alarm H-1. Menandai **"Lunas" otomatis mencatat transaksi pengeluaran** dari dompet & kategori tagihan, lalu tagihan bulanan/tahunan **maju sendiri ke jatuh tempo berikutnya** (bukan berstatus lunas selamanya). Membatalkan status lunas akan menghapus transaksi tersebut dan mengembalikan saldo.
- **📄 Laporan Tahunan**: Lihat ringkasan finansial sepanjang tahun dengan bar chart perbandingan pemasukan vs pengeluaran per bulan. Navigasi antar tahun.
- **🔐 Kunci Aplikasi (PIN/Biometric)**: Amankan aplikasi dengan PIN 4 digit atau biometrik (Face ID / Fingerprint). Aktifkan/nonaktifkan dari pengaturan.
- **🌓 Tema & Font Premium (Dark/Light/Auto)**: Pilih tema tampilan sesuai preferensi Anda. Mode Auto mengikuti pengaturan sistem **secara live** (tidak perlu restart). Font **Inter** di 4 weight (Regular/Medium/SemiBold/Bold) memberikan tipografi modern dan nyaman dibaca. Tema Gelap atau Terang bisa dipilih manual dari tab Pengaturan.
- **📥 Impor CSV Rekening Koran**: Impor transaksi dari file CSV bank Indonesia (BCA, Mandiri, BRI, dll) dengan **flow review**: pilih file → petakan kolom (tanggal, keterangan, nominal, debit/kredit) → pilih dompet & kategori tujuan → pratinjau baris yang siap/duplikat/rusak → impor atomik. Mendukung format tanggal & nominal Indonesia (termasuk `DB`/`CR` dan kurung untuk minus), deteksi duplikat terhadap data lama, serta rollback penuh bila satu baris gagal.
- **💳 Arus Kas (Cash Flow)**: Lihat net cash flow tahun berjalan dengan indikator positif/negatif di dashboard.
- **📊 Kekayaan Bersih (Net Worth)**: Pantau total kekayaan bersih secara real-time (saldo wallet + aset manual — utang). Dilengkapi **sparkline SVG tren 12 bulan** langsung di kartu ringkas dashboard, line chart di halaman detail, dan snapshot otomatis setiap bulan.
- **📅 Kalender Transaksi**: Lihat transaksi harian dalam tampilan kalender grid 7×6 dengan dot indikator. Tap hari untuk melihat detail transaksi via bottom sheet. Navigasi bulan dengan swipe gesture.
- **🔁 Manajemen Langganan (Subscriptions)**: Catat semua langganan (Netflix, Spotify, dll) dengan siklus bulanan/3-bulanan/tahunan. Pilih **dompet & kategori pembayaran** plus toggle **"Catat transaksi otomatis"** dan **"Ingatkan H-1"**, sehingga engine benar-benar membukukan pengeluaran saat tagihan jatuh tempo — termasuk **menyusul semua siklus yang terlewat** bila aplikasi lama tidak dibuka. Toggle "Ingatkan H-1" langsung berlaku tanpa restart, dan tagihan ikut **disinkronkan ke Kalender Sistem** (event all-day + alarm H-1) yang di-resync otomatis saat layar Langganan dibuka. Langganan lama tanpa dompet/kategori otomatis memakai dompet utama & kategori "Lainnya". Total biaya bulanan dihitung otomatis.
- **💰 Sisa Budget Harian (Safe to Spend)**: Proyeksi sisa saldo yang aman dibelanjakan per hari dalam **kartu ringkas** dengan progress bar visual. Berdasarkan saldo, tagihan mendatang, target tabungan, **dan gaji yang akan datang dalam bulan berjalan**. Toggle on/off di pengaturan. Dilengkapi halaman forecast 30 hari dengan line chart.
- **📅 Proyeksi Berbasis Event**: Forecast 30 hari kini menyusun **event per tanggal** dari transaksi berulang, gaji, tagihan yang belum lunas, dan langganan aktif (siklus bulanan/kuartalan/tahunan) — bukan sekadar rata-rata harian. Setiap hari menampilkan rincian sumber event, tagihan yang terlambat ditandai jelas, dan transaksi aktual tidak pernah dihitung dua kali.
- **🤝 Utang & Piutang (Debt Tracking)**: Catat uang yang kamu **pinjamkan (piutang)** atau **pinjam (utang)** per orang, lengkap dengan jatuh tempo, dompet, dan catatan. Setiap pencatatan dan pelunasan **otomatis membuat transaksi nyata** sehingga saldo dompet & laporan tetap sinkron (opsional saat membuat). Mendukung **pembayaran bertahap** dengan progress bar dan **riwayat cicilan** yang bisa dibuka per catatan (tanggal + nominal tiap pembayaran), pelunasan otomatis saat lunas, indikator jatuh tempo (terlewat / hari ini / n hari lagi), kartu ringkas posisi bersih, dan filter Belum Lunas/Semua. Sisa piutang/utang ikut diperhitungkan di **Kekayaan Bersih**.
- **🔔 Notifikasi Push Lokal**: Notifikasi sistem sungguhan (bukan sekadar Alert) via `expo-notifications`. Mencakup **Pengingat Harian** ("Catat pengeluaran hari ini") dengan **jam yang bisa diatur** di Pengaturan (stepper 30 menit, default 20.00) dan langsung dijadwalkan ulang tanpa perlu restart, peringatan anggaran 90%/100%, pengingat tagihan H-1 (pukul 09.00), dan pengingat perpanjangan langganan H-1. Android memakai *notification channels* terpisah (Peringatan Anggaran, Pengingat Tagihan, Pengingat Harian, Langganan) dan semua reminder di-reschedule otomatis setiap aplikasi dibuka.
- **☁️ Backup Cloud Akun (Supabase)**: Layar **"Backup Cloud"** untuk menyimpan data ke Supabase Storage dengan **akun username & password** (tanpa email). Fitur: daftar/masuk akun, backup manual, daftar backup tersimpan (tanggal + ukuran file), restore dengan konfirmasi, hapus backup, dan toggle **"Unggah Otomatis"** yang mengikuti jadwal Backup Otomatis. Maksimal 10 backup terbaru disimpan — backup lama otomatis dihapus. Konfigurasi via `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) dengan panduan setup SQL di [`supabase-setup.sql`](./supabase-setup.sql).
- **🧾 Rekonsiliasi Saldo Dompet Otomatis**: Setiap kali aplikasi dibuka, saldo semua dompet diverifikasi ulang dari `initial_balance + jumlah transaksi` dan dikoreksi otomatis jika selisih (mencegah drift saldo akibat data tidak konsisten).

---

## 📱 Tampilan Layar (Screenshots)

*(Silakan ganti tautan di bawah ini dengan screenshot aplikasi Anda yang sebenarnya)*

| Dashboard | Riwayat Transaksi | Anggaran (Budget) | Pengaturan |
| :---: | :---: | :---: | :---: |
| <img src="https://via.placeholder.com/250x500.png?text=Dashboard" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Transaksi" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Budget" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Pengaturan" width="200"/> |

| Detail Transaksi | Tambah Transaksi | Dompet (Wallet) | Kategori | Target Menabung |
| :---: | :---: | :---: | :---: | :---: |
| <img src="https://via.placeholder.com/250x500.png?text=Detail" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Tambah" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Dompet" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Kategori" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Goals" width="200"/> |

| Pengingat Tagihan | Laporan Tahunan | Impor CSV | Kunci Aplikasi | Onboarding |
| :---: | :---: | :---: | :---: | :---: |
| <img src="https://via.placeholder.com/250x500.png?text=Reminder" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Tahunan" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Import" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Lock" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Onboarding" width="200"/> |

---

## 🛠️ Teknologi yang Digunakan

* **Framework**: React Native 0.86 & Expo SDK ~57 (React 19.2.4)
* **Routing**: Expo Router (File-based routing)
* **Bahasa**: TypeScript
* **Database**: `expo-sqlite` (SQLite lokal, migrasi v11 — ledger transaksi internal untuk kontribusi target, histori `goal_contributions`, `source_key` untuk idempotensi engine otomatis, serta `PRAGMA journal_mode=WAL` + `busy_timeout` untuk mencegah lock saat akses konkuren)
* **Visualisasi Data**: `react-native-gifted-charts`
* **Date Picker**: `react-native-ui-datepicker`
* **Manajemen Tanggal**: `dayjs`
* **Animasi**: `react-native-reanimated`
* **Font**: `@expo-google-fonts/inter` (Inter)
* **Gradient**: `expo-linear-gradient`
* **Ikon**: `@expo/vector-icons` (Ionicons)
* **Ekspor PDF**: `expo-print` + `expo-file-system` + `expo-sharing`
* **Ekspor Excel**: `xlsx` + `expo-file-system` + `expo-sharing`
* **Haptic Feedback**: `expo-haptics`
* **Autentikasi Biometrik**: `expo-local-authentication`
* **Sinkronisasi Kalender**: `expo-calendar`
* **Notifikasi Push**: `expo-notifications`
* **Backup Cloud**: `@supabase/supabase-js` (Supabase Auth + Storage)
* **Penyimpanan Aman (PIN)**: `expo-secure-store`
* **Pemilih Foto/Galeri**: `expo-image-picker` (Lampiran Resi)
* **Pemilih Berkas**: `expo-document-picker` (Impor CSV)
* **Parsing CSV**: parser internal (`src/features/import/csvParser.ts`)
* **Penyimpanan Lokal**: `@react-native-async-storage/async-storage`
* **Unit Testing**: `jest` + `jest-expo` + `@testing-library/react-native` + `test-renderer`
* **Path Alias**: `@/` → `./src/`

---

## 🚀 Cara Menjalankan Secara Lokal

Ikuti langkah-langkah di bawah ini untuk menjalankan project ini di komputer Anda.

### Prasyarat
Pastikan Anda sudah menginstal:
- [Node.js](https://nodejs.org/) (Versi 18 atau lebih baru)
- Aplikasi **Expo Go** di HP Anda (Android/iOS), atau Android Studio / Xcode Simulator di komputer Anda.

### Instalasi

1. **Clone repositori ini**
   ```bash
   git clone https://github.com/username-anda/fintrack.git
   cd fintrack
   ```

2. **Instal dependensi**
   ```bash
   npm install
   ```

3. **Jalankan Development Server**
   ```bash
   npx expo start -c
   ```

4. **Buka Aplikasi**
   - Tekan `a` untuk membuka di Android Emulator.
   - Tekan `i` untuk membuka di iOS Simulator.
   - Scan **QR Code** yang muncul di terminal menggunakan aplikasi Expo Go di HP Anda.

---

## 🧪 Testing

Jalankan seluruh unit test (engine + query + UI theme):

```bash
npm test
```

| File Test | Cakupan |
|-----------|---------|
| `src/__tests__/rollover.test.ts` | RolloverEngine — carryover sisa, tanpa carryover negatif, mempertahankan limit bulan berjalan, toggle off, tanpa budget bulan lalu |
| `src/__tests__/salary.test.ts` | Proyeksi gaji — payroll off, tanpa kategori/transaksi gaji, rata-rata 3 bulan, filter kategori |
| `src/__tests__/forecast.test.ts` | Forecast 30 hari & Safe to Spend — injeksi gaji, anti double-counting, recurring expense, batas bulan |
| `src/__tests__/backup.test.ts` | Backup — gather data, backup lokal, share sheet, scheduler (interval), Google Drive SAF |
| `src/__tests__/cloudBackup.test.ts` | Supabase Cloud Backup — auth (sign up/in/out), upload, list, restore, delete, auto-upload toggle |
| `src/__tests__/reconcile.test.ts` | Rekonsiliasi saldo dompet — koreksi drift, saldo sudah akurat tetap utuh, regresi dompet baru tidak dinolkan |
| `src/__tests__/wallets.test.ts` | WalletQueries — `initial_balance` saat create, geser saldo saat edit, pindah dompet utama saat hapus, fallback dompet/kategori |
| `src/__tests__/subscriptions.test.ts` | Langganan — auto-create transaksi, fallback data lama, `auto_create` off, susul siklus terlewat, siklus tahunan/kuartalan, `calendar_event_id` dinullkan saat bergeser, flag `remind` dihormati scheduler |
| `src/__tests__/bills.test.ts` | Tagihan — lunas mencatat pengeluaran, maju jatuh tempo bulanan/tahunan, sekali pakai, batal lunas menghapus transaksi |
| `src/__tests__/debts.test.ts` | Utang/Piutang — arah transaksi, pembayaran bertahap, pelunasan, batas nominal, ringkasan, kontribusi ke Net Worth, riwayat pembayaran terurut |
| `src/__tests__/bootPath.test.ts` | Boot path isolation — lazy Supabase client tidak membuka SQLite kedua saat startup |
| `src/__tests__/theme.test.tsx` | ThemeProvider — dark/light/auto, live system theme, cycle, error outside provider |

Skenario **test manual** lengkap (28 kasus) tersedia di [`MANUAL_TEST_CASES.md`](./MANUAL_TEST_CASES.md) — mencakup Budget Rollover, Recurring Income (Auto-Salary), dan Cloud Backup.

> Catatan: dependensi testing memakai `overrides` `@react-native/jest-preset` di `package.json` dan React `19.2.4` agar `npm ci` (dipakai EAS Build) dapat resolve peer dependency secara ketat.

---

## 📁 Struktur Folder

```text
FinTrack/
├── src/
│   ├── app/                    # Konfigurasi routing (Expo Router) dan layar
│   │   ├── (tabs)/             # 4 layar tab (Dashboard, Transaksi, Budget, Pengaturan)
│   │   ├── transaction/        # Detail & Edit transaksi (modal)
│   │   ├── goals.tsx           # Target menabung (Savings Goals)
│   │   ├── reminders.tsx       # Pengingat tagihan (Bill Reminders)
│   │   ├── annual.tsx          # Laporan tahunan
│   │   ├── import.tsx          # Impor CSV rekening koran
│   │   ├── lock.tsx            # Pengaturan PIN/biometric
│   │   ├── lock-screen.tsx     # Layar masuk PIN/biometric
│   │   ├── subscriptions.tsx   # Manajemen langganan (subscriptions)
│   │   ├── subscription/       # Form langganan [id].tsx
│   │   ├── cloud-backup.tsx    # Backup Cloud Supabase (akun username/password)
│   │   ├── net-worth.tsx       # Kekayaan bersih (Net Worth Tracker)
│   │   ├── debts.tsx           # Utang & Piutang per orang (debt tracking)
│   │   ├── asset/              # Form aset [id].tsx
│   │   ├── liability/          # Form utang [id].tsx
│   │   ├── forecast.tsx        # Proyeksi 30 hari (Safe to Spend)
│   │   ├── transactions/calendar.tsx  # Kalender transaksi
│   │   ├── recurring.tsx       # CRUD transaksi berulang
│   │   ├── transfer.tsx        # Transfer antar dompet
│   │   ├── wallets.tsx         # Manajemen dompet (sub-screen)
│   │   ├── categories.tsx      # Manajemen kategori (sub-screen)
│   │   ├── onboarding.tsx      # 3-slide onboarding untuk pengguna baru
│   │   └── export.tsx          # Ekspor laporan Excel
│   ├── components/             # Komponen UI reusable
│   │   ├── calendar/           # TransactionCalendar, CalendarDay, DayTransactionSheet
│   │   ├── charts/             # Donut chart, bar chart, monthly trend chart, filter tanggal
│   │   ├── dashboard/          # SafeToSpendCard
│   │   ├── forms/              # Form transaksi, budget, dompet, kategori
│   │   ├── networth/           # NetWorthSummaryCard, NetWorthChart, AssetsList, LiabilitiesList
│   │   └── ui/                 # Button, Card, Input, FAB, Skeleton, IconPicker, ColorPicker, dll
│   ├── constants/              # Tema (dark mode), kategori default, dompet default
│   ├── features/               # Modul fitur
│   │   ├── recurring/          # Engine transaksi berulang
│   │   ├── rollover/           # Engine budget rollover
│   │   ├── cloud-backup/       # Scheduler backup otomatis, reminder, cloud storage (Google Drive/iCloud), Supabase auth & backup
│   │   ├── insights/           # Spending insights, financial literacy engine & card
│   │   ├── export/             # Generator PDF, Excel, dan backup/restore JSON
│   │   ├── forecast/           # Safe to spend & forecast engine (aware gaji)
│   │   ├── wallets/            # Rekonsiliasi saldo dompet otomatis (reconcile.ts)
│   │   └── notifications/      # Kalender sync, budget reminder & notifikasi push lokal (expo-notifications)
│   ├── lib/                    # SQLite schema, migration (v1–v7), seed, query classes
│   ├── types/                  # Definisi tipe TypeScript global
│   ├── utils/                  # Format Rupiah, haptic, payroll period, proyeksi gaji (salary.ts)
│   └── __tests__/              # Unit test (Jest + Testing Library)
├── assets/                     # Gambar, icon, dan font statis
├── app.json                    # Konfigurasi Expo aplikasi (termasuk plugin expo-file-system)
├── eas.json                    # Konfigurasi EAS Build
├── MANUAL_TEST_CASES.md        # Skenario test manual
├── package.json                # Dependensi dan script NPM
└── tsconfig.json               # Konfigurasi TypeScript
```

---

## 🚧 Fitur yang Akan Datang (Roadmap)

Berikut fitur-fitur yang sedang direncanakan untuk pengembangan selanjutnya:

- 💱 **Multi Mata Uang** — dukung mata uang selain IDR dengan kurs dinamis
- 📊 **Split Transaksi** — satu transaksi dibagi ke beberapa kategori
- 📥 **Export CSV** — ekspor data transaksi ke format CSV
- 📱 **Widget Home Screen** — ringkasan cepat di layar utama HP Android/iOS

Ada ide fitur lain? Silakan buka *issue* atau ajukan *Pull Request*!

---

## 🤝 Kontribusi

Kontribusi selalu diterima! Jika Anda menemukan bug atau memiliki ide fitur baru:
1. Lakukan *Fork* pada repositori ini.
2. Buat *branch* fitur Anda (`git checkout -b fitur-baru`).
3. *Commit* perubahan Anda (`git commit -m 'Menambahkan fitur baru'`).
4. *Push* ke branch tersebut (`git push origin fitur-baru`).
5. Buka sebuah *Pull Request*.

---

## 📄 Lisensi

Project ini dilisensikan di bawah [MIT License](LICENSE). Anda bebas untuk menggunakan, memodifikasi, dan mendistribusikan aplikasi ini.
