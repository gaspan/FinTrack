export interface QuizQuestion {
  q: string;
  options: [string, string, string, string];
  answer: number;
  tip: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // Existing 20
  { q: 'Aturan budgeting 50/30/20 artinya…', options: ['50% nabung, 30% kebutuhan, 20% hiburan', '50% kebutuhan, 30% keinginan, 20% tabungan', '50% jajan, 30% cicilan, 20% nabung', '50% investasi, 30% nabung, 20% belanja'], answer: 1, tip: '50% kebutuhan pokok, 30% keinginan, 20% tabungan/investasi.' },
  { q: 'Dana darurat ideal untuk karyawan tetap?', options: ['1x pengeluaran bulanan', '3–6x pengeluaran bulanan', '12x gaji tahunan', 'Tidak perlu jika punya asuransi'], answer: 1, tip: '3–6x pengeluaran. Freelancer butuh 6–12x.' },
  { q: 'Bunga kartu kredit menunggak di Indonesia sekitar…', options: ['0,5% per bulan', '2%+ per bulan (majemuk)', 'Gratis jika bayar minimum', 'Sama dengan bunga tabungan'], answer: 1, tip: 'Bunga kartu kredit ~2% per bulan & berbunga majemuk. Bayar lunas!' },
  { q: 'Mana yang termasuk kebutuhan (needs), bukan keinginan?', options: ['Kopi kekinian tiap hari', 'Langganan streaming 3 aplikasi', 'Beras & listrik rumah', 'Sneakers edisi terbatas'], answer: 2, tip: 'Bedakan needs vs wants sebelum checkout.' },
  { q: 'Investasi terbaik pertama sebelum main saham?', options: ['All-in saham gorengan', 'Lunasi utang konsumtif & dana darurat', 'Beli crypto pakai paylater', 'Ikut arisan online bunga tinggi'], answer: 1, tip: 'Fondasi: dana darurat + bebas utang konsumtif.' },
  { q: 'Cicilan sehat maksimal berapa dari penghasilan?', options: ['10%', '30%', '60%', '90%'], answer: 1, tip: 'Total cicilan ideal ≤30% penghasilan.' },
  { q: 'Paylater paling bijak dipakai untuk…', options: ['Barang konsumtif impulsif', 'Kebutuhan mendesak & lunas tepat waktu', 'Tutup cicilan lain (gali lubang)', 'Pamer gaya hidup'], answer: 1, tip: 'Paylater = utang. Pakai hanya jika mampu lunas.' },
  { q: 'Reksa dana pasar uang cocok untuk…', options: ['Dana pensiun 20 tahun', 'Dana darurat & tujuan <1 tahun', 'Spekulasi cepat kaya', 'Jaminan pasti tanpa risiko'], answer: 1, tip: 'Risiko rendah, likuid, untuk jangka pendek.' },
  { q: 'Diversifikasi artinya…', options: ['Taruh semua di satu saham', 'Sebar dana ke beberapa instrumen', 'Pinjam ke banyak pinjol', 'Buka banyak kartu kredit'], answer: 1, tip: '"Jangan taruh semua telur di satu keranjang."' },
  { q: 'Biaya langganan kecil Rp50rb/bulan setara setahun…', options: ['Rp250rb', 'Rp600rb', 'Rp50rb', 'Rp5jt'], answer: 1, tip: '50rb × 12 = 600rb. Audit langganan tiap 3 bulan.' },
  { q: 'Inflasi 5%/tahun artinya Rp100rb tahun depan senilai…', options: ['Tetap Rp100rb', 'Sekitar Rp95rb sekarang', 'Rp105rb sekarang', 'Tidak berpengaruh'], answer: 1, tip: 'Uang diam tergerus inflasi. Investasikan!' },
  { q: 'Langkah pertama saat gaji masuk?', options: ['Belanja self-reward dulu', 'Bayar tagihan + auto-nabung (pay yourself first)', 'Tunggu sisa akhir bulan', 'Traktir semua teman'], answer: 1, tip: 'Sisihkan 10–20% di awal, bukan dari sisa.' },
  { q: 'Asuransi jiwa paling butuh bagi…', options: ['Anak kuliah tanpa tanggungan', 'Tulang punggung keluarga', 'Semua orang sama rata', 'Yang sudah kaya raya'], answer: 1, tip: 'Asuransi = proteksi penghasilan pencari nafkah.' },
  { q: 'Jebakan “diskon 70%” paling aman diatasi dengan…', options: ['Beli 2 gratis 1 biar hemat', 'Tunggu 24 jam & cek butuh/tidak', 'Pakai semua paylater', 'Beli lalu pikir kemudian'], answer: 1, tip: 'Aturan 24 jam mengalahkan 90% belanja impulsif.' },
  { q: 'Emergency fund sebaiknya disimpan di…', options: ['Saham gorengan', 'Tabungan/reksadana pasar uang likuid', 'Deposito 5 tahun terkunci', 'Crypto volatil'], answer: 1, tip: 'Dana darurat harus cair <1 hari, bukan yang cuan besar.' },
  { q: 'Net worth (kekayaan bersih) dihitung dari…', options: ['Gaji per bulan', 'Aset − utang', 'Total belanja setahun', 'Saldo satu dompet'], answer: 1, tip: 'Pantau di menu Kekayaan Bersih FinTrack.' },
  { q: 'Biaya kopi Rp20rb × 22 hari kerja sebulan = …', options: ['Rp220rb', 'Rp440rb', 'Rp44rb', 'Rp1jt'], answer: 1, tip: 'Latte factor! 440rb/bulan = 5,2jt/tahun.' },
  { q: 'Mana ciri investasi bodong?', options: ['Terdaftar OJK, return wajar', 'Janji pasti untung besar tanpa risiko', 'Prospektus jelas & likuid', 'Fund manager berizin'], answer: 1, tip: 'Pasti untung + tanpa risiko = pasti bodong.' },
  { q: 'Prioritas saat punya utang menumpuk?', options: ['Investasi dulu biar nutup bunga', 'Stop gali lubang, lunasi bunga tertinggi dulu', 'Beli barang baru biar semangat', 'Abaikan semua tagihan'], answer: 1, tip: 'Metode avalanche: lunasi bunga tertinggi dulu.' },
  { q: 'Budget makan ideal umumnya…', options: ['5% penghasilan', '15–25% penghasilan', '70% penghasilan', 'Bebas tanpa batas'], answer: 1, tip: 'Makan 15–25%. Lebih dari itu, masak lebih sering.' },
  
  // New 20 questions
  { q: 'Apa itu Compounding Interest (Bunga Majemuk)?', options: ['Bunga yang hanya dibayarkan sekali', 'Bunga berbunga, untung dari modal + bunga sebelumnya', 'Bunga yang makin lama makin turun', 'Bunga pinjol yang menumpuk'], answer: 1, tip: 'Keajaiban dunia ke-8 kata Einstein! Mulai sedini mungkin.' },
  { q: 'Instrumen investasi dengan risiko paling tinggi?', options: ['Deposito Bank', 'Reksadana Pasar Uang', 'Mata Uang Kripto (Crypto)', 'Emas Batangan'], answer: 2, tip: 'Kripto sangat volatil. Hanya pakai "uang dingin".' },
  { q: 'Pajak penghasilan karyawan di Indonesia disebut?', options: ['PPN', 'PBB', 'PPh 21', 'Pajak Kendaraan'], answer: 2, tip: 'PPh 21 dipotong langsung dari gaji oleh perusahaan.' },
  { q: 'Apa tujuan utama Asuransi Kesehatan?', options: ['Untuk menabung hari tua', 'Mencegah kebangkrutan karena biaya medis', 'Mendapatkan keuntungan tunai tiap bulan', 'Investasi jangka pendek'], answer: 1, tip: 'Asuransi itu proteksi, bukan untuk cari cuan.' },
  { q: 'Jika inflasi 4% dan bunga tabungan 2%, uangmu sebenarnya?', options: ['Bertambah 2%', 'Berkurang 2% secara nilai beli', 'Bertambah 6%', 'Tetap nilainya'], answer: 1, tip: 'Bunga bank sering kalah dengan inflasi.' },
  { q: 'Fungsi utama dari Reksadana Saham adalah untuk?', options: ['Dana darurat', 'Tujuan jangka panjang (>5 tahun)', 'Simpanan uang belanja', 'Bayar uang muka motor bulan depan'], answer: 1, tip: 'Reksadana saham volatil, cocok untuk >5 tahun.' },
  { q: 'Apa itu "Uang Dingin" dalam investasi?', options: ['Uang hasil pinjaman', 'Uang untuk kebutuhan makan', 'Uang nganggur yang rela jika rugi (tidak dipakai >3 thn)', 'Uang di dalam kulkas'], answer: 2, tip: 'Jangan pernah investasi saham pakai uang SPP/kontrakan.' },
  { q: 'Keuntungan berinvestasi Emas fisik adalah...', options: ['Bisa ngasih dividen tiap bulan', 'Harganya naik 100% tiap tahun', 'Cenderung stabil, lindung nilai dari inflasi', 'Gampang dicetak sendiri'], answer: 2, tip: 'Emas itu safe haven, menjaga nilai uang dari gerusan zaman.' },
  { q: 'Membeli mobil baru dengan kredit 5 tahun disebut beban...', options: ['Produktif', 'Konsumtif (Nilai barang turun)', 'Investasi jangka panjang', 'Aset likuid'], answer: 1, tip: 'Mobil nilainya turun tiap tahun (depresiasi).' },
  { q: 'SBR (Savings Bond Ritel) diterbitkan oleh siapa?', options: ['Bank Swasta', 'Pemerintah Republik Indonesia', 'Bursa Efek Indonesia', 'Perusahaan Pinjol'], answer: 1, tip: 'SBR itu obligasi negara, sangat aman (dijamin UU).' },
  { q: 'Apa arti dari "Buy Low, Sell High"?', options: ['Beli barang diskon, jual lagi mahal', 'Strategi investasi: Beli saat harga turun, jual saat naik', 'Beli tanah di dataran rendah, jual di gunung', 'Prinsip asuransi'], answer: 1, tip: 'Inti trading, tapi dalam investasi jangka panjang, akumulasi lebih penting.' },
  { q: 'Apa risiko terbesar dari "Pinjol Ilegal"?', options: ['Bunga bisa 0%', 'Uang kita bertambah', 'Bunga tak masuk akal & teror penagihan (sebar data)', 'Tidak ada risiko'], answer: 2, tip: 'Pastikan selalu cek legalitas OJK jika terpaksa meminjam.' },
  { q: 'Perbedaan Kartu Debit dan Kartu Kredit?', options: ['Debit pakai uang bank, Kredit uang sendiri', 'Debit pakai uang sendiri, Kredit pakai uang bank (ngutang)', 'Tidak ada bedanya', 'Kredit tidak perlu dibayar'], answer: 1, tip: 'Kredit = Utang. Gunakan dengan penuh tanggung jawab.' },
  { q: 'Apa itu metode "Snowball" dalam pelunasan utang?', options: ['Bayar utang terbesar dulu', 'Bayar utang terkecil dulu agar termotivasi', 'Biarkan utang menumpuk', 'Bayar bunga saja'], answer: 1, tip: 'Snowball fokus ke psikologis: lunas utang kecil = semangat.' },
  { q: 'Biaya admin transfer antar bank (Non-BI Fast) biasanya...', options: ['Gratis', 'Rp 2.500', 'Rp 6.500', 'Rp 10.000'], answer: 2, tip: 'Gunakan BI-Fast (Rp2.500) atau aplikasi gratis transfer.' },
  { q: 'Jika harga saham turun 50%, butuh naik berapa % untuk balik modal?', options: ['50%', '75%', '100%', '25%'], answer: 2, tip: '100 - 50% = 50. Dari 50 ke 100 butuh naik 100%.' },
  { q: 'Istilah "Frugal Living" berarti...', options: ['Hidup pelit dan menderita', 'Hidup hedon pakai paylater', 'Gaya hidup hemat & sadar pengeluaran (mindful spending)', 'Selalu minta traktir'], answer: 2, tip: 'Frugal bukan pelit, tapi mengalokasikan uang pada hal bermakna.' },
  { q: 'Untuk menyiapkan dana pendidikan anak 10 tahun lagi, cocok di...', options: ['Di bawah kasur', 'Tabungan biasa', 'Reksadana Indeks / Saham', 'Arisan RT'], answer: 2, tip: '10 tahun cukup panjang, cocok untuk instrumen agresif.' },
  { q: 'Apa itu dividen dalam investasi saham?', options: ['Pajak tahunan saham', 'Pembagian keuntungan perusahaan ke pemegang saham', 'Biaya beli saham', 'Harga jual saham'], answer: 1, tip: 'Dividen adalah pasif income nyata dari investasi saham.' },
  { q: 'Manfaat utama mencatat keuangan (budgeting)?', options: ['Biar terlihat sibuk', 'Mencegah kebocoran uang dan tahu ke mana uang pergi', 'Syarat bayar pajak', 'Biar bisa pamer ke teman'], answer: 1, tip: 'Karena itulah kamu pakai FinTrack!' },
];

