export interface JourneyChoice {
  label: string;
  cash: number;
  aset: number;
  utang: number;
  bahagia: number;
  poin: number;
  note: string;
}

export interface JourneyEvent {
  id: string;
  stage: number;
  age: string;
  title: string;
  desc: string;
  a: JourneyChoice;
  b: JourneyChoice;
  /** Pilihan ketiga opsional untuk dilema 3 arah */
  c?: JourneyChoice;
  /** Event boss: taruhan besar, bonus poin 1.5x, border khusus */
  isBoss?: boolean;
}

export interface LifeStage {
  stage: number;
  name: string;
  icon: string;
  color: string;
  ages: string;
  /** Pemasukan otomatis (gaji terkumpul) saat memasuki babak */
  income: number;
  desc: string;
}

export interface JourneyBackground {
  id: string;
  name: string;
  icon: string;
  cash: number;
  aset: number;
  utang: number;
  bahagia: number;
  desc: string;
}

export interface JourneyEnding {
  id: string;
  rank: number; // 0-5
  title: string;
  desc: string;
  icon: string;
  minNetWorth: number;
}

export const LIFE_STAGES: LifeStage[] = [
  { stage: 1, name: 'Kuliah & Awal Karier', icon: '🌱', color: '#22C55E', ages: '18–22', income: 20000000, desc: 'Pemasukan 4 tahun: +Rp20jt' },
  { stage: 2, name: 'Karier Muda', icon: '⚡', color: '#3B82F6', ages: '23–30', income: 150000000, desc: 'Pemasukan 8 tahun: +Rp150jt' },
  { stage: 3, name: 'Keluarga & Aset', icon: '🏠', color: '#F59E0B', ages: '31–40', income: 400000000, desc: 'Pemasukan 10 tahun: +Rp400jt' },
  { stage: 4, name: 'Puncak Karier', icon: '📈', color: '#EF4444', ages: '41–55', income: 800000000, desc: 'Pemasukan 15 tahun: +Rp800jt' },
  { stage: 5, name: 'Pra-Pensiun', icon: '🌅', color: '#8B5CF6', ages: '56–60', income: 300000000, desc: 'Pemasukan 5 tahun: +Rp300jt' },
];

export const JOURNEY_BACKGROUNDS: JourneyBackground[] = [
  { id: 'rantau', name: 'Anak Rantau', icon: '🎒', cash: 2000000, aset: 0, utang: 0, bahagia: 70, desc: 'Modal nekat + doa ibu. Mulai dari kos sempit.' },
  { id: 'freshgrad', name: 'Fresh Graduate', icon: '🎓', cash: 5000000, aset: 1000000, utang: 0, bahagia: 75, desc: 'Ijazah + tabungan magang. Start sedikit aman.' },
  { id: 'warung', name: 'Pewaris Warung', icon: '🏪', cash: 3000000, aset: 50000000, utang: 10000000, bahagia: 65, desc: 'Warisan warung keluarga + cicilan modalnya.' },
  { id: 'sultan_merosot', name: 'Anak Sultan Merosot', icon: '🎩', cash: 15000000, aset: 150000000, utang: 100000000, bahagia: 60, desc: 'Lahir berkecukupan tapi manja. Buktikan bisa mandiri.' },
  { id: 'nomad', name: 'Freelancer Digital', icon: '💻', cash: 8000000, aset: 5000000, utang: 0, bahagia: 80, desc: 'Kerja dari kafe, income tak pasti tapi bebas.' },
  { id: 'honorer', name: 'Guru Honorer', icon: '📚', cash: 1000000, aset: 0, utang: 5000000, bahagia: 75, desc: 'Gaji kecil, hati besar. Mode hard sejak lahir.' },
];

