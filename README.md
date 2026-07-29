# 💸 FinTrack - Personal Finance Manager

![Expo](https://img.shields.io/badge/Expo-1C1E24?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

FinTrack adalah aplikasi pencatat keuangan pribadi modern dan kaya fitur yang dibangun menggunakan **React Native (Expo SDK 57)**. Aplikasi ini dirancang beroperasi secara *offline-first* dengan database lokal (SQLite) untuk memastikan privasi data, kecepatan, dan ketersediaan tanpa bergantung pada koneksi internet.

Hadir dengan desain antarmuka (UI) gelap (Dark Mode) yang elegan, bersih, dan memanjakan mata, memberikan pengalaman pengguna kelas premium saat mengelola arus kas harian Anda.

---

## ✨ Fitur Utama

- **📊 Dashboard Interaktif**: Pantau total saldo, arus kas masuk/keluar, dan tren keuangan Anda dalam satu layar. Dilengkapi pull-to-refresh, search cepat, dan filter rentang tanggal (Bulan Ini, Bulan Lalu, Tahun Ini, atau kustom).
- **📈 Visualisasi Data (Charts)**: Analisis pengeluaran dan pemasukan dengan mudah melalui *Overview Donut Chart*, *Expense Category Donut Chart*, *Category Bar Chart*, dan *Monthly Trend Bar Chart* (6 bulan) yang cantik dan interaktif.
- **👛 Multi-Dompet (Wallets)**: Kelola berbagai sumber dana seperti Uang Tunai, Rekening Bank, dan E-Wallet dengan saldo yang terpisah. Tandai satu dompet sebagai **Dompet Utama** (primary), tambah dompet baru dengan pilihan ikon dan warna, serta hapus dengan konfirmasi.
- **🎯 Manajemen Anggaran (Budgeting)**: Cegah pemborosan dengan mengatur batas anggaran bulanan per kategori. Dilengkapi dengan *progress bar* visual dengan indikator warna (hijau <70%, kuning 70–90%, merah >90%).
- **📝 Pencatatan Cepat**: Tambah transaksi pemasukan atau pengeluaran hanya dalam beberapa ketukan. Mendukung auto-format mata uang (Rupiah), pemilihan kategori, dompet, dan tanggal.
- **🩺 Kesehatan Finansial (Financial Literacy)**: Skor kesehatan keuangan 0-100 di dashboard berdasarkan rasio tabungan, dana darurat, budget adherence, dan analisis 50/30/20. Dilengkapi tips personal otomatis dari data transaksi Anda.
- **🖼️ Lampiran Foto/Resi**: Lampirkan foto bukti transaksi langsung dari kamera atau galeri. Arsip digital untuk setiap transaksi dengan preview thumbnail.
- **🏷️ Tag/Label per Transaksi**: Tambahkan tag bebas ke transaksi untuk kategorisasi alternatif. Dilengkapi autocomplete, filter chips di riwayat, dan tampilan detail.
- **📄 Riwayat dengan Infinite Scroll**: Daftar transaksi menggunakan pagination otomatis (infinite scroll) dengan 40 item per halaman untuk performa lancar.
- **📊 Insight & Spending Pattern**: Analisis perbandingan pengeluaran bulan lalu vs bulan ini per kategori, deteksi anomali (lonjakan >100%), dan alert defisit anggaran.
- **🔄 Transaksi Berulang (Recurring)**: Buat transaksi otomatis berulang harian, mingguan, bulanan, atau tahunan. Engine berjalan otomatis saat aplikasi dibuka dan menangani periode yang terlewat.
- **📂 Ekspor Laporan**: Ekspor data transaksi ke format **Excel (`.xlsx`)** untuk analisis mendalam, atau **PDF** untuk laporan siap bagikan dengan desain gradient header dan bagan warna.
- **🔍 Detail & Edit Transaksi**: Lihat detail lengkap transaksi, edit nominal/kategori/dompet, atau hapus transaksi (dengan pembalikan saldo otomatis).
- **💰 Transfer antar Dompet**: Pindahkan dana dari satu dompet ke dompet lain dengan mudah. Saldo otomatis terupdate di kedua dompet.
- **🔍 Pencarian & Filter**: Cari transaksi berdasarkan catatan/ nama kategori, filter berdasarkan kategori, dompet, tipe, atau **rentang tanggal multi-bulan**.
- **📂 Kustomisasi Kategori**: Tambah, edit, atau hapus kategori transaksi sendiri dengan pilihan ikon dan warna.
- **💾 Backup & Restore**: Ekspor seluruh data ke JSON untuk cadangan, atau impor dari file JSON untuk memulihkan data. Support tabel baru (goals, reminders).
- **📱 Onboarding**: Panduan 3 langkah untuk pengguna baru saat pertama kali membuka aplikasi.
- **✏️ Edit Cepat**: Long-press pada item transaksi di daftar untuk langsung Edit atau Hapus tanpa perlu masuk ke halaman detail.
- **🎉 Animasi Sukses**: Checkmark animasi memuaskan setelah berhasil menyimpan transaksi baru.
- **⚡ Quick-Amount Chips**: 6 tombol nominal cepat (10K–500K) untuk input transaksi tanpa keyboard.
- **👆 Haptic Feedback**: Getaran halus di berbagai interaksi (pilih kategori, submit form, ubah filter) untuk umpan balik taktil.
- **⌛ Skeleton Loaders**: Shimmer placeholder saat pertama kali membuka dashboard atau daftar transaksi.
- **📈 Trend Indicator**: Indikator persentase kenaikan/penurunan pemasukan vs pengeluaran dibandingkan bulan lalu.
- **🔔 Pengingat Anggaran**: Notifikasi (Alert) otomatis saat pengeluaran kategori mencapai 90% atau lebih dari batas anggaran.
- **🔒 Offline & Privat**: Seluruh data disimpan langsung di memori perangkat Anda menggunakan SQLite. Tidak ada data yang dikirim ke server eksternal. 100% offline.
- **🎯 Target Menabung (Savings Goals)**: Tetapkan target tabungan dengan nominal dan deadline. Pantau progress secara visual dengan progress bar dan persentase. Tambah dana langsung dari halaman target.
- **⏰ Pengingat Tagihan (Bill Reminders)**: Catat tagihan rutin (listrik, internet, dll) dengan frekuensi bulanan/tahunan. Dapatkan pengingat otomatis via **sinkronisasi ke Kalender Sistem** (Google Calendar / Apple Calendar) dengan alarm H-1.
- **📄 Laporan Tahunan**: Lihat ringkasan finansial sepanjang tahun dengan bar chart perbandingan pemasukan vs pengeluaran per bulan. Navigasi antar tahun.
- **🔐 Kunci Aplikasi (PIN/Biometric)**: Amankan aplikasi dengan PIN 4 digit atau biometrik (Face ID / Fingerprint). Aktifkan/nonaktifkan dari pengaturan.
- **🌓 Pengaturan Tema (Dark/Light/Auto)**: Pilih tema tampilan sesuai preferensi Anda. Mode Auto mengikuti pengaturan sistem, atau pilih manual antara Tema Gelap atau Terang dari tab Pengaturan.
- **📥 Impor CSV Rekening Koran**: Impor transaksi dari file CSV bank Indonesia (BCA, Mandiri, BRI, dll) secara otomatis dengan deteksi kolom dan cek duplikat.
- **💳 Arus Kas (Cash Flow)**: Lihat net cash flow tahun berjalan dengan indikator positif/negatif di dashboard.

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

* **Framework**: React Native 0.86 & Expo SDK ~57
* **Routing**: Expo Router (File-based routing)
* **Bahasa**: TypeScript
* **Database**: `expo-sqlite` (Lokal Database)
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
* **Pemilih Berkas**: `expo-document-picker` (Impor CSV)
* **Parsing CSV**: `papaparse`
* **Penyimpanan Lokal**: `@react-native-async-storage/async-storage`
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
│   │   ├── recurring.tsx       # CRUD transaksi berulang
│   │   ├── transfer.tsx        # Transfer antar dompet
│   │   ├── wallets.tsx         # Manajemen dompet (sub-screen)
│   │   ├── categories.tsx      # Manajemen kategori (sub-screen)
│   │   ├── onboarding.tsx      # 3-slide onboarding untuk pengguna baru
│   │   └── export.tsx          # Ekspor laporan Excel
│   ├── components/             # Komponen UI reusable
│   │   ├── charts/             # Donut chart, bar chart, monthly trend chart, filter tanggal
│   │   ├── forms/              # Form transaksi, budget, dompet, kategori
│   │   └── ui/                 # Button, Card, Input, FAB, Skeleton, SuccessAnimation, dll
│   ├── constants/              # Tema (dark mode), kategori default, dompet default
│   ├── features/               # Modul fitur
│   │   ├── recurring/          # Engine transaksi berulang
│   │   ├── insights/           # Spending insights, financial literacy engine & card
│   │   ├── export/             # Generator PDF, Excel, dan backup/restore JSON
│   │   └── notifications/      # Kalender sync & budget reminder
│   ├── lib/                    # SQLite schema, migration, seed, query classes
│   ├── types/                  # Definisi tipe TypeScript global
│   └── utils/                  # Format Rupiah, haptic feedback, utilitas lainnya
├── assets/                     # Gambar, icon, dan font statis
├── app.json                    # Konfigurasi Expo aplikasi
├── eas.json                    # Konfigurasi EAS Build
├── package.json                # Dependensi dan script NPM
└── tsconfig.json               # Konfigurasi TypeScript
```

---

## 🚧 Fitur yang Akan Datang (Roadmap)

Berikut fitur-fitur yang sedang direncanakan untuk pengembangan selanjutnya:

- 💱 **Multi Mata Uang** — dukung mata uang selain IDR dengan kurs dinamis
- 💳 **Pencatatan Utang/Piutang (Debt Tracking)** — catat siapa yang berutang atau memberi utang
- 📊 **Split Transaksi** — satu transaksi dibagi ke beberapa kategori
- 🔄 **Budget Rollover** — sisa anggaran bulan lalu otomatis ditambahkan ke bulan ini
- ☁️ **Backup Cloud (iCloud/Google Drive)** — sinkronisasi cadangan otomatis
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