export interface PriceItem {
  name: string;
  icon: string;
  price: number;
  tip: string;
}

export const PRICE_ITEMS: PriceItem[] = [
  // Existing 16
  { name: 'Kopi susu 500ml (kafe)', icon: 'cafe-outline', price: 25000, tip: 'Bikin sendiri hemat ~70%.' },
  { name: 'Nasi padang rendang', icon: 'restaurant-outline', price: 20000, tip: 'Lauk ganda = 2x lipat. Pilih 1 protein.' },
  { name: 'Beras 5 kg (medium)', icon: 'basket-outline', price: 75000, tip: 'Beli karungan lebih murah per kg.' },
  { name: 'Telur ayam 1 kg', icon: 'egg-outline', price: 28000, tip: 'Protein termurah selain tempe.' },
  { name: 'Mie instan goreng', icon: 'noodles-outline', price: 3500, tip: 'Murah tapi jangan tiap hari.' },
  { name: 'Pertalite 1 liter', icon: 'car-outline', price: 10000, tip: 'Tekanan ban pas hemat BBM 5%.' },
  { name: 'Parkir mall 3 jam', icon: 'square-outline', price: 15000, tip: 'Parkir motor + jalan kaki = olahraga gratis.' },
  { name: 'Ojek online 5 km', icon: 'bicycle-outline', price: 18000, tip: 'Bandingka tarif 2 aplikasi sebelum order.' },
  { name: 'Ayam geprek + es teh', icon: 'fast-food-outline', price: 15000, tip: 'Paket hemat warteg sering <12rb.' },
  { name: 'Langganan streaming 1 bln', icon: 'tv-outline', price: 65000, tip: 'Patungan paket family legal.' },
  { name: 'Potong rambut (barbershop)', icon: 'cut-outline', price: 35000, tip: 'Potong 3 minggu sekali hemat 25%.' },
  { name: 'Laundry kiloan 3 kg', icon: 'shirt-outline', price: 25000, tip: 'Cuci sendiri hemat ~300rb/bulan.' },
  { name: 'Air mineral galon', icon: 'water-outline', price: 22000, tip: 'Isi ulang, jangan beli baru.' },
  { name: 'Roti tawar 1 bungkus', icon: 'pizza-outline', price: 18000, tip: 'Cek tanggal kedaluwarsa buat roti diskon.' },
  { name: 'Bensin eceran pinggir jalan 1L', icon: 'warning-outline', price: 12000, tip: 'Eceran ~20% lebih mahal dari SPBU.' },
  { name: 'Nasi goreng kaki lima', icon: 'flame-outline', price: 15000, tip: 'Porsi kuli = 2x makan. Bagi dua.' },
  
  // New 14
  { name: 'Minyak goreng 2L (kemasan)', icon: 'flask-outline', price: 35000, tip: 'Beli promo akhir pekan superindo/minimarket.' },
  { name: 'Gula pasir 1 kg', icon: 'cube-outline', price: 18000, tip: 'Kurangi gula = sehat dompet, sehat badan.' },
  { name: 'Susu UHT 1 liter', icon: 'water-outline', price: 19000, tip: 'Beli kartonan jika memang rutin minum.' },
  { name: 'Tiket bioskop (weekend)', icon: 'film-outline', price: 50000, tip: 'Nonton weekdays jauh lebih murah.' },
  { name: 'Pulsa / Paket Data 30GB', icon: 'wifi-outline', price: 85000, tip: 'Gunakan Wi-Fi kantor/rumah jika memungkinkan.' },
  { name: 'Sabun mandi cair (refill 450ml)', icon: 'water-outline', price: 22000, tip: 'Beli kemasan refill selalu lebih hemat dari botol.' },
  { name: 'Deterjen bubuk 1 kg', icon: 'sparkles-outline', price: 28000, tip: 'Jangan tuang kebanyakan, 1 sendok cukup.' },
  { name: 'Pisang Cavendish 1 kg', icon: 'nutrition-outline', price: 25000, tip: 'Buah lokal di pasar tradisional bisa setengah harga.' },
  { name: 'Air mineral botol 600ml', icon: 'water-outline', price: 4000, tip: 'Bawa tumbler sendiri hemat 120rb/bulan.' },
  { name: 'Pasta gigi ukuran besar', icon: 'happy-outline', price: 20000, tip: 'Potong tube saat mau habis untuk sisa 2x pakai.' },
  { name: 'Tarif tol dalam kota (jauh)', icon: 'car-sport-outline', price: 10500, tip: 'Gunakan rute alternatif jika waktu santai.' },
  { name: 'Obat pusing (1 strip)', icon: 'medkit-outline', price: 12000, tip: 'Beli obat generik apotek jauh lebih murah.' },
  { name: 'Cuci mobil (hidrolik)', icon: 'car-outline', price: 45000, tip: 'Cuci sendiri hitung-hitung olahraga.' },
  { name: 'Mie ayam bakso (gerobak)', icon: 'restaurant-outline', price: 15000, tip: 'Jajanan enak dan mengenyangkan.' },
];