export const JOURNEY_EVENTS: JourneyEvent[] = [
  // ─── Babak 1 (18-22) ───
  {
    id: 'j1_kuliah', stage: 1, age: '18 thn', title: 'Kuliah di Mana?',
    desc: 'Kamu lulus SMA. Kampus negeri (beasiswa, jauh) atau swasta favorit (dekat, mahal)?',
    a: { label: 'Beasiswa kampus negeri', cash: 5000000, aset: 0, utang: 0, bahagia: -5, poin: 120, note: 'Beasiswa + kerja sampingan = lulus tanpa utang. Fondasi terbaik.' },
    b: { label: 'Swasta favorit pakai utang', cash: 0, aset: 0, utang: 120000000, bahagia: 5, poin: 40, note: 'Gengsi kampus mahal + utang 120jt. Karier belum mulai, beban sudah ada.' },
  },
  {
    id: 'j1_kos', stage: 1, age: '19 thn', title: 'Tinggal di Mana?',
    desc: 'Kos sederhana Rp500rb/bulan atau apartemen sharing Rp1,5jt/bulan dekat kampus?',
    a: { label: 'Kos sederhana', cash: -12000000, aset: 0, utang: 0, bahagia: 0, poin: 120, note: 'Hemat tempat tinggal 4 tahun = puluhan juta selamat.' },
    b: { label: 'Apartemen biar nyaman', cash: -36000000, aset: 0, utang: 0, bahagia: 5, poin: 40, note: 'Nyaman 4 tahun, tapi selisih 24jt melayang.' },
  },
  {
    id: 'j1_parttime', stage: 1, age: '21 thn', title: 'Kerja Sampingan?',
    desc: 'Tawaran jadi barista part-time. Gaji lumayan tapi waktu nongkrong berkurang.',
    a: { label: 'Ambil part-time', cash: 18000000, aset: 0, utang: 0, bahagia: -5, poin: 120, note: '+18jt + pengalaman kerja. CV-mu bersinar saat lulus.' },
    b: { label: 'Fokus nongkrong dulu', cash: -10000000, aset: 0, utang: 0, bahagia: 10, poin: 40, note: 'Bahagia sesaat, dompet -10jt, pengalaman nol.' },
  },
  {
    id: 'j1_laptop', stage: 1, age: '20 thn', title: 'Laptop Ngadat',
    desc: 'Laptop tugas akhir lemot parah. Servis + SSD Rp1,5jt atau laptop baru kredit Rp12jt?',
    a: { label: 'Upgrade SSD + servis', cash: -1500000, aset: 0, utang: 0, bahagia: 0, poin: 120, note: 'Fungsi pulih 90% dengan 1/8 harga baru. Cerdas!' },
    b: { label: 'Kredit laptop baru', cash: -3000000, aset: 0, utang: 12000000, bahagia: 8, poin: 40, note: 'Baru + cepat, tapi cicilan 12jt mengikat 2 tahun.' },
    c: { label: 'Pinjam lab kampus', cash: 0, aset: 0, utang: 0, bahagia: -5, poin: 100, note: 'Gratis tapi antre. Disiplin jadwal = dompet selamat total.' },
  },
  {
    id: 'j1_jualan', stage: 1, age: '22 thn', title: 'Jualan Online?', isBoss: true,
    desc: 'Teman ajak jualan thrift + jadi reseller. Butuh modal Rp2jt. Berani?',
    a: { label: 'Gas, modal 2jt', cash: -2000000, aset: 8000000, utang: 0, bahagia: 0, poin: 130, note: 'BOSS: mental pengusaha! Modal 2jt jadi aset + pengalaman dagang.' },
    b: { label: 'Takut rugi, skip', cash: 0, aset: 0, utang: 0, bahagia: 0, poin: 50, note: 'Aman tapi nol belajar. Peluang hilang begitu saja.' },
  },
  // ─── Babak 2 (23-30) ───
  {
    id: 'j2_kerja', stage: 2, age: '23 thn', title: 'Kerja Pertama',
    desc: 'Korporat gaji Rp8jt (stabil) atau startup gaji Rp12jt (lembur + gaya hidup naik)?',
    a: { label: 'Korporat, nabung 30%', cash: 40000000, aset: 60000000, utang: 0, bahagia: 0, poin: 120, note: 'Gaji boleh kecil, yang penting porsi nabungnya besar.' },
    b: { label: 'Startup gaji besar', cash: -20000000, aset: 0, utang: 0, bahagia: 10, poin: 60, note: 'Gaji naik tapi lifestyle ikut naik lebih cepat. Tabungan malah minus.' },
  },
  {
    id: 'j2_motor', stage: 2, age: '25 thn', title: 'Kendaraan Pertama',
    desc: 'Butuh motor. Bekas Rp15jt cash atau baru Rp28jt kredit 3 tahun?',
    a: { label: 'Motor bekas cash', cash: -15000000, aset: 0, utang: 0, bahagia: 0, poin: 120, note: 'Tanpa cicilan = tanpa beban. Motor bekas sehat sama fungsinya.' },
    b: { label: 'Motor baru kredit', cash: -8000000, aset: 0, utang: 35000000, bahagia: 5, poin: 40, note: 'Gengsi naik, cicilan 3 tahun + bunga mengikat. Total bayar jauh lebih mahal.' },
  },
  {
    id: 'j2_invest', stage: 2, age: '28 thn', title: 'Investasi Pertama',
    desc: 'Teman ajak "crypto pasti 100%/bulan". Atau mulai reksadana rutin yang membosankan?',
    a: { label: 'Reksadana rutin', cash: -24000000, aset: 30000000, utang: 0, bahagia: 0, poin: 120, note: 'Membosankan tapi compounding bekerja. +30jt aset.' },
    b: { label: 'Ikut crypto teman', cash: -20000000, aset: 0, utang: 0, bahagia: 0, poin: 40, note: 'RIP. Pasti untung = pasti bodong. -20jt hilang.' },
  },
  {
    id: 'j2_ngekos', stage: 2, age: '24 thn', title: 'Ngekos di Kota Besar',
    desc: 'Kerja di Jakarta. Kos 1jt/bulan (komunal, jauh) atau apart sharing 3jt/bulan (dekat kantor)?',
    a: { label: 'Kos 1jt + KRL', cash: -24000000, aset: 0, utang: 0, bahagia: -5, poin: 120, note: '2 tahun hemat 48jt vs apart. Capek di jalan, kaya di tabungan.' },
    b: { label: 'Apart biar dekat', cash: -72000000, aset: 0, utang: 0, bahagia: 8, poin: 50, note: 'Nyaman + hemat waktu, tapi selisih 48jt melayang 2 tahun.' },
    c: { label: 'Kos 1,5jt tengah-tengah', cash: -36000000, aset: 0, utang: 0, bahagia: 0, poin: 100, note: 'Kompromi sehat: hemat + waras. Jalan tengah sering menang.' },
  },
  {
    id: 'j2_darurat', stage: 2, age: '30 thn', title: 'Dana Darurat Pertama 💰', isBoss: true,
    desc: 'Gaji sudah stabil 3 tahun tapi tabungan nol. Target dana darurat 30jt. Gas?',
    a: { label: 'Auto-debet 1,5jt/bln', cash: -18000000, aset: 30000000, utang: 0, bahagia: 0, poin: 130, note: 'BOSS: 12 bulan disiplin = tameng hidup. Aset +30jt.' },
    b: { label: 'Nanti saja, masih muda', cash: -15000000, aset: 0, utang: 0, bahagia: 5, poin: 40, note: 'Tanpa tameng, satu musibah = utang. -15jt hilang sia-sia.' },
  },
  // ─── Babak 3 (31-40) ───
  {
    id: 'j3_nikah', stage: 3, age: '31 thn', title: 'Menikah',
    desc: 'Akad + syukuran sederhana Rp50jt atau gedung mewah Rp150jt (120jt pakai utang)?',
    a: { label: 'Sederhana & khidmat', cash: -50000000, aset: 0, utang: 0, bahagia: 10, poin: 120, note: 'Sehari bahagia tanpa utang bertahun-tahun. Pilihan dewasa.' },
    b: { label: 'Gedung mewah', cash: -30000000, aset: 0, utang: 150000000, bahagia: 15, poin: 40, note: 'Pesta sehari, cicilan 7 tahun. Tamu lupa, utang tetap ingat.' },
  },
  {
    id: 'j3_rumah', stage: 3, age: '34 thn', title: 'Rumah Pertama', isBoss: true,
    desc: 'KPR rumah pinggiran (DP 50jt, utang 350jt) yang nilainya naik, atau ngontrak santai?',
    a: { label: 'KPR rumah', cash: -50000000, aset: 600000000, utang: 350000000, bahagia: 5, poin: 120, note: 'Properti naik + cicilan = paksa nabung. Aset +600jt.' },
    b: { label: 'Ngontrak saja', cash: -150000000, aset: 0, utang: 0, bahagia: 5, poin: 60, note: 'Fleksibel, tapi 10 tahun kontrakan = 150jt hilang tanpa aset.' },
  },
  {
    id: 'j3_anak', stage: 3, age: '37 thn', title: 'Anak Pertama Lahir!',
    desc: 'Si kecil lahir sehat. Siapkan asuransi + dana pendidikan atau nanti saja?',
    a: { label: 'Asuransi + dana pendidikan', cash: -30000000, aset: 40000000, utang: 0, bahagia: 5, poin: 120, note: 'Proteksi + tabungan pendidikan sejak dini. Tenang 18 tahun ke depan.' },
    b: { label: 'Nanti saja, masih kecil', cash: -40000000, aset: 0, utang: 0, bahagia: 5, poin: 60, note: 'Tanpa persiapan, biaya tak terduga anak menghantam 40jt sekaligus.' },
  },
  {
    id: 'j3_mobil', stage: 3, age: '35 thn', title: 'Mobil Keluarga?',
    desc: 'Anak butuh antar-jemput. LCGC bekas 80jt cash atau SUV baru 300jt (DP 50jt + utang 250jt)?',
    a: { label: 'LCGC bekas cash', cash: -80000000, aset: 80000000, utang: 0, bahagia: 0, poin: 120, note: 'Fungsi sama, tanpa cicilan. Mobil = beban, bukan aset.' },
    b: { label: 'SUV baru kredit', cash: -50000000, aset: 300000000, utang: 250000000, bahagia: 10, poin: 50, note: 'Gagah 3 tahun, cicilan 7 tahun + depresiasi brutal.' },
  },
  {
    id: 'j3_franchise', stage: 3, age: '39 thn', title: 'Tawaran Franchise 🍜', isBoss: true,
    desc: 'Kenalan tawarkan franchise minuman modal 100jt, katanya balik modal 18 bulan. Ambil?',
    a: { label: 'Riset + ambil 1 gerobak', cash: -100000000, aset: 150000000, utang: 0, bahagia: 0, poin: 130, note: 'BOSS: diversifikasi income! Riset lokasi = aset produktif +150jt.' },
    b: { label: 'All-in 3 cabang + utang', cash: -100000000, aset: 200000000, utang: 200000000, bahagia: -5, poin: 50, note: 'Serakah tanpa pengalaman. 3 cabang boncos = utang 200jt.' },
    c: { label: 'Tolak, fokus karier', cash: 0, aset: 20000000, utang: 0, bahagia: 0, poin: 90, note: 'Fokus juga strategi. Karier naik = income naik aman.' },
  },
  // ─── Babak 4 (41-55) ───
  {
    id: 'j4_phk', stage: 4, age: '43 thn', title: 'Kena PHK!', isBoss: true,
    desc: 'Restrukturisasi! Pesangon cair tapi gaji bulanan hilang. Apa langkahmu?',
    a: { label: 'Freelance + dana darurat', cash: -40000000, aset: 20000000, utang: 0, bahagia: -5, poin: 120, note: 'Dana darurat yang dulu disiapkan kini menyelamatkanmu.' },
    b: { label: 'Tarik investasi, gaya tetap', cash: -50000000, aset: 0, utang: 150000000, bahagia: -10, poin: 40, note: 'Gaya hidup tak turun, gali lubang tutup lubang. Utang +150jt.' },
  },
  {
    id: 'j4_sekolah', stage: 4, age: '47 thn', title: 'Biaya Sekolah Anak',
    desc: 'Anak masuk SMP. Negeri favorit + les (60jt) atau internasional bergengsi (250jt, 150jt utang)?',
    a: { label: 'Negeri + les privat', cash: -60000000, aset: 0, utang: 0, bahagia: 0, poin: 120, note: 'Kualitas tak selalu soal harga. -60jt, utang nol.' },
    b: { label: 'Internasional bergengsi', cash: -100000000, aset: 0, utang: 250000000, bahagia: 5, poin: 40, note: 'Gengsi orang tua, beban 250jt. Anak stres, dompet stres.' },
  },
  {
    id: 'j4_saham', stage: 4, age: '52 thn', title: 'Modal Besar Terakhir',
    desc: 'Ada dana menganggur besar. Diversifikasi reksadana indeks atau all-in saham gorengan?',
    a: { label: 'Diversifikasi indeks', cash: 0, aset: 800000000, utang: 0, bahagia: 0, poin: 120, note: 'Di usia 50+, preservasi modal > spekulasi. Aset +800jt.' },
    b: { label: 'All-in saham gorengan', cash: 0, aset: 0, utang: 300000000, bahagia: -5, poin: 40, note: 'Nekat pakai utang untuk average down. Margin call: -300jt dan susah kembali.' },
  },
  {
    id: 'j4_ortu', stage: 4, age: '45 thn', title: 'Orang Tua Sakit 🏥', isBoss: true,
    desc: 'Ibu butuh operasi 80jt. BPJS + tabungan kesehatanmu cukup, atau bawa ke RS premium pakai utang?',
    a: { label: 'BPJS + dana siap', cash: -20000000, aset: 0, utang: 0, bahagia: 0, poin: 130, note: 'BOSS: persiapan 20 tahun terbayar. Ibu sembuh, dompet selamat.' },
    b: { label: 'RS premium + utang', cash: -30000000, aset: 0, utang: 100000000, bahagia: -5, poin: 50, note: 'Sayang boleh, tapi tanpa dana = utang 100jt. Cinta + rencana > panik.' },
  },
  {
    id: 'j4_mentor', stage: 4, age: '50 thn', title: 'Jadi Konsultan Sampingan',
    desc: 'Junior tawarkan proyek konsultasi 60jt/tahun, butuh 5 jam/minggu. Ambil di tengah karier puncak?',
    a: { label: 'Ambil, bagi waktu', cash: 60000000, aset: 100000000, utang: 0, bahagia: -5, poin: 120, note: 'Personal branding = income kedua + aset ilmu +100jt.' },
    b: { label: 'Tolak, jaga santai', cash: 0, aset: 0, utang: 0, bahagia: 5, poin: 70, note: 'Istirahat juga aset. Tapi income segitu lumayan untuk pensiun.' },
    c: { label: 'Ambil + rekrut asisten', cash: 30000000, aset: 150000000, utang: 0, bahagia: 0, poin: 125, note: 'Scale up! Delegasi = income + aset tanpa burnout.' },
  },
  // ─── Babak 5 (56-60) ───
  {
    id: 'j5_pensiun', stage: 5, age: '56 thn', title: 'Siapkan Pensiun',
    desc: '5 tahun menuju pensiun. Masukkan ke DPLK + deposito atau andalkan anak nanti?',
    a: { label: 'DPLK + deposito', cash: -100000000, aset: 500000000, utang: 0, bahagia: 0, poin: 120, note: 'Pensiun mandiri = pensiun bermartabat. Aset +500jt.' },
    b: { label: 'Andalkan anak saja', cash: 0, aset: 0, utang: 0, bahagia: -5, poin: 40, note: 'Anak bukan dana pensiun. Jangan wariskan beban.' },
  },
  {
    id: 'j5_sehat', stage: 5, age: '58 thn', title: 'Kesehatan Menurun',
    desc: 'Kolesterol tinggi. Medical checkup rutin + BPJS atau abaikan sampai tumbang?',
    a: { label: 'Checkup + jaga pola', cash: -15000000, aset: 0, utang: 0, bahagia: 5, poin: 120, note: 'Sehat itu aset termahal. Mencegah jauh lebih murah.' },
    b: { label: 'Abaikan, masih kuat', cash: -80000000, aset: 0, utang: 0, bahagia: -15, poin: 40, note: 'Stroke ringan, opname 2 minggu. -80jt + bahagia anjlok.' },
  },
  {
    id: 'j5_warisan', stage: 5, age: '60 thn', title: 'Warisan & Wasiat',
    desc: 'Pensiun tiba! Rapikan hibah + wasiat untuk anak atau habiskan keliling dunia?',
    a: { label: 'Wasiat rapi untuk anak', cash: -20000000, aset: 0, utang: 0, bahagia: 10, poin: 120, note: 'Warisan terbaik: aset rapi + anak mandiri. Hati tenang.' },
    b: { label: 'Keliling dunia dulu', cash: -150000000, aset: 0, utang: 150000000, bahagia: 15, poin: 80, note: 'Bahagia maksimal pakai kartu kredit. YOLO yang mahal.' },
  },
  {
    id: 'j5_cucu', stage: 5, age: '57 thn', title: 'Cucu Pertama Lahir 👶',
    desc: 'Anakmu punya bayi! Bantu dana pendidikan cucu 50jt atau titip doa saja?',
    a: { label: 'Tabungan cucu 50jt', cash: -50000000, aset: 80000000, utang: 0, bahagia: 10, poin: 125, note: 'Compounding 20 tahun untuk cucu = kado termahal. +bahagia besar.' },
    b: { label: 'Doa + jaga cucu', cash: 0, aset: 0, utang: 0, bahagia: 8, poin: 90, note: 'Waktu > uang di usia ini. Kehadiranmu tak ternilai.' },
  },
  {
    id: 'j5_kopi', stage: 5, age: '59 thn', title: 'Warung Kopi Pensiun ☕', isBoss: true,
    desc: 'BOSS FINAL: buka warung kopi kecil modal 80jt (pasif + komunitas) atau deposito saja?',
    a: { label: 'Buka warung kopi', cash: -80000000, aset: 200000000, utang: 0, bahagia: 10, poin: 135, note: 'BOSS FINAL: pensiun aktif + income + komunitas. Aset +200jt.' },
    b: { label: 'Deposito aman', cash: -80000000, aset: 100000000, utang: 0, bahagia: 0, poin: 110, note: 'Aman 100%. Tenang tanpa ribet operasional.' },
    c: { label: 'Saham gorengan all-in', cash: -80000000, aset: 0, utang: 200000000, bahagia: -10, poin: 30, note: 'Di ujung pensiun main api pakai utang. Jangan!' },
  },
];

