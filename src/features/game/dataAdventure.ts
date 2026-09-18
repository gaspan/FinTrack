export interface AdventureChoice {
  label: string;
  effect: number;
  message: string;
  isWise: boolean;
  tip: string;
}

export interface AdventureLocation {
  id: string;
  icon: string;
  name: string;
  desc: string;
  choices: [AdventureChoice, AdventureChoice];
}

export interface AdventureEpisode {
  id: string;
  title: string;
  desc: string;
  icon: string;
  startBalance: number;
  character: string;
  locations: AdventureLocation[];
}

export const ADVENTURE_EPISODES: AdventureEpisode[] = [
  {
    id: 'payday',
    title: 'Hari Pertama Gajian',
    desc: 'Gaji baru masuk! Navigasi seharian penuh godaan finansial.',
    icon: '💰',
    startBalance: 5000000,
    character: '🧑‍💼',
    locations: [
      {
        id: 'breakfast', icon: '🍳', name: 'Dapur Rumah',
        desc: 'Pagi hari pertama gajian. Perut keroncongan, mau sarapan apa?',
        choices: [
          { label: 'Masak nasi goreng sendiri', effect: -12000, message: 'Hemat & kenyang! Cuma butuh nasi sisa, telur, dan kecap.', isWise: true, tip: 'Memasak sendiri bisa hemat 50-70% biaya makan.' },
          { label: 'Pesan sarapan via ojol', effect: -45000, message: 'Praktis sih, tapi ongkirnya hampir semahal makanannya.', isWise: false, tip: 'Ongkir deliveri bisa menambah 40-60% dari harga makanan.' },
        ],
      },
      {
        id: 'coffee', icon: '☕', name: 'Kafe Hits',
        desc: 'Rekan kerja mengajak ngopi di kafe baru yang viral di TikTok.',
        choices: [
          { label: 'Bawa tumbler kopi dari rumah', effect: -5000, message: 'Kopi buatan sendiri juga enak kok!', isWise: true, tip: 'Rp 55rb/hari × 22 hari kerja = Rp 1,2jt/bulan hanya untuk kopi!' },
          { label: 'Pesan Iced Caramel Macchiato', effect: -58000, message: 'Memang enak, tapi dompet menangis pelan.', isWise: false, tip: 'Latte Factor: pengeluaran kecil harian yang menumpuk jadi besar.' },
        ],
      },
      {
        id: 'transport', icon: '🚌', name: 'Jalan Raya',
        desc: 'Berangkat kerja. Jalanan mulai macet parah.',
        choices: [
          { label: 'Naik KRL + jalan kaki 10 menit', effect: -7000, message: 'Sehat, hemat, dan bebas macet!', isWise: true, tip: 'Transportasi umum tidak hanya hemat, tapi juga ramah lingkungan.' },
          { label: 'Pesan ride-hailing mobil', effect: -45000, message: 'Nyaman sih, tapi di dompet kurang nyaman.', isWise: false, tip: 'Biaya ride-hailing bisa 5-7x lipat transportasi umum.' },
        ],
      },
      {
        id: 'lunch', icon: '🍛', name: 'Area Kantor',
        desc: 'Jam makan siang. Bos mengajak ke restoran Jepang.',
        choices: [
          { label: 'Sopan menolak, makan di warteg', effect: -18000, message: 'Warteg legendaris! Nasi + 3 lauk pauk, kenyang poll.', isWise: true, tip: 'Tekanan sosial adalah penyebab utama overspending.' },
          { label: 'Ikut ke restoran (gengsi dong)', effect: -95000, message: 'Ramennya enak, tapi hampir Rp 100rb...', isWise: false, tip: 'Jangan korbankan tabungan demi gengsi. Kaya itu bukan soal gaya.' },
        ],
      },
      {
        id: 'groceries', icon: '🛒', name: 'Supermarket',
        desc: 'Pulang kerja, mampir belanja kebutuhan mingguan.',
        choices: [
          { label: 'Beli sesuai daftar belanja', effect: -120000, message: 'Disiplin! Semua yang dibeli memang dibutuhkan.', isWise: true, tip: 'Daftar belanja mencegah impulse buying dan hemat hingga 40%.' },
          { label: 'Jelajahi semua lorong, beli yang menarik', effect: -320000, message: 'Snack, ice cream, dan... apa ini? Kenapa beli ini?', isWise: false, tip: 'Supermarket didesain agar kamu beli lebih banyak. Daftar belanja senjatamu.' },
        ],
      },
      {
        id: 'flashsale', icon: '📱', name: 'Notifikasi HP',
        desc: 'Ada flash sale headphone wireless! Diskon 60%! ⚡',
        choices: [
          { label: 'Masukkan wishlist, riset dulu', effect: 0, message: 'Bijak! Banyak flash sale ternyata harganya sama saja.', isWise: true, tip: 'Aturan 24 jam: tunggu sehari sebelum beli barang non-esensial.' },
          { label: 'Checkout sekarang! Nanti kehabisan!', effect: -450000, message: 'FOMO! Padahal headphone lama masih bagus...', isWise: false, tip: 'Flash sale memanfaatkan FOMO. Harga "diskon" sering = harga normal.' },
        ],
      },
      {
        id: 'savings', icon: '🏦', name: 'Mobile Banking',
        desc: 'Malam hari. Buka app bank, saldo gaji masih lumayan.',
        choices: [
          { label: 'Transfer 20% gaji ke tabungan', effect: -1000000, message: 'Pay yourself first! Tabungan aman.', isWise: true, tip: 'Tabung di awal bulan, bukan sisa akhir bulan. Minimal 20%.' },
          { label: 'Biarkan di rekening utama', effect: 0, message: 'Uang yang mudah dijangkau, mudah dihabiskan.', isWise: false, tip: 'Pisahkan rekening tabungan dan pengeluaran agar tidak tergoda.' },
        ],
      },
    ],
  },
  {
    id: 'weekend',
    title: 'Liburan Akhir Pekan',
    desc: 'Weekend tiba! Jelajahi kota dengan bijak.',
    icon: '🏖️',
    startBalance: 2000000,
    character: '🧑‍🎨',
    locations: [
      {
        id: 'plan', icon: '🗺️', name: 'Rumah',
        desc: 'Sabtu pagi! Mau liburan singkat. Ke mana ya?',
        choices: [
          { label: 'Wisata alam pinggir kota', effect: -50000, message: 'Udara segar, pemandangan indah, dan murah!', isWise: true, tip: 'Pengalaman > kemewahan. Wisata alam sering lebih berkesan.' },
          { label: 'Staycation di hotel Instagramable', effect: -500000, message: 'Foto bagus sih, tapi setengah budget langsung habis.', isWise: false, tip: 'Staycation sering overpriced. Bandingkan harga vs pengalaman.' },
        ],
      },
      {
        id: 'fuel', icon: '⛽', name: 'SPBU',
        desc: 'Perlu isi bensin untuk perjalanan.',
        choices: [
          { label: 'Isi secukupnya saja', effect: -50000, message: 'Cukup untuk perjalanan pulang-pergi!', isWise: true, tip: 'Beli bahan bakar sesuai kebutuhan. Hindari belanja impulsif di kasir SPBU.' },
          { label: 'Full tank + beli snack di minimarket', effect: -150000, message: 'Tank penuh plus snack mahal dari minimarket SPBU...', isWise: false, tip: 'Harga snack di minimarket SPBU bisa 20-30% lebih mahal.' },
        ],
      },
      {
        id: 'eat', icon: '🍜', name: 'Warung Lokal',
        desc: 'Sampai di tempat wisata, perut mulai lapar!',
        choices: [
          { label: 'Makan di warung lokal', effect: -30000, message: 'Nasi liwet + ayam bakar. Autentik dan murah!', isWise: true, tip: 'Warung lokal sering punya makanan lebih enak dan jauh lebih murah.' },
          { label: 'Cari restoran rating 4.5+ di Google', effect: -150000, message: 'Rating tinggi = harga tinggi. Rasa? Biasa saja.', isWise: false, tip: 'Rating tinggi tidak selalu berarti value for money terbaik.' },
        ],
      },
      {
        id: 'photo', icon: '📸', name: 'Spot Foto',
        desc: 'Ada spot foto premium berbayar. Background-nya keren!',
        choices: [
          { label: 'Foto di spot gratis, pakai kreativitas', effect: 0, message: 'Hasilnya justru lebih unik dan personal!', isWise: true, tip: 'Konten bagus tidak harus mahal. Kreativitas > modal.' },
          { label: 'Bayar spot foto premium Rp 75rb', effect: -75000, message: 'Foto sih bagus, tapi sama seperti foto turis lainnya.', isWise: false, tip: 'Banyak spot foto gratis yang justru lebih instagramable.' },
        ],
      },
      {
        id: 'souvenir', icon: '🛍️', name: 'Toko Oleh-Oleh',
        desc: 'Mau beli oleh-oleh untuk keluarga di rumah.',
        choices: [
          { label: 'Beli produk UMKM lokal', effect: -80000, message: 'Unik, murah, dan membantu ekonomi lokal!', isWise: true, tip: 'Dukung UMKM = hemat + membantu ekonomi lokal.' },
          { label: 'Beli di toko branded (kemasan bagus)', effect: -250000, message: 'Kemasan memang cantik, tapi isinya mirip...', isWise: false, tip: 'Jangan bayar lebih hanya untuk kemasan. Cek kualitas isi produk.' },
        ],
      },
      {
        id: 'parking', icon: '🅿️', name: 'Area Parkir',
        desc: 'Mau pulang. Parkir resmi agak jauh, ada parkir liar dekat.',
        choices: [
          { label: 'Parkir di area resmi', effect: -15000, message: 'Aman dan tenang. Tidak perlu khawatir tilang.', isWise: true, tip: 'Pilihan murah kadang justru berisiko lebih mahal (tilang/kerusakan).' },
          { label: 'Parkir liar di pinggir jalan', effect: -5000, message: 'Murah sih, tapi deg-degan takut ditilang...', isWise: false, tip: 'Risiko tilang: Rp 250rb. Jauh lebih mahal dari parkir resmi.' },
        ],
      },
    ],
  },
  {
    id: 'newmonth',
    title: 'Awal Bulan Baru',
    desc: 'Bulan baru, tantangan baru! Kelola keuangan dengan cermat.',
    icon: '📊',
    startBalance: 3500000,
    character: '👩‍💻',
    locations: [
      {
        id: 'bills', icon: '📋', name: 'Meja Kerja',
        desc: 'Awal bulan. Tumpukan tagihan menunggu: listrik, air, internet.',
        choices: [
          { label: 'Bayar semua tagihan tepat waktu', effect: -800000, message: 'Lega! Tidak ada denda dan pikiran tenang.', isWise: true, tip: 'Telat bayar = denda + bunga. Bayar tepat waktu selalu lebih hemat.' },
          { label: 'Tunda sebagian, bayar yang urgent saja', effect: -400000, message: 'Hemat sementara, tapi denda menumpuk bulan depan...', isWise: false, tip: 'Hutang kecil yang ditunda bisa membengkak jadi masalah besar.' },
        ],
      },
      {
        id: 'health', icon: '🏥', name: 'Klinik',
        desc: 'Badan agak tidak enak akhir-akhir ini. Perlu cek kesehatan.',
        choices: [
          { label: 'Pakai BPJS yang sudah dibayar', effect: 0, message: 'BPJS memang kadang antre, tapi gratis dan berkualitas!', isWise: true, tip: 'Manfaatkan asuransi yang sudah dibayar. Itu hakmu!' },
          { label: 'Ke klinik swasta (bayar sendiri)', effect: -350000, message: 'Cepat sih, tapi mahal sekali untuk 15 menit konsultasi.', isWise: false, tip: 'Asuransi kesehatan adalah investasi terpenting. Jangan sia-siakan.' },
        ],
      },
      {
        id: 'course', icon: '📚', name: 'Marketplace Online',
        desc: 'Ada kursus online "Financial Planning 101", harga Rp 150rb.',
        choices: [
          { label: 'Investasi ilmu, beli kursusnya', effect: -150000, message: 'Investasi terbaik adalah investasi pada diri sendiri!', isWise: true, tip: 'Pengetahuan keuangan bisa menghasilkan return berkali lipat.' },
          { label: 'Ah, nonton YouTube gratis aja', effect: 0, message: 'Konten gratis memang ada, tapi sering tidak terstruktur.', isWise: false, tip: 'Kursus terstruktur lebih efektif dari konten acak. Waktu juga punya nilai.' },
        ],
      },
      {
        id: 'mealprep', icon: '🍳', name: 'Dapur',
        desc: 'Persediaan makan habis. Mau makan apa minggu ini?',
        choices: [
          { label: 'Meal prep untuk 5 hari', effect: -200000, message: 'Siap! Makanan sehat seminggu, tinggal hangatkan.', isWise: true, tip: 'Meal prep hemat waktu DAN uang. GoFood harian = Rp 2jt+/bulan!' },
          { label: 'Pesan GoFood setiap hari aja', effect: -500000, message: 'Praktis tapi mahal. Rp 100rb/hari lho!', isWise: false, tip: 'Masak sendiri vs deliveri: selisihnya bisa untuk tabungan.' },
        ],
      },
      {
        id: 'creditcard', icon: '💳', name: 'Notifikasi Bank',
        desc: 'Bank menawarkan kartu kredit limit Rp 10jt. Diambil?',
        choices: [
          { label: 'Tolak sopan, cukup pakai debit', effect: 0, message: 'Bijak! Kamu tahu batasanmu.', isWise: true, tip: 'Kartu kredit bukan uang tambahan. Jika tidak bisa bayar lunas, hindari.' },
          { label: 'Ambil, lumayan buat cicilan', effect: 0, message: 'Hati-hati! Bunga kartu kredit bisa 2-3% per bulan!', isWise: false, tip: 'Bunga KK 24-36%/tahun. Jauh lebih mahal dari pinjaman bank biasa.' },
        ],
      },
      {
        id: 'birthday', icon: '🎁', name: 'Chat Grup',
        desc: 'Ultah teman! Ada yang usul patungan kado Rp 500rb per orang.',
        choices: [
          { label: 'Tawarkan Rp 100rb + kado handmade', effect: -100000, message: 'Teman sejati menghargai niat, bukan harga.', isWise: true, tip: 'Hadiah tulus > hadiah mahal. Teman baik mengerti situasimu.' },
          { label: 'Ikut patungan Rp 500rb', effect: -500000, message: 'Gengsi terjaga, tapi dompet menjerit.', isWise: false, tip: 'Jangan berhutang demi ekspektasi sosial.' },
        ],
      },
      {
        id: 'track', icon: '📊', name: 'Malam Evaluasi',
        desc: 'Akhir minggu. Waktunya evaluasi keuangan bulanan.',
        choices: [
          { label: 'Catat semua pengeluaran di FinTrack 📱', effect: 0, message: 'Data is power! Kamu tahu ke mana uangmu pergi.', isWise: true, tip: 'Yang tidak dicatat, tidak bisa diperbaiki. Tracking = kontrol.' },
          { label: 'Males ah, nanti aja deh', effect: 0, message: 'Bulan depan pasti lupa lagi...', isWise: false, tip: 'Konsistensi kecil setiap hari > usaha besar sesekali.' },
        ],
      },
    ],
  },
];