export interface SurvivalEvent {
  day: string;
  title: string;
  desc: string;
  aLabel: string;
  bLabel: string;
  aEffect: number;
  bEffect: number;
  aNote: string;
  bNote: string;
  /** If true, the event is a bonus (positive) event */
  isBonus?: boolean;
  /** Chain event triggered after this event's choice */
  chainEvent?: SurvivalEvent;
}

export interface SurvivalTier {
  tier: number;
  name: string;
  icon: string;
  color: string;
  salary: number;
  eventCount: number;
  hideEffect: boolean;
  hasChainEvents: boolean;
  hasTimer: boolean;
  timerSeconds: number;
  xpMult: number;
  desc: string;
}

export const SURVIVAL_TIERS: SurvivalTier[] = [
  { tier: 1, name: 'Santai', icon: '🌿', color: '#22C55E', salary: 5000000, eventCount: 8, hideEffect: false, hasChainEvents: false, hasTimer: false, timerSeconds: 0, xpMult: 0.5, desc: 'Gaji 5jt, 8 event, semua efek terlihat' },
  { tier: 2, name: 'Normal', icon: '⚡', color: '#3B82F6', salary: 3000000, eventCount: 10, hideEffect: false, hasChainEvents: false, hasTimer: false, timerSeconds: 0, xpMult: 1, desc: 'Gaji 3jt, 10 event, pilihan lebih tricky' },
  { tier: 3, name: 'Sulit', icon: '🔥', color: '#F59E0B', salary: 3000000, eventCount: 12, hideEffect: true, hasChainEvents: false, hasTimer: false, timerSeconds: 0, xpMult: 1.5, desc: 'Gaji 3jt, 12 event, efek disembunyikan' },
  { tier: 4, name: 'Brutal', icon: '💀', color: '#EF4444', salary: 2500000, eventCount: 14, hideEffect: true, hasChainEvents: true, hasTimer: false, timerSeconds: 0, xpMult: 2, desc: 'Gaji 2.5jt, 14 event, ada chain event' },
  { tier: 5, name: 'Menantang Sangat', icon: '☠️', color: '#7C3AED', salary: 2000000, eventCount: 16, hideEffect: true, hasChainEvents: true, hasTimer: true, timerSeconds: 15, xpMult: 3, desc: 'Gaji 2jt, 16 event, timer + chain + hidden' },
];