/** Event acak: diambil 3 per run, disisipkan setelah babak 1-3 */
export const JOURNEY_RANDOM_EVENTS: JourneyEvent[] = [
  {
    id: 'r_bonus', stage: 0, age: 'Bonus', title: 'Bonus Tahunan Cair!',
    desc: 'Bonus Rp25jt masuk. Tabung atau healing ke Bali?',
    a: { label: 'Tabung semua', cash: 0, aset: 25000000, utang: 0, bahagia: 0, poin: 120, note: 'Bonus = akselerator aset, bukan rezeki jajan.' },
    b: { label: 'Healing ke Bali', cash: 10000000, aset: 0, utang: 0, bahagia: 10, poin: 80, note: 'Sisa 10jt setelah healing. Self-reward wajar, asal dicatat.' },
  },
  {
    id: 'r_teman', stage: 0, age: 'Cobaan', title: 'Teman Pinjam Uang',
    desc: 'Sahabat pinjam Rp10jt, janji kembali 3 bulan. Katanya untuk modal usaha.',
    a: { label: 'Pinjamkan', cash: -10000000, aset: 0, utang: 0, bahagia: 0, poin: 60, note: 'Uang kembali? 50:50. Aturan aman: pinjamkan hanya yang rela hilang.' },
    b: { label: 'Tolak halus', cash: 0, aset: 0, utang: 0, bahagia: -5, poin: 100, note: 'Canggung sesaat, dompet selamat. Tawarkan bantuan non-uang.' },
  },
  {
    id: 'r_hp', stage: 0, age: 'Apes', title: 'HP Mati Total',
    desc: 'HP andalan matot. Servis Rp2jt atau baru Rp15jt (DP 3jt + cicilan)?',
    a: { label: 'Servis saja', cash: -2000000, aset: 0, utang: 0, bahagia: 0, poin: 120, note: 'Fungsi > gengsi. -2jt beres.' },
    b: { label: 'Baru, kredit saja', cash: -3000000, aset: 0, utang: 12000000, bahagia: 5, poin: 40, note: 'HP baru, cicilan baru. Total bayar 2x lipat.' },
  },
  {
    id: 'r_kondangan', stage: 0, age: 'Musim Nikah', title: '5 Undangan Sebulan',
    desc: 'Lima teman nikah bulan ini. Amplop wajar atau gengsi?',
    a: { label: 'Amplop wajar', cash: -1000000, aset: 0, utang: 0, bahagia: 0, poin: 100, note: 'Silaturahmi lunas tanpa jebol. Ikhlas > nominal.' },
    b: { label: 'Gengsi 1jt/amplop', cash: -5000000, aset: 0, utang: 0, bahagia: 0, poin: 50, note: '-5jt sebulan demi gengsi. Tamu bahkan tak ingat nominalmu.' },
  },
  {
    id: 'r_arisan', stage: 0, age: 'Lingkungan', title: 'Diajak Arisan',
    desc: 'Tetangga ajak arisan Rp5jt/bulan. Ikut (paksa nabung) atau tolak?',
    a: { label: 'Ikut arisan', cash: -5000000, aset: 5000000, utang: 0, bahagia: 0, poin: 100, note: 'Arisan = tabungan paksa bersosialisasi. Netral, asal amanah.' },
    b: { label: 'Tolak, nabung sendiri', cash: 0, aset: 0, utang: 0, bahagia: 0, poin: 80, note: 'Disiplin sendiri lebih fleksibel — kalau benar-benar disiplin.' },
  },
  {
    id: 'r_bengkel', stage: 0, age: 'Apes', title: 'Motor Ngadat',
    desc: 'Suara mesin kasar. Servis resmi Rp3jt atau tunda sampai gajian?',
    a: { label: 'Servis sekarang', cash: -3000000, aset: 0, utang: 0, bahagia: 0, poin: 120, note: 'Masalah kecil Rp3jt beats turun mesin Rp8jt.' },
    b: { label: 'Tunda dulu', cash: -8000000, aset: 0, utang: 0, bahagia: -5, poin: 40, note: 'Jebol di jalan. Derek + turun mesin -8jt.' },
  },
  {
    id: 'r_fomo', stage: 0, age: 'Godaan', title: 'Konser Idola',
    desc: 'Idola masa kecil konser perpisahan. Tiket Rp4jt, sekali seumur hidup!',
    a: { label: 'Skip, nonton YouTube', cash: 0, aset: 0, utang: 0, bahagia: 0, poin: 110, note: 'FOMO berlalu, tabungan abadi. Pengalaman bisa dicari yang gratis.' },
    b: { label: 'Beli, mumpung ada', cash: -4000000, aset: 0, utang: 0, bahagia: 5, poin: 60, note: 'Kenangan indah -4jt. Wajar sesekali, asal bukan tiap bulan.' },
  },
  {
    id: 'r_freelance', stage: 0, age: 'Rezeki', title: 'Project Sampingan',
    desc: 'Kenalan tawarkan project Rp15jt, deadline mepet 2 minggu lembur.',
    a: { label: 'Ambil projectnya', cash: 15000000, aset: 0, utang: 0, bahagia: -5, poin: 120, note: '+15jt! 2 minggu sibuk terbayar lunas.' },
    b: { label: 'Tolak, jaga santai', cash: 0, aset: 0, utang: 0, bahagia: 5, poin: 70, note: 'Waktu luang terjaga. Kadang istirahat juga investasi.' },
  },
  {
    id: 'r_sakit', stage: 0, age: 'Apes', title: 'Kena Tipes',
    desc: 'Demam seminggu, diduga tipes. Puskesmas/BPJS atau RS swasta cepat?',
    a: { label: 'BPJS, antre sedikit', cash: -1000000, aset: 0, utang: 0, bahagia: -5, poin: 120, note: 'Iuran BPJS yang rutin akhirnya kembali. -1jt saja.' },
    b: { label: 'RS swasta langsung', cash: -8000000, aset: 0, utang: 0, bahagia: 0, poin: 60, note: 'Cepat sembuh, -8jt. Darurat boleh, tapi BPJS tetap utama.' },
  },
  {
    id: 'r_thr', stage: 0, age: 'Berkah', title: 'THR Cair!',
    desc: 'THR Rp12jt cair. Untuk kebutuhan atau gadget baru yang "diskon"?',
    a: { label: 'Untuk kebutuhan', cash: 12000000, aset: 0, utang: 0, bahagia: 0, poin: 120, note: 'THR = gaji ke-13 untuk kebutuhan, bukan bonus jajan.' },
    b: { label: 'Gadget diskon 50%', cash: -12000000, aset: 0, utang: 0, bahagia: 10, poin: 50, note: 'THR 12jt habis + nombok 12jt. Diskon tetap keluar uang.' },
  },
  {
    id: 'r_naik_gaji', stage: 0, age: 'Rezeki', title: 'Gaji Naik 10%!',
    desc: 'Atasan naikkan gaji Rp1jt/bulan. Selisihnya ditabung atau lifestyle naik?',
    a: { label: 'Tabung selisihnya', cash: 0, aset: 12000000, utang: 0, bahagia: 0, poin: 125, note: 'Hindari lifestyle inflation. Naik gaji = naik tabungan.' },
    b: { label: 'Upgrade kos + jajan', cash: -12000000, aset: 0, utang: 0, bahagia: 8, poin: 45, note: 'Gaji naik, tabungan tetap nol.Classic trap.' },
  },
  {
    id: 'r_banjir', stage: 0, age: 'Musibah', title: 'Kos Kebanjiran',
    desc: 'Hujan 3 hari, kos banjir selutut. Laptop + kasur rusak Rp5jt. Punya dana darurat?',
    a: { label: 'Pakai dana darurat', cash: -5000000, aset: 0, utang: 0, bahagia: -5, poin: 115, note: 'Inilah gunanya dana darurat. Tanpa utang, tidur tenang.' },
    b: { label: 'Paylater + cicilan', cash: 0, aset: 0, utang: 7000000, bahagia: -10, poin: 40, note: 'Musibah + bunga paylater = double kill. -7jt utang.' },
  },
  {
    id: 'r_jastip', stage: 0, age: 'Cuan', title: 'Tawaran Jastip',
    desc: 'Teman titip beli 10 pasang sepatu diskon, fee Rp2jt. Ribet tapi cuan.',
    a: { label: 'Gas jastip', cash: 2000000, aset: 0, utang: 0, bahagia: -3, poin: 110, note: '+2jt fee. Side hustle kecil = skill dagang besar.' },
    b: { label: 'Mager, tolak', cash: 0, aset: 0, utang: 0, bahagia: 0, poin: 70, note: 'Santai terjaga, cuan lewat.' },
  },
  {
    id: 'r_sepatu', stage: 0, age: 'Apes', title: 'Sepatu Jebol',
    desc: 'Sol sepatu kerja jebol pas mau interview. Sol ulang Rp50rb atau baru Rp800rb?',
    a: { label: 'Sol ulang', cash: -50000, aset: 0, utang: 0, bahagia: 0, poin: 115, note: 'Tukang sol = pahlawan dompet. -50rb beres.' },
    b: { label: 'Beli baru branded', cash: -800000, aset: 0, utang: 0, bahagia: 5, poin: 55, note: 'PD naik, dompet -800rb. Interview belum tentu lolos.' },
  },
  {
    id: 'r_gym', stage: 0, age: 'Godaan', title: 'Promo Gym Setahun',
    desc: 'Gym buka promo Rp3jt/tahun (normal 6jt). Daftar atau lari gratis di GBK?',
    a: { label: 'Lari gratis + push-up', cash: 0, aset: 0, utang: 0, bahagia: 3, poin: 115, note: 'Sehat tak harus mahal. Konsisten > fasilitas.' },
    b: { label: 'Daftar setahun', cash: -3000000, aset: 0, utang: 0, bahagia: 5, poin: 60, note: 'Semangat Januari, mangkir Februari. -3jt jadi donatur gym.' },
  },
  {
    id: 'r_kirim_ibu', stage: 0, age: 'Sayang', title: 'Kiriman Ibu ❤️',
    desc: 'Ibu kirim Rp1jt + rendang sekilo. Tabung atau traktir teman kos?',
    a: { label: 'Tabung 1jt, makan rendang', cash: 1000000, aset: 0, utang: 0, bahagia: 5, poin: 120, note: 'Rezeki ibu = berkah. Ditabung + dinikmati, bahagia dobel.' },
    b: { label: 'Traktir teman semua', cash: -500000, aset: 0, utang: 0, bahagia: 10, poin: 70, note: 'Dermawan sih, tapi uang ibu habis + nombok 500rb.' },
  },
  {
    id: 'r_scam', stage: 0, age: 'Waspada', title: 'WA "Mama Minta Pulsa"',
    desc: 'Nomor tak dikenal ngaku mama, minta transfer Rp2jt buru-buru. Gimana?',
    a: { label: 'Cek + abaikan, blokir', cash: 0, aset: 0, utang: 0, bahagia: 0, poin: 130, note: 'Modus klasik! Verifikasi dulu = 2jt selamat.' },
    b: { label: 'Transfer buru-buru', cash: -2000000, aset: 0, utang: 0, bahagia: -10, poin: 20, note: 'Kena scam. Panik = ladang penipu.' },
    c: { label: 'Telpon mama asli dulu', cash: 0, aset: 0, utang: 0, bahagia: 0, poin: 125, note: 'SOP anti-scam: telpon balik nomor asli. Aman + edukasi keluarga.' },
  },
  {
    id: 'r_limit_paylater', stage: 0, age: 'Godaan', title: 'Limit Paylater Naik!',
    desc: 'Aplikasi naikkan limitmu jadi Rp10jt + voucher. Gas belanja?',
    a: { label: 'Abaikan, limit = jebakan', cash: 0, aset: 0, utang: 0, bahagia: 0, poin: 120, note: 'Limit besar bukan rezeki. Menolak = menang.' },
    b: { label: 'Gas checkout 5jt', cash: 0, aset: 0, utang: 5000000, bahagia: 5, poin: 35, note: 'Voucher 200rb, utang 5jt + bunga. Salah hitung!' },
  },
  {
    id: 'r_donor', stage: 0, age: 'Kebaikan', title: 'Donor Darah + Bansos',
    desc: 'PMI buka donor di kantor. Ikut (dapat snack + cek kesehatan gratis) atau mager?',
    a: { label: 'Ikut donor', cash: 0, aset: 0, utang: 0, bahagia: 8, poin: 110, note: 'Sehat + cek tensi/HB gratis + pahala. Win-win-win.' },
    b: { label: 'Mager, takut jarum', cash: 0, aset: 0, utang: 0, bahagia: 0, poin: 60, note: 'Wajar takut, tapi coba lain kali. Kebaikan kecil menular.' },
  },
];

