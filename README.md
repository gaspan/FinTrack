# 💸 FinTrack - Personal Finance Manager

![Expo](https://img.shields.io/badge/Expo-1C1E24?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

FinTrack adalah aplikasi pencatat keuangan pribadi modern dan kaya fitur yang dibangun menggunakan **React Native (Expo SDK 57)**. Aplikasi ini dirancang beroperasi secara *offline-first* dengan database lokal (SQLite) untuk memastikan privasi data, kecepatan, dan ketersediaan tanpa bergantung pada koneksi internet.

Hadir dengan desain antarmuka (UI) gelap (Dark Mode) yang elegan, bersih, dan memanjakan mata, memberikan pengalaman pengguna kelas premium saat mengelola arus kas harian Anda.

---

## ✨ Fitur Utama

- **📊 Dashboard Interaktif**: Pantau total saldo, arus kas masuk/keluar, dan tren keuangan Anda dalam satu layar.
- **📈 Visualisasi Data (Charts)**: Analisis pengeluaran dan pemasukan dengan mudah melalui *Donut Chart* dan *Bar Chart* yang cantik dan interaktif.
- **👛 Multi-Dompet (Wallets)**: Kelola berbagai sumber dana seperti Uang Tunai, Rekening Bank (BCA, Mandiri), dan E-Wallet (OVO, GoPay) dengan saldo yang terpisah.
- **🎯 Manajemen Anggaran (Budgeting)**: Cegah pemborosan dengan mengatur batas anggaran bulanan per kategori. Dilengkapi dengan *progress bar* visual.
- **📝 Pencatatan Cepat**: Tambah transaksi pemasukan atau pengeluaran hanya dalam beberapa ketukan. Mendukung auto-format mata uang (Rupiah).
- **📂 Ekspor Laporan**: Ekspor seluruh data transaksi Anda ke format Excel (`.xlsx`) untuk analisis lebih mendalam atau keperluan backup.
- **🔒 Offline & Privat**: Seluruh data disimpan langsung di memori perangkat Anda menggunakan SQLite. Tidak ada data yang dikirim ke server eksternal.

---

## 📱 Tampilan Layar (Screenshots)

*(Silakan ganti tautan di bawah ini dengan screenshot aplikasi Anda yang sebenarnya)*

| Dashboard | Riwayat Transaksi | Anggaran (Budget) | Pengaturan Dompet |
| :---: | :---: | :---: | :---: |
| <img src="https://via.placeholder.com/250x500.png?text=Dashboard" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Transaksi" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Budget" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Settings" width="200"/> |

---

## 🛠️ Teknologi yang Digunakan

* **Framework**: React Native & Expo SDK 57
* **Routing**: Expo Router (File-based routing)
* **Bahasa**: TypeScript
* **Database**: `expo-sqlite` (Lokal Database)
* **Visualisasi Data**: `react-native-gifted-charts`
* **Manajemen Tanggal**: `dayjs`
* **Animasi**: `react-native-reanimated`
* **Ekspor Data**: `xlsx`

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
│   ├── app/             # Konfigurasi routing (Expo Router) dan layar tab
│   ├── components/      # Komponen UI yang dapat digunakan ulang (Forms, Charts, dll)
│   ├── constants/       # Konfigurasi konstanta, tema (colors, spacing, typography)
│   ├── lib/             # Konfigurasi SQLite dan sistem query (database)
│   ├── types/           # Definisi tipe TypeScript global
│   └── utils/           # Fungsi utilitas bantuan (seperti formatRupiah)
├── assets/              # Gambar, icon, dan font statis
├── app.json             # Konfigurasi Expo aplikasi
├── package.json         # Dependensi dan script NPM
└── tsconfig.json        # Konfigurasi TypeScript
```

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