// ─── Chain Events (used in tier 4-5) ───

const CHAIN_EVENTS: Record<string, SurvivalEvent> = {
  chain_hp_copet: {
    day: '(Chain)', title: 'HP Dicopet!', desc: 'HP barumu dicopet di angkot! Beli lagi atau pakai HP lama?',
    aLabel: 'Beli HP baru lagi', bLabel: 'Pakai HP bekas lama', aEffect: -800000, bEffect: -50000,
    aNote: 'HP baru lagi, dompet merana. -800rb.', bNote: 'HP lama masih bisa dipakai. -50rb buat tempered.',
  },
  chain_hp_jual: {
    day: '(Chain)', title: 'Jual HP Lama', desc: 'HP lamamu ternyata masih laku Rp600rb di marketplace!',
    aLabel: 'Jual sekarang', bLabel: 'Simpan cadangan', aEffect: 600000, bEffect: 0,
    aNote: '+600rb masuk dari jual HP lama!', bNote: 'Simpan sebagai backup.',
    isBonus: true,
  },
  chain_motor_kecelakaan: {
    day: '(Chain)', title: 'Kecelakaan Ringan', desc: 'Ban tipis yang cuma ditambal bikin kamu slip di jalan basah. Biaya rumah sakit?',
    aLabel: 'BPJS Kesehatan', bLabel: 'RS Swasta langsung', aEffect: -50000, bEffect: -500000,
    aNote: 'BPJS menanggung, bayar parkir + obat. -50rb.', bNote: 'Cepat tapi mahal banget. -500rb.',
  },
  chain_lembur_promosi: {
    day: '(Chain)', title: 'Promosi Dadakan!', desc: 'Bos terkesan dengan lembur mu. Dapat bonus kinerja!',
    aLabel: 'Tabung bonus', bLabel: 'Rayakan dengan makan enak', aEffect: 500000, bEffect: 350000,
    aNote: '+500rb bonus masuk tabungan!', bNote: '+350rb setelah makan rayakan di resto.',
    isBonus: true,
  },
  chain_arisan_menang: {
    day: '(Chain)', title: 'Menang Arisan!', desc: 'Nomor kocokanmu keluar, dapat Rp2.000.000!',
    aLabel: 'Tabung semua', bLabel: 'Belanja setengahnya', aEffect: 2000000, bEffect: 1000000,
    aNote: '+2jt masuk tabungan! Sultan!', bNote: 'Belanja 1jt, sisanya ditabung.',
    isBonus: true,
  },
};