export const JOURNEY_ENDINGS: JourneyEnding[] = [
  { id: 'gelandangan', rank: 0, title: 'Pensiun Nelangsa', desc: 'Utang menumpuk, tabungan kosong. Masa tua bergantung belas kasih.', icon: '🌧️', minNetWorth: Number.NEGATIVE_INFINITY },
  { id: 'paspasan', rank: 1, title: 'Pensiun Pas-pasan', desc: 'Cukup makan dan tempat tinggal, tapi was-was tiap ada biaya tak terduga.', icon: '🍚', minNetWorth: 0 },
  { id: 'tenang', rank: 2, title: 'Pensiun Tenang', desc: 'Rumah lunas, ada tabungan. Hidup sederhana tanpa utang.', icon: '🏡', minNetWorth: 150000000 },
  { id: 'nyaman', rank: 3, title: 'Pensiun Nyaman', desc: 'Aset produktif menutup biaya hidup. Bisa bantu anak-cucu.', icon: '🌳', minNetWorth: 600000000 },
  { id: 'kaya', rank: 4, title: 'Pensiun Kaya Raya', desc: 'Miliaran aset + passive income. Masa tua = waktumu sendiri.', icon: '💎', minNetWorth: 2500000000 },
  { id: 'sultan', rank: 5, title: 'Sultan Pensiun', desc: 'Legenda keluarga! Kekayaan + kebahagiaan, warisan untuk 3 generasi.', icon: '👑', minNetWorth: 8000000000 },
  { id: 'legenda', rank: 6, title: 'Legenda Abadi', desc: 'Namamu diabadikan! Yayasan + bisnis jalan tanpa dirimu. 15M+ net worth.', icon: '🏛️', minNetWorth: 15000000000 },
  { id: 'bahagia_sejati', rank: 5, title: 'Pertapa Bahagia 🧘', desc: 'SECRET: Harta secukupnya, hati seluas samudra. Bahagia 90+ mengalahkan segalanya.', icon: '🧘', minNetWorth: 600000000 },
];