export const SURVIVAL_EVENTS: SurvivalEvent[] = [
  // ─── Original 10 events ───
  { day: 'Hari 1', title: 'Gaji masuk!', desc: 'Awal bulan! Amankan dulu atau gas jajan?', aLabel: 'Auto-nabung 20%', bLabel: 'Gas jajan dulu', aEffect: -600000, bEffect: -400000, aNote: '600rb aman jadi tabungan. Sisanya 2,4jt.', bNote: 'Jajan 400rb. Tabungan? Nanti saja… (tidak ada)' },
  { day: 'Hari 3', title: 'Flash sale 11.11', desc: 'Sneakers impian diskon 60% jadi Rp450rb.', aLabel: 'Tahan, skip', bLabel: 'Checkout sekarang', aEffect: 0, bEffect: -450000, aNote: 'Godaan lolos. Saldo utuh.', bNote: 'Sepatu baru, saldo -450rb.' },
  { day: 'Hari 5', title: 'Motor mogok', desc: 'Servis + ganti oli Rp250rb.', aLabel: 'Bengkel resmi', bLabel: 'Tunda bulan depan', aEffect: -250000, bEffect: -600000, aNote: 'Beres 250rb, motor sehat.', bNote: 'Mogok total! Derek + turun mesin 600rb.' },
  { day: 'Hari 7', title: 'Traktiran teman', desc: 'Teman ulang tahun, patungan kafe Rp120rb.', aLabel: 'Ikut, jaga relasi', bLabel: 'Alasan hemat', aEffect: -120000, bEffect: 0, aNote: 'Relasi terjaga. -120rb.', bNote: 'Hemat, tapi diledek pelit seminggu.' },
  { day: 'Hari 10', title: 'Undangan nikah', desc: 'Teman SMA nikah. Amplop wajar Rp150rb + bensin.', aLabel: 'Datang + amplop', bLabel: 'Transfer Rp50rb saja', aEffect: -200000, bEffect: -50000, aNote: 'Silaturahmi lunas. -200rb.', bNote: 'Hemat 150rb, relasi agak renggang.' },
  { day: 'Hari 13', title: 'Langganan naik', desc: 'Streaming + cloud naik total Rp100rb/bulan.', aLabel: 'Audit & stop 1', bLabel: 'Bayar semua', aEffect: -40000, bEffect: -100000, aNote: 'Stop 1 langganan. Cuma -40rb.', bNote: 'Mager audit. -100rb melayang.' },
  { day: 'Hari 16', title: 'Lembur dibayar', desc: 'Bos tawarkan lembur Sabtu, honor Rp300rb.', aLabel: 'Ambil lembur', bLabel: 'Rebahan saja', aEffect: 300000, bEffect: 0, aNote: '+300rb masuk! Mantap.', bNote: 'Istirahat penuh, saldo tetap.', chainEvent: CHAIN_EVENTS.chain_lembur_promosi },
  { day: 'Hari 19', title: 'HP retak', desc: 'Layar retak. Ganti tempered + servis Rp180rb, atau HP baru cicilan Rp500rb.', aLabel: 'Servis saja', bLabel: 'HP baru (cicilan)', aEffect: -180000, bEffect: -500000, aNote: 'HP mulus lagi. -180rb.', bNote: 'Gengsi naik, saldo -500rb.', chainEvent: CHAIN_EVENTS.chain_hp_jual },
  { day: 'Hari 22', title: 'Arisan kantor', desc: 'Diajak arisan Rp200rb/bulan, dapat lot awal.', aLabel: 'Ikut arisan', bLabel: 'Tolak halus', aEffect: -200000, bEffect: 0, aNote: 'Paksa nabung via arisan. -200rb.', bNote: 'Fokus ke tabungan sendiri.', chainEvent: CHAIN_EVENTS.chain_arisan_menang },
  { day: 'Hari 26', title: 'Promo paylater', desc: 'Cashback 50% s/d Rp200rb jika belanja Rp400rb pakai paylater.', aLabel: 'Abaikan promo', bLabel: 'Belanja demi cashback', aEffect: 0, bEffect: -200000, aNote: 'Tidak belanja = hemat 100%.', bNote: 'Belanja 400rb − cashback 200rb = -200rb.' },
  
  // ─── Existing batch 2 (10 events) ───
  { day: 'Hari 2', title: 'Promo Kopi', desc: 'Promo Beli 1 Gratis 1 Kopi Susu Literan Rp80rb.', aLabel: 'Beli untuk stok', bLabel: 'Bikin kopi saset', aEffect: -80000, bEffect: -5000, aNote: 'Stok kopi seminggu. -80rb.', bNote: 'Kopi saset murah meriah. -5rb.' },
  { day: 'Hari 6', title: 'AC Kamar Rusak', desc: 'Cuci AC Rp75rb atau biarkan panas?', aLabel: 'Panggil Tukang', bLabel: 'Pakai Kipas Angin', aEffect: -75000, bEffect: -15000, aNote: 'AC dingin, tidur nyenyak. -75rb.', bNote: 'Gerah sedikit, kipas rusak besoknya -15rb.' },
  { day: 'Hari 8', title: 'Tilang Polisi', desc: 'Lupa bawa STNK. Bayar denda Rp250rb atau titip sidang?', aLabel: 'Ikut Sidang Nanti', bLabel: 'Titip / Damai', aEffect: -100000, bEffect: -250000, aNote: 'Ikut sidang lebih murah. -100rb.', bNote: 'Cepat tapi mahal. -250rb.' },
  { day: 'Hari 11', title: 'Baju Kondangan', desc: 'Baju lama kesempitan. Beli kemeja baru Rp200rb?', aLabel: 'Pinjam Teman', bLabel: 'Beli Baru', aEffect: 0, bEffect: -200000, aNote: 'Gratis, teman baik. 0.', bNote: 'Tampil fresh, dompet kempes. -200rb.' },
  { day: 'Hari 14', title: 'Cashback Dompet Digital', desc: 'Isi saldo Rp500rb dapat cashback Rp50rb.', aLabel: 'Topup Sekarang', bLabel: 'Abaikan', aEffect: -450000, bEffect: 0, aNote: 'Dapat cashback, walau uang tertahan di app. -450rb.', bNote: 'Saldo bank aman, tidak tergoda.' },
  { day: 'Hari 17', title: 'Sakit Gigi', desc: 'Gigi cenat-cenut. Ke dokter gigi Rp350rb pakai BPJS gratis (tapi antre 4 jam).', aLabel: 'Pakai BPJS (Antre)', bLabel: 'Klinik Swasta (Cepat)', aEffect: -15000, bEffect: -350000, aNote: 'Antre panjang, tapi cuma bayar parkir. -15rb.', bNote: 'Cepat beres, mahal. -350rb.' },
  { day: 'Hari 20', title: 'Bocor Halus', desc: 'Ban motor bocor, tambal Rp15rb atau sekalian ganti ban baru Rp150rb karena udah tipis?', aLabel: 'Tambal Dulu', bLabel: 'Ganti Ban Baru', aEffect: -15000, bEffect: -150000, aNote: 'Aman sementara. -15rb.', bNote: 'Investasi keselamatan berkendara. -150rb.', chainEvent: CHAIN_EVENTS.chain_motor_kecelakaan },
  { day: 'Hari 24', title: 'Konser Band Favorit', desc: 'Tiket festival Rp450rb.', aLabel: 'Nonton via YouTube', bLabel: 'Beli Tiket (Fomo)', aEffect: 0, bEffect: -450000, aNote: 'Gratis sambil rebahan.', bNote: 'Pengalaman seru, uang melayang. -450rb.' },
  { day: 'Hari 27', title: 'Pajak Motor Mati', desc: 'Waktunya bayar pajak tahunan Rp350rb.', aLabel: 'Bayar Sekarang', bLabel: 'Tunda (Kena Denda)', aEffect: -350000, bEffect: -450000, aNote: 'Lega, taat pajak. -350rb.', bNote: 'Bulan depan bayar + denda besar. -450rb.' },
  { day: 'Hari 29', title: 'Sisa Saldo Tipis', desc: 'Sisa uang bulanan tinggal dikit. Makan siang apa?', aLabel: 'Warteg / Masak', bLabel: 'GoFood Makanan Enak', aEffect: -15000, bEffect: -60000, aNote: 'Bertahan hidup mode hemat. -15rb.', bNote: 'Self-reward di akhir bulan. -60rb.' },

  // ─── NEW 15 events for more variety ───
  { day: 'Hari 2', title: 'Kosan Bocor', desc: 'Atap kos bocor pas hujan. Laporin ibu kos (gratis tapi lama) atau patungan tukang sendiri?', aLabel: 'Lapor Ibu Kos', bLabel: 'Patungan Tukang (Rp180rb)', aEffect: 0, bEffect: -180000, aNote: 'Gratis tapi kamar basah 3 hari.', bNote: 'Langsung beres, dompet -180rb.' },
  { day: 'Hari 4', title: 'Teman Pinjam Uang', desc: 'Teman dekat pinjam Rp500rb, janji bayar akhir bulan.', aLabel: 'Pinjamkan', bLabel: 'Tolak halus', aEffect: -500000, bEffect: 0, aNote: 'Semoga dibayar... -500rb.', bNote: 'Relasi agak awkward, tapi dompet aman.' },
  { day: 'Hari 4', title: 'Teman Bayar Utang!', desc: 'Teman yang pinjam uang bulan lalu akhirnya bayar Rp300rb dari Rp500rb.', aLabel: 'Terima, ikhlasin sisanya', bLabel: 'Tagih sisanya', aEffect: 300000, bEffect: 500000, aNote: '+300rb masuk. Sisanya direlakan.', bNote: '+500rb lunas! Sedikit canggung tapi uang kembali.', isBonus: true },
  { day: 'Hari 9', title: 'Listrik & Air Bulanan', desc: 'Tagihan listrik naik 30% karena AC nyala terus. Total Rp380rb.', aLabel: 'Bayar, kurangi AC', bLabel: 'Bayar, tetap nyala', aEffect: -380000, bEffect: -380000, aNote: 'Bayar -380rb. Bulan depan bakal turun.', bNote: 'Bayar -380rb. Bulan depan mungkin lebih mahal lagi.' },
  { day: 'Hari 9', title: 'Freelance Dadakan', desc: 'Teman SMA minta tolong desain undangan, bayar Rp250rb.', aLabel: 'Ambil projectnya', bLabel: 'Lagi sibuk, tolak', aEffect: 250000, bEffect: 0, aNote: '+250rb! Kerja 2 jam, worth it.', bNote: 'Waktu luang, saldo tetap.', isBonus: true },
  { day: 'Hari 12', title: 'Kucing Sakit', desc: 'Kucing peliharaan kena diare. Bawa ke vet Rp300rb atau obat warung Rp30rb?', aLabel: 'Ke Dokter Hewan', bLabel: 'Obat Warung', aEffect: -300000, bEffect: -30000, aNote: 'Kucing sehat, dompet -300rb.', bNote: 'Kucing membaik, -30rb. Untung bukan parah.' },
  { day: 'Hari 15', title: 'Bos Traktir Makan', desc: 'Bos ajak makan siang di resto mahal. Gratis!', aLabel: 'Ikut (Gratis)', bLabel: 'Bawa bekal sendiri', aEffect: 0, bEffect: -15000, aNote: 'Makan gratis + networking sama bos!', bNote: 'Bekal -15rb, kelewatan bonding sama bos.', isBonus: true },
  { day: 'Hari 18', title: 'Dompet Hilang', desc: 'Dompet jatuh di angkot! Ada Rp200rb cash + KTP.', aLabel: 'Urus KTP baru (biaya admin)', bLabel: 'Ikhlasin semua', aEffect: -250000, bEffect: -200000, aNote: 'KTP baru -50rb + kehilangan cash -200rb.', bNote: 'Pasrah, -200rb cash hilang.' },
  { day: 'Hari 21', title: 'Investasi Bodong?', desc: 'Teman ajak ikut "investasi crypto 100% per bulan". Modal minimal Rp1jt.', aLabel: 'Tolak tegas', bLabel: 'Coba ikutan', aEffect: 0, bEffect: -1000000, aNote: 'Keputusan bijak. Kalau terlalu indah, pasti bodong.', bNote: 'RIP. Scam! Uang 1jt hilang selamanya.' },
  { day: 'Hari 23', title: 'WiFi Kos Mati', desc: 'WiFi kos mati 3 hari. Beli paket data Rp100rb atau numpang warnet?', aLabel: 'Beli Paket Data', bLabel: 'Warnet Rp15rb/hari', aEffect: -100000, bEffect: -45000, aNote: 'Internetan lancar dari kamar. -100rb.', bNote: 'Warnet 3 hari -45rb, lumayan.' },
  { day: 'Hari 25', title: 'THR Mini dari Kantor', desc: 'Perusahaan bagi-bagi voucher belanja Rp200rb menjelang hari raya.', aLabel: 'Pakai buat kebutuhan', bLabel: 'Jual ke teman (diskon)', aEffect: 200000, bEffect: 150000, aNote: '+200rb dalam bentuk kebutuhan pokok!', bNote: '+150rb cash dari jual voucher.', isBonus: true },
  { day: 'Hari 25', title: 'Tetangga Minta Sumbangan', desc: 'Ketua RT minta sumbangan pembangunan musholah Rp100rb.', aLabel: 'Kasih Rp100rb', bLabel: 'Kasih Rp50rb', aEffect: -100000, bEffect: -50000, aNote: 'Sedekah penuh. -100rb.', bNote: 'Seikhlasnya. -50rb.' },
  { day: 'Hari 28', title: 'Promo Grab/Gojek', desc: 'Voucher diskon 50% ojol untuk 5 trip minggu ini.', aLabel: 'Pakai, naik ojol', bLabel: 'Tetap naik motor sendiri', aEffect: -50000, bEffect: -30000, aNote: 'Praktis tapi tetap keluar -50rb.', bNote: 'Motor sendiri, bensin -30rb saja.' },
  { day: 'Hari 28', title: 'Kenaikan Gaji Teman', desc: 'Teman se-kantor pamer kenaikan gaji. Kamu jadi ingin upgrade gaya hidup.', aLabel: 'Tetap rendah hati', bLabel: 'FOMO, belanja gaya', aEffect: 0, bEffect: -350000, aNote: 'Bijak. Perbandingan membunuh kebahagiaan.', bNote: 'Beli jaket branded -350rb. Puas sesaat.' },
  { day: 'Hari 30', title: 'Akhir Bulan: Evaluasi', desc: 'Mau tutup bulan. Ada tabungan otomatis Rp200rb yang bisa dicairkan.', aLabel: 'Jangan cairkan', bLabel: 'Cairkan untuk jajan', aEffect: 0, bEffect: 200000, aNote: 'Tabungan aman. Mental baja!', bNote: 'Cairkan +200rb tapi tabungan terkikis.' },
];