/**
 * Tentukan ending dari net worth + kebahagiaan.
 * - Secret 'bahagia_sejati': bahagia >= 90 & networth 600jt–8M (harta cukup, hati kaya)
 * - Bahagia >= 70 menaikkan 1 tingkat, bahagia < 30 menurunkan 1 tingkat.
 */
export function endingFor(netWorth: number, bahagia: number): JourneyEnding {
  if (bahagia >= 90 && netWorth >= 600000000 && netWorth < 8000000000) {
    return JOURNEY_ENDINGS.find((e) => e.id === 'bahagia_sejati')!;
  }
  const ladder = JOURNEY_ENDINGS.filter((e) => e.id !== 'bahagia_sejati');
  let idx = 0;
  for (let i = 0; i < ladder.length; i++) {
    if (netWorth >= ladder[i].minNetWorth) idx = i;
    else break;
  }
  if (bahagia >= 70) idx = Math.min(ladder.length - 1, idx + 1);
  else if (bahagia < 30) idx = Math.max(0, idx - 1);
  return ladder[idx];
}

export function rankOfEnding(id: string): number {
  return JOURNEY_ENDINGS.find((e) => e.id === id)?.rank ?? 0;
}

/**
 * Skor journey dinormalisasi ke rentang mirip mode lain (ratusan–ribuan poin),
 * bukan rupiah mentah agar XP tidak jebol.
 */