export const BEST_KEYS = { quiz: 'arena_quiz_best', price: 'arena_price_best', survival: 'arena_survival_best' } as const;

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function rankFor(score: number): string {
  if (score >= 10000) return 'Sultan Finansial';
  if (score >= 6000) return 'Ahli Finansial';
  if (score >= 3500) return 'Manajer Keuangan';
  if (score >= 1500) return 'Investor Cilik';
  if (score >= 500) return 'Penabung Aktif';
  return 'Pemula Hemat';
}

export interface Level {
  level: number;
  title: string;
  xpRequired: number;
  icon: string;
}

export const LEVELS: Level[] = [
  { level: 1, title: 'Pemula Hemat', xpRequired: 0, icon: '🌱' },
  { level: 2, title: 'Penabung Aktif', xpRequired: 500, icon: '💰' },
  { level: 3, title: 'Investor Cilik', xpRequired: 1500, icon: '📈' },
  { level: 4, title: 'Perencana Handal', xpRequired: 3500, icon: '🎯' },
  { level: 5, title: 'Manajer Keuangan', xpRequired: 6000, icon: '💼' },
  { level: 6, title: 'Ahli Finansial', xpRequired: 10000, icon: '🏆' },
  { level: 7, title: 'Guru Keuangan', xpRequired: 16000, icon: '🎓' },
  { level: 8, title: 'Sultan Finansial', xpRequired: 25000, icon: '👑' },
];

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_quiz', title: 'Langkah Pertama', desc: 'Selesaikan kuis pertama', icon: '🎯' },
  { id: 'quiz_master', title: 'Master Kuis', desc: 'Skor 1000+ di kuis', icon: '🧠' },
  { id: 'price_hawk', title: 'Mata Elang', desc: 'Skor 1000+ di tebak harga', icon: '🦅' },
  { id: 'survivor', title: 'Survivor Sejati', desc: 'Selesaikan survival dengan saldo 2jt+', icon: '🛡️' },
  { id: 'streak_5', title: 'Otak Encer', desc: 'Streak 5x berturut-turut di kuis', icon: '🔥' },
  { id: 'perfect_price', title: 'Pedagang Ulung', desc: 'Tebak harga benar 10x beruntun', icon: '💎' },
  { id: 'all_modes', title: 'Petualang Lengkap', desc: 'Main semua 4 mode game', icon: '🗺️' },
  { id: 'level_5', title: 'Setengah Jalan', desc: 'Capai level 5', icon: '⭐' },
  { id: 'total_1000', title: 'Seribu Poin', desc: 'Kumpulkan 1000 XP total', icon: '🎉' },
  { id: 'data_challenge', title: 'Cermin Diri', desc: 'Selesaikan tantangan data asli pertama', icon: '🪞' },
  { id: 'data_perfect', title: 'Kenal Dompet Sendiri', desc: 'Skor 100% di tantangan data asli', icon: '🏅' },
  // New survival tier achievements
  { id: 'survival_tier3', title: 'Pejuang Gajian', desc: 'Survive di tier Sulit (saldo > 0)', icon: '⚔️' },
  { id: 'survival_tier5', title: 'Legenda Bertahan', desc: 'Survive di tier Menantang Sangat', icon: '☠️' },
  { id: 'survival_frugal', title: 'Raja Hemat', desc: 'Selesai survival dengan ≥80% saldo awal', icon: '👑' },
];