export function scoreJourney(decisionPoints: number, netWorth: number, bahagia: number): number {
  const worthBonus = Math.min(1000, Math.floor(Math.max(0, netWorth) / 1000000) * 10);
  return decisionPoints + worthBonus + Math.round(Math.max(0, Math.min(100, bahagia)) * 2);
}

/** Jumlah event per run: 15 wajib (3 acak dari 5 per babak) + 3 acak */
export const JOURNEY_RUN_LENGTH = 18;

/** Batas poin pilihan bijak — memicu combo streak */
export const WISE_POIN_THRESHOLD = 100;

/** Bonus kombo: 25 poin x streak beruntun */
export function comboBonus(streak: number): number {
  return streak <= 1 ? 0 : 25 * (streak - 1);
}

/** Poin boss dikali 1.5x */
export function pointsFor(ev: JourneyEvent, basePoin: number): number {
  return ev.isBoss ? Math.round(basePoin * 1.5) : basePoin;
}

function sample<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/**
 * Susun 1 run: tiap babak ambil 3 dari 5 event wajib (replayability),
 * + 3 event acak disisipkan setelah babak 1–3.
 */
export function pickJourneyRun(): JourneyEvent[] {
  const rand = sample(JOURNEY_RANDOM_EVENTS, 3);
  const list: JourneyEvent[] = [];
  for (let s = 1; s <= 5; s++) {
    list.push(...sample(JOURNEY_EVENTS.filter((e) => e.stage === s), 3));
    if (s <= 3) list.push(rand[s - 1]);
  }
  return list;
}
