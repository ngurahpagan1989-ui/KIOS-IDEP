// ========================= SISTEM PANDUAN OPERASIONAL & SOP INTERAKTIF (IN-APP HELP) =========================

const KIOS_SOP_GUIDES = {
  'dashboard': {
    title: 'Dashboard Ringkasan Operasional',
    icon: '🏠',
    tagline: 'Pemantauan omzet penjualan harian, status kas, dan peringatan stok kritis secara real-time.',
    purpose: 'Memberikan gambaran kilas satu pintu bagi pengelola toko dan kasir mengenai performa transaksi hari ini, sisa kasir, toples benih yang menipis, serta peringatan uji semai yang mendesak.',
    steps: [
      { num: '1', title: 'Tinjau Metrik Omzet & Transaksi', desc: 'Periksa kartu ringkasan di baris teratas: total rupiah omzet hari ini, jumlah struk yang dilayani, dan perbandingan dengan target harian.' },
      { num: '2', title: 'Periksa Peringatan Stok Kritis', desc: 'Lihat daftar benih yang berstatus stok menipis (< batas minimum) agar segera dijadwalkan pengemasan di modul Kemas Mandiri.' },
      { num: '3', title: 'Periksa Peringatan Uji Semai Lab', desc: 'Lihat notifikasi toples benih yang telah tersimpan lebih dari 3 atau 6 bulan untuk segera dilakukan pengujian daya tumbuh ulang di lab QC.' },
      { num: '4', title: 'Akses Cepat Modul Utama', desc: 'Gunakan tombol pintas "Buka Kasir" di sudut kanan atas atau tombol navigasi cepat untuk langsung berpindah ke modul operasional yang dibutuhkan.' }
    ],
    tips: [
      'Gunakan tombol "Segarkan Data" di sudut atas jika baru saja menyelesaikan transaksi di perangkat lain.',
      'Ikon lonceng di bilah atas menampilkan seluruh notifikasi operasional toko secara terpusat.'
    ],
    warnings: [
      'Jika angka omzet tidak bertambah setelah transaksi, pastikan browser tidak dalam kondisi offline dan koneksi internet stabil.'
    ]
  },

  'pos': {
    title: 'Pelayanan Kasir & Penjualan (Point of Sale)',
    icon: '🛒',
    tagline: 'Transaksi penjualan langsung, multi-tier harga pelanggan, 4 metode bayar, dan cetak struk.',
    purpose: 'Melayani pembeli toko secara cepat dan akurat, menerapkan harga bertingkat (Reguler, Outlet, Bali Buda) secara otomatis, memotong stok fisik dengan metode FIFO (kedaluwarsa terdekat dipotong duluan), serta mencetak bukti belanja resmi.',
    steps: [
      { num: '1', title: 'Tentukan Profil Pelanggan & Tingkat Harga', desc: 'Di bagian atas keranjang kasir, pilih pelanggan: Umum (Harga Reguler), Reseller (Harga Outlet), atau Mitra Khusus (Harga Bali Buda). Harga seluruh barang otomatis menyesuaikan!' },
      { num: '2', title: 'Pilih Varietas / Produk Kemasan', desc: 'Ketik nama benih pada kotak pencarian atau klik kartu produk di katalog untuk memasukkannya ke keranjang belanja. Atur jumlah pcs dengan tombol + / -.' },
      { num: '3', title: 'Beri Diskon Khusus (Bila Ada)', desc: 'Ketik nominal diskon dalam Rupiah (misal: 5000) atau persentase (misal: 10%) pada kolom Diskon di bawah keranjang.' },
      { num: '4', title: 'Pilih Cara Bayar (Tunai, QRIS, Bank, Tempo)', desc: 'Klik tombol "Bayar Sekarang", pilih metode: Tunai (masukkan uang diterima), QRIS (tampilkan barcode), Transfer Bank, atau Bayar Nanti / Piutang (khusus pelanggan terdaftar dengan tempo).' },
      { num: '5', title: 'Cetak Struk & Kirim Nota WhatsApp', desc: 'Cetak struk belanja thermal (58mm/80mm) atau klik "Kirim Struk WA" untuk mengirimkan nota digital langsung ke nomor WhatsApp pembeli.' }
    ],
    tips: [
      'Tekan tombol nominal uang pas di jendela pembayaran tunai untuk mempercepat penginputan tanpa mengetik angka.',
      'Gunakan tombol "📜 Riwayat Transaksi" di atas katalog untuk mencari nota lama jika pelanggan ingin menukar barang atau melakukan retur penjualan.',
      'Sistem otomatis memicu alur purna jual H+7 semai untuk menanyakan tingkat keberhasilan tumbuh benih kepada pembeli.'
    ],
    warnings: [
      'Dilarang melakukan transaksi dengan tanggal mundur pada periode yang telah ditutup buku (sistem anti-backdating otomatis menolak).',
      'Benih yang berstatus kedaluwarsa atau masih dalam karantina lab QC otomatis dicegah penjualannya oleh sistem.'
    ]
  },

  'produk': {
    title: 'Katalog Master Produk & Impor Excel',
    icon: '📦',
    tagline: 'Manajemen master varietas benih, buku, multi-tier harga, gramatur netto, dan impor massal.',
    purpose: 'Mengelola database seluruh komoditas benih dan produk non-benih yang dijual di toko kasir maupun dipasok ke outlet konsinyasi.',
    steps: [
      { num: '1', title: 'Pendaftaran Produk Baru (Formulir Cerdas 2-in-1)', desc: 'Klik "+ Tambah Produk Baru". Jika memilih bahan mentah curah, centang opsi "✨ Sekaligus buatkan versi kemasan sachet siap jual" agar sistem membuatkan master sachet pasangannya dalam sekali simpan!' },
      { num: '2', title: 'Tentukan Gramatur & Multi-Tier Harga', desc: 'Masukkan berat bersih netto per kemasan (misal: 20 gr). Masukkan harga bertingkat: Harga Reguler (konsumen umum), Harga Outlet (mitra toko), dan Harga Bali Buda.' },
      { num: '3', title: 'Impor Massal via Excel (.xlsx / .csv)', desc: 'Klik "📤 Impor Excel / CSV", klik "Unduh Templat Excel (.xlsx)" untuk format baku. Isi data SKU, nama, kategori, gramatur, dan harga, lalu seret file ke kotak impor untuk simpan massal.' },
      { num: '4', title: 'Ekspor Data Katalog', desc: 'Klik "📊 Ekspor ke Excel" untuk mengunduh seluruh katalog produk aktif beserta informasi stok terkini ke format Excel / CSV.' }
    ],
    tips: [
      'Gunakan SKU yang sistematis dan mudah dibaca (contoh: BNH-KGL-01 untuk Benih Kangkung Lombok Sachet).',
      'Produk bertipe Buku, Media Tanam, Kaos, dan Merchandise bebas dari alur QC lab benih sehingga langsung aktif setelah disimpan.'
    ],
    warnings: [
      'Jangan menghapus produk yang sudah memiliki riwayat transaksi penjualan kasir atau mutasi batch. Cukup nonaktifkan statusnya agar laporan pembukuan masa lalu tidak rusak.'
    ]
  },

  'stok': {
    title: 'Manajemen Stok & Batch Antrean FIFO',
    icon: '📦',
    tagline: 'Pemantauan kesegaran lot batch, kartu riwayat mutasi, dan prosedur penyesuaian opname fisik.',
    purpose: 'Melacak stok fisik nyata berdasarkan nomor lot, tanggal panen, dan batas kedaluwarsa, memastikan perputaran barang lama keluar terlebih dahulu (FIFO), serta mencatat penyesuaian selisih fisik.',
    steps: [
      { num: '1', title: 'Pantau Indikator Warna Kesegaran', desc: 'Periksa lencana status: 🟢 Aman & Segar, ⚠️ Stok Menipis, 🔬 Butuh Uji Semai Ulang (telah tersimpan lama), atau ⛔ Kedaluwarsa.' },
      { num: '2', title: 'Periksa Kartu Mutasi Per Batch', desc: 'Klik ikon riwayat / mata pada baris batch untuk meninjau jejak histori mutasi masuk (pembelian), keluar (kasir), hasil kemas mandiri, atau transfer konsinyasi.' },
      { num: '3', title: 'Lakukan Stock Opname Fisik Berkala', desc: 'Cetak Lembar Kerja Opname Fisik A4 di menu Laporan (harga otomatis disembunyikan), hitung fisik di rak toko, dan catat selisihnya.' },
      { num: '4', title: 'Input Penyesuaian Koreksi Stok', desc: 'Klik tombol "⚖️ + Penyesuaian Stok", pilih varietas dan lot batch, pilih arah koreksi (Pengurangan jika hilang/rusak, Penambahan jika temuan lebih), pilih alasan "Selisih Hasil Stock Opname Fisik", lalu simpan.' }
    ],
    tips: [
      'Gunakan fitur pencarian lot batch untuk melacak secara instan siapa petani penangkar yang memproduksi benih tersebut.',
      'Sistem secara otomatis mengurutkan pemotongan stok kasir dari lot yang memiliki tanggal kedaluwarsa paling dekat.'
    ],
    warnings: [
      'Hindari melakukan penyesuaian stok tanpa perhitungan fisik riil. Semua aksi penyesuaian tercatat permanen di log audit sistem.'
    ]
  },

  'produksi': {
    title: 'Kemas Mandiri & Produksi Sachet',
    icon: '🌾',
    tagline: 'Konversi bahan curah toples menjadi sachet siap jual dengan lot 1:1 dan kalkulasi HPP otomatis.',
    purpose: 'Memproses benih curah yang telah dinyatakan lolos uji lab QC menjadi kemasan sachet retail siap jual, menyelaraskan nomor lot 1:1, dan menghitung modal HPP baru sachet (modal benih + plastik klip & label).',
    steps: [
      { num: '1', title: 'Pilih Bahan Baku Curah Lolos QC', desc: 'Pilih toples benih curah asal. Hanya batch yang telah berstatus APPROVED di lab QC yang akan muncul di daftar pilihan.' },
      { num: '2', title: 'Pilih Target Kemasan Sachet', desc: 'Pilih ukuran sachet tujuan (misal: Sachet 20 gr). Gramatur per kemasan otomatis terdeteksi oleh sistem.' },
      { num: '3', title: 'Timbang & Masukkan Gram Curah yang Diproses', desc: 'Timbang benih curah yang diambil dari toples gudang (misal: 1.000 gr). Sistem menampilkan kalkulasi estimasi teoritis (1.000 gr / 20 gr = 50 sachet).' },
      { num: '4', title: 'Input Hasil Fisik Nyata Lapangan', desc: 'Kemas sachet dan hitung hasil fisik yang benar-benar jadi (misal: 49 sachet). Selisih 1 sachet akibat tumpah atau sortiran otomatis tercatat sebagai susut/wastage.' },
      { num: '5', title: 'Masukkan Biaya Kemasan & Terbitkan', desc: 'Masukkan biaya plastik klip + stiker label per pcs (misal: Rp 500). Sistem otomatis menghitung HPP Final Sachet, menyinkronkan nomor batch, dan memotong stok curah toples!' }
    ],
    tips: [
      'Nomor batch kemasan sachet otomatis mengikuti kode batch bahan curah asalnya agar ketertelusuran mutu benih tetap utuh dari hulu ke hilir.',
      'Stok kemasan sachet yang baru diterbitkan seketika langsung aktif dan siap dijual di Kasir POS.'
    ],
    warnings: [
      'Jangan memproses benih curah yang masih berstatus QUARANTINE atau belum lulus uji daya tumbuh di lab QC.'
    ]
  },

  'qc': {
    title: 'Quality Control (QC) & Sertifikasi Benih',
    icon: '🔬',
    tagline: '5 tahapan pengujian viabilitas benih, log oven DHT 24 jam, dan pembukaan kunci stok jual.',
    purpose: 'Menjaga kemurnian genetik dan standar mutu benih (ambang minimal daya berkecambah 80%), memanaskan benih di oven DHT 24 jam pada suhu 50°C, serta mendokumentasikan foto baki semai secara resmi.',
    steps: [
      { num: '1', title: 'Tahap 1: Verifikasi Lapangan Petani', desc: 'Pemeriksaan kesehatan tanaman dan kemurnian varietas di kebun penangkar sebelum benih dipanen.' },
      { num: '2', title: 'Tahap 2: Pengujian Pra-DHT', desc: 'Pengukuran kadar air awal gabah benih sebelum dimasukkan ke dalam ruang oven pemanas.' },
      { num: '3', title: 'Tahap 3: Log Oven DHT 24 Jam (50°C)', desc: 'Masukkan batch ke dalam oven khusus Dry Heat Treatment pada suhu target 50°C. Catat waktu mulai di sistem; sistem otomatis menghitung waktu selesai tepat 24 jam kemudian.' },
      { num: '4', title: 'Tahap 4: Uji Pasca-DHT (Buka Kunci Stok)', desc: 'Lakukan uji semai metode Duplo: tabur 100 butir di Tray A dan 100 butir di Tray B. Masukkan jumlah biji tumbuh, ambil foto baki semai via kamera. Jika daya tumbuh ≥ 80%, status otomatis menjadi APPROVED dan kunci stok terbuka!' },
      { num: '5', title: 'Tahap 5: Uji Toples Simpan Berkala', desc: 'Lakukan uji semai ulang setiap 3 sampai 6 bulan untuk toples persediaan yang tersimpan di gudang benih.' }
    ],
    tips: [
      'Gunakan tombol kamera pada formulir QC untuk mengambil dan mengunggah foto baki semai langsung dari tablet atau HP.',
      'Batch benih curah yang baru dibeli dari petani berstatus QUARANTINE dan tidak akan bisa dijual atau dikemas sampai lulus Tahap 4.'
    ],
    warnings: [
      'Suhu target oven DHT harus dijaga stabil antara 45°C - 55°C (rekomendasi 50°C) agar embrio benih tidak mati terbakar.',
      'Jangan mengeluarkan toples dari oven DHT sebelum genap 24 jam pemanasan.'
    ]
  },

  'pembelian': {
    title: 'Pembelian & Pengadaan Benih Petani',
    icon: '🛒',
    tagline: 'Pencatatan pasokan benih petani penangkar, perhitungan HPP Landed Cost, dan saldo awal persediaan.',
    purpose: 'Mencatat faktur masuk bahan baku dari petani mitra atau perlengkapan dari supplier luar, menghitung HPP bersih (harga beli + biaya kirim/sortir), menerbitkan nomor lot batch FIFO baru, serta mencatat saldo awal pembukaan toko.',
    steps: [
      { num: '1', title: 'Buka Formulir Pengadaan Baru', desc: 'Klik tombol "+ Pembelian Baru" pada menu Pembelian Stok.' },
      { num: '2', title: 'Pilih Supplier & Petani Mitra', desc: 'Pilih nama pemasok dan petani penangkar asli (atau klik "+ Baru" untuk mendaftarkan petani baru).' },
      { num: '3', title: 'Input Nomor Faktur / Surat Jalan', desc: 'Masukkan nomor faktur dari petani (misal: INV-PETANI-01), atau ketik SA-2026-PERDANA jika digunakan untuk input stok awal.' },
      { num: '4', title: 'Tambah Rincian Barang & HPP', desc: 'Pilih produk, tentukan nomor batch fisik pada karung/toples, masukkan jumlah kuantitas, harga beli, dan biaya ekstra per unit jika ada.' },
      { num: '5', title: 'Tentukan Tanggal Kedaluwarsa', desc: 'Tentukan tanggal panen dan estimasi kedaluwarsa benih, lalu klik "💾 Simpan Pengadaan".' }
    ],
    tips: [
      'Untuk memasukkan Stok Awal saat toko baru buka, buat supplier bernama "SALDO AWAL TOKO" dan masukkan seluruh stok fisik yang ada di toko.',
      'Produk sachet kemasan dan barang non-benih (buku/media) langsung aktif di Kasir POS, sedangkan benih curah otomatis diarahkan ke alur QC.'
    ],
    warnings: [
      'Pastikan harga beli diisi dengan benar karena akan menjadi acuan dasar perhitungan modal HPP dan valuasi aset toko.'
    ]
  },

  'konsinyasi': {
    title: 'Konsinyasi Toko Cabang & Outlet Mitra',
    icon: '🤝',
    tagline: 'Penerbitan Surat Jalan, dual digital signature, dan audit stok opname lapangan (MOV).',
    purpose: 'Mengelola persediaan benih yang dititipkan di toko-toko mitra luar (seperti Bali Buda, toko organik), mencatat tanda tangan serah terima, menghitung benih laku saat kunjungan, dan merekonsiliasi bagi hasil komisi.',
    steps: [
      { num: '1', title: 'Kirim Barang Baru (Surat Jalan Transfer)', desc: 'Buka detail outlet mitra ➔ klik "+ Surat Jalan Pengiriman Baru" ➔ pilih produk sachet dan kuantitas ➔ simpan dan terbitkan Surat Jalan.' },
      { num: '2', title: 'Minta Dual Tanda Tangan Digital', desc: 'Buka Surat Jalan, minta tanda tangan digital penerima toko mitra langsung di layar sentuh HP/tablet saat barang diserahterimakan.' },
      { num: '3', title: 'Kunjungan Rutin & Stok Opname Lapangan', desc: 'Saat berkunjung ke outlet, buka detail outlet ➔ klik "📋 Mulai Stok Opname Lapangan".' },
      { num: '4', title: 'Hitung Sisa di Rak Display Mitra', desc: 'Ketik sisa fisik nyata di rak toko mitra, catat barang retur (jika ada kemasan rusak/expired), dan catat restock baru yang dibawa.' },
      { num: '5', title: 'Kalkulasi Otomatis Barang Terjual (MOV)', desc: 'Sistem otomatis menghitung benih yang laku: Terjual = Saldo Awal + Restock - Retur - Sisa Fisik. Sistem menghitung omzet bersih dan komisi mitra, lalu kirim Berita Acara via WhatsApp!' }
    ],
    tips: [
      'Gunakan fitur cetak Surat Jalan A4 rangkap 2: satu lembar untuk arsip toko dan satu lembar diserahkan ke toko mitra.',
      'Perhatikan badge interval kunjungan: sistem memberi tanda kuning (perlu jadwal) jika sudah 15 hari dan merah (mendesak) jika > 30 hari belum dikunjungi.'
    ],
    warnings: [
      'Jangan meninggalkan outlet mitra tanpa tanda tangan digital pihak toko pada Berita Acara Opname (MOV).'
    ]
  },

  'piutang': {
    title: 'Piutang & Pembayaran Tempo Pelanggan',
    icon: '👥',
    tagline: 'Monitoring jatuh tempo nota pelanggan, pencatatan pembayaran cicilan, dan pengingat WA.',
    purpose: 'Menjaga kelancaran arus kas toko dengan memonitor tagihan belanja tempo pelanggan, mencatat pelunasan bertahap atau lunas, serta mengirimkan pesan pengingat tagihan santun via WhatsApp.',
    steps: [
      { num: '1', title: 'Pantau Daftar Piutang & Jatuh Tempo', desc: 'Tinjau daftar nota yang belum lunas. Perhatikan badge merah "JATUH TEMPO" untuk piutang yang telah melewati tanggal batas pembayaran.' },
      { num: '2', title: 'Catat Pembayaran Cicilan / Pelunasan', desc: 'Klik tombol "Bayar Piutang" pada baris nota terkait. Masukkan nominal yang dibayarkan pembeli (bisa dicicil bertahap atau dilunasi penuh).' },
      { num: '3', title: 'Pilih Rekening Penerimaan', desc: 'Pilih metode pembayaran: Tunai (masuk laci kasir) atau Transfer Bank (masuk rekening yayasan).' },
      { num: '4', title: 'Cetak Kuitansi & Kirim Bukti', desc: 'Cetak tanda terima resmi pelunasan piutang atau kirimkan konfirmasi pelunasan ke nomor WhatsApp pelanggan.' }
    ],
    tips: [
      'Gunakan tombol "Kirim Pengingat WA" untuk mengirimkan pesan rincian tagihan ramah lengkap dengan nomor rekening bank resmi toko.',
      'Sisa piutang akan otomatis berkurang secara real-time setiap kali pembayaran dicatat.'
    ],
    warnings: [
      'Pastikan dana transfer pelanggan sudah benar-benar masuk dan terverifikasi di mutasi rekening bank yayasan sebelum mencatat pelunasan.'
    ]
  },

  'laporan': {
    title: 'Laporan Penjualan, Valuasi Aset & Tutup Buku',
    icon: '📊',
    tagline: 'Analisis laba kotor FIFO asli, valuasi persediaan, dan penguncian periode cut-off akhir bulan.',
    purpose: 'Menyajikan analisis menyeluruh mengenai omzet toko, modal pokok penjualan (HPP) berbasis batch FIFO, total nilai uang aset sisa persediaan, serta mengunci pembukuan akhir bulan dengan arsip .JSON dan Excel multi-sheet.',
    steps: [
      { num: '1', title: 'Tab 1: Laporan Penjualan & Margin FIFO', desc: 'Tinjau grafik tren omzet harian, filter periode (Hari Ini, 7 Hari, Bulan Ini, atau Rentang Tanggal), serta periksa margin laba kotor riil (Omzet - HPP FIFO).' },
      { num: '2', title: 'Tab 2: Posisi Stok & Valuasi Aset', desc: 'Lihat seluruh saldo fisik toples dan sachet, periksa total valuasi modal persediaan dalam Rupiah, dan gunakan tombol "📋 Cetak Lembar Opname Fisik (A4)" untuk audit fisik di toko.' },
      { num: '3', title: 'Tab 3: Tutup Buku & Cut-Off Periode (Akhir Bulan)', desc: 'Klik tombol "⚡ Tutup Buku Periode". Wizard interaktif akan mengkalkulasi seluruh transaksi dan posisi stok sisa.' },
      { num: '4', title: 'Kunci & Terbitkan Saldo Awal', desc: 'Beri nama periode (misal: Tutup Buku Oktober 2026), periksa rangkuman, lalu klik "🔒 Kunci & Terbitkan Saldo Awal".' },
      { num: '5', title: 'Unduh Berkas Arsip Resmi', desc: 'Unduh arsip: tombol 💾 .JSON (backup digital IT), tombol 📊 Excel (lembar kerja Ringkasan & Saldo Awal), dan 🖨️ Berita Acara A4.' }
    ],
    tips: [
      'Gunakan tombol "🖨️ Cetak Valuasi Aset (A4)" pada Tab Posisi Stok untuk lampiran laporan resmi ke pengurus yayasan.',
      'Setelah tutup buku selesai, seluruh sisa stok resmi terkunci menjadi Saldo Awal (Opening Balance) periode berikutnya.'
    ],
    warnings: [
      'Sistem memiliki proteksi Anti-Backdating: transaksi dengan tanggal mundur pada/sebelum cut-off otomatis dilarang demi menjaga integritas laporan yang telah diaudit.'
    ]
  },

  'pengaturan': {
    title: 'Pengaturan Sistem & Hak Akses',
    icon: '⚙️',
    tagline: 'Profil toko, logo struk, ukuran printer thermal, hak akses peran, dan akun kasir.',
    purpose: 'Mengonfigurasi identitas resmi toko pada struk dan dokumen, menentukan hak akses pengguna (Admin vs Kasir), mengatur lebar kertas printer thermal (58mm/80mm), dan menghubungkan notifikasi HP.',
    steps: [
      { num: '1', title: 'Profil Toko & Kontak', desc: 'Atur nama toko, alamat lengkap di Tabanan, nomor telepon/WhatsApp, dan pesan footer struk belanja.' },
      { num: '2', title: 'Unggah Logo Toko', desc: 'Unggah logo resmi toko berlatar belakang transparan atau putih agar tercetak indah di struk thermal dan dokumen A4.' },
      { num: '3', title: 'Preferensi Printer Kasir', desc: 'Tentukan ukuran lebar kertas printer thermal: 58 mm (printer mini bluetooth) atau 80 mm (printer meja kasir).' },
      { num: '4', title: 'Manajemen Akun Staf', desc: 'Buat akun pengguna baru, tentukan username, kata sandi, dan peran (Admin atau Kasir).' }
    ],
    tips: [
      'Centang opsi "Cetak Otomatis Setelah Pembayaran Sukses" jika ingin dialog printer langsung muncul setiap kali transaksi kasir selesai.',
      'Ganti kata sandi secara berkala untuk menjaga keamanan data toko.'
    ],
    warnings: [
      'Jangan memberikan hak akses Admin kepada staf umum untuk mencegah perubahan konfigurasi yang tidak disengaja.'
    ]
  }
};

// Fungsi membuka panduan sesuai halaman yang sedang aktif saat ini
function openCurrentPageGuide() {
  let route = 'dashboard';
  try {
    route = (location.hash || '#dashboard').replace('#', '').trim().toLowerCase() || 'dashboard';
  } catch (e) {
    route = 'dashboard';
  }
  openModuleGuide(route);
}

// Fungsi membuka modal panduan interaktif
function openModuleGuide(moduleKey) {
  let key = String(moduleKey || 'dashboard').trim().toLowerCase();
  if (key === 'kemas') key = 'produksi';
  if (key === 'pelanggan' || key === 'crm') key = 'piutang';
  if (key === 'stok-valuasi' || key === 'valuasi-stok') key = 'laporan';
  if (!KIOS_SOP_GUIDES[key]) key = 'dashboard';

  const g = KIOS_SOP_GUIDES[key] || KIOS_SOP_GUIDES['dashboard'];

  // Bangun daftar opsi pemilih topik
  const allKeys = [
    { k: 'pos', name: '🛒 Kasir & Penjualan (POS)' },
    { k: 'produk', name: '📦 Katalog Master Produk' },
    { k: 'stok', name: '📦 Stok & Batch FIFO' },
    { k: 'produksi', name: '🌾 Kemas Mandiri (Produksi)' },
    { k: 'qc', name: '🔬 Quality Control (QC)' },
    { k: 'pembelian', name: '🛒 Pembelian & Pengadaan' },
    { k: 'konsinyasi', name: '🤝 Konsinyasi Toko Mitra' },
    { k: 'piutang', name: '👥 Pelanggan & Piutang' },
    { k: 'laporan', name: '📊 Laporan & Tutup Buku' },
    { k: 'pengaturan', name: '⚙️ Pengaturan Sistem' },
    { k: 'dashboard', name: '🏠 Dashboard Ringkasan' }
  ];

  const selectOptionsHtml = allKeys.map(function (item) {
    const isSel = (item.k === key) ? ' selected' : '';
    return '<option value="' + item.k + '"' + isSel + '>' + escapeHtml(item.name) + '</option>';
  }).join('');

  // 1. Langkah-langkah
  const stepsHtml = (g.steps || []).map(function (s) {
    return '<div style="display:flex;gap:12px;margin-bottom:12px;background:#FAFAFA;border:1px solid #E5E7EB;border-radius:8px;padding:12px;">' +
      '<div style="width:28px;height:28px;border-radius:50%;background:var(--primary,#1b5e20);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">' + escapeHtml(s.num) + '</div>' +
      '<div>' +
      '<div style="font-weight:700;font-size:13px;color:var(--text-main,#111827);margin-bottom:3px;">' + escapeHtml(s.title) + '</div>' +
      '<div style="font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.5;">' + escapeHtml(s.desc) + '</div>' +
      '</div>' +
      '</div>';
  }).join('');

  // 2. Tips Praktis
  const tipsHtml = (g.tips || []).map(function (t) {
    return '<li style="margin-bottom:6px;line-height:1.45;">' + escapeHtml(t) + '</li>';
  }).join('');

  // 3. Pantangan / Peringatan
  const warningsHtml = (g.warnings || []).map(function (w) {
    return '<li style="margin-bottom:6px;line-height:1.45;">' + escapeHtml(w) + '</li>';
  }).join('');

  const bodyHtml =
    '<!-- PEMILIH TOPIK CEPAT -->' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;background:#F3F4F6;padding:8px 12px;border-radius:6px;flex-wrap:wrap;gap:8px;">' +
    '<div style="font-size:12px;font-weight:700;color:var(--text-secondary,#4B5563);"><i class="fas fa-compass" style="margin-right:5px;"></i>Pilih Topik Panduan Lain:</div>' +
    '<select id="guide-topic-select" class="input" onchange="openModuleGuide(this.value)" style="font-size:12.5px;padding:5px 10px;border-radius:4px;border:1px solid #D1D5DB;background:#FFF;font-weight:600;color:var(--primary,#1b5e20);">' +
    selectOptionsHtml +
    '</select>' +
    '</div>' +

    '<!-- HEADER MODUL -->' +
    '<div style="margin-bottom:16px;border-bottom:1px solid #E5E7EB;padding-bottom:10px;">' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">' +
    '<span style="font-size:26px;">' + g.icon + '</span>' +
    '<div>' +
    '<h2 style="margin:0;font-size:18px;color:var(--text-main,#111827);">' + escapeHtml(g.title) + '</h2>' +
    '<div style="font-size:12px;color:var(--text-secondary,#6B7280);margin-top:2px;">' + escapeHtml(g.tagline) + '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +

    '<!-- TUJUAN FITUR -->' +
    '<div style="background:#F0FDF4;border-left:4px solid #16A34A;padding:10px 14px;border-radius:0 6px 6px 0;margin-bottom:16px;">' +
    '<div style="font-weight:700;font-size:12px;color:#166534;margin-bottom:2px;">🎯 TUJUAN &amp; FUNGSI FITUR:</div>' +
    '<div style="font-size:12px;color:#14532D;line-height:1.5;">' + escapeHtml(g.purpose) + '</div>' +
    '</div>' +

    '<!-- LANGKAH DEMI LANGKAH OPERASIONAL -->' +
    '<div style="margin-bottom:16px;">' +
    '<h3 style="font-size:14px;font-weight:700;margin-bottom:10px;color:var(--text-main,#111827);display:flex;align-items:center;gap:6px;">' +
    '<span>🔢</span> Langkah Operasional Harian (SOP 1-2-3):' +
    '</h3>' +
    stepsHtml +
    '</div>' +

    '<!-- TIPS & PERINGATAN (GRID 2 KOLOM) -->' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:10px;">' +
    (tipsHtml ? (
      '<div style="background:#FEFCE8;border:1px solid #FEF08A;border-radius:8px;padding:12px;">' +
      '<div style="font-weight:700;font-size:12.5px;color:#854D0E;margin-bottom:6px;">💡 Tips Praktis Kasir / Staf:</div>' +
      '<ul style="margin:0;padding-left:18px;font-size:11.5px;color:#713F12;">' + tipsHtml + '</ul>' +
      '</div>'
    ) : '') +
    (warningsHtml ? (
      '<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px;">' +
      '<div style="font-weight:700;font-size:12.5px;color:#991B1B;margin-bottom:6px;">⚠️ Hal yang Harus Dihindari:</div>' +
      '<ul style="margin:0;padding-left:18px;font-size:11.5px;color:#7F1D1D;">' + warningsHtml + '</ul>' +
      '</div>'
    ) : '') +
    '</div>';

  const footerHtml =
    '<div style="display:flex;justify-content:space-between;align-items:center;width:100%;flex-wrap:wrap;gap:8px;">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="printModuleSOP(\'' + key + '\')" style="display:inline-flex;align-items:center;gap:6px;" title="Cetak Lembar SOP A4 untuk Ditempel di Dinding / Meja">' +
    '<span>🖨️</span> Cetak Lembar SOP (A4)' +
    '</button>' +
    '<button type="button" class="btn btn-primary" onclick="closeModal()">Paham &amp; Tutup</button>' +
    '</div>';

  openModal('Panduan SOP: ' + g.title, bodyHtml, footerHtml, true);
}

// Fungsi mencetak 1 lembar A4 ringkasan SOP untuk ditempel di dinding/meja kerja
function printModuleSOP(moduleKey) {
  let key = String(moduleKey || 'dashboard').trim().toLowerCase();
  if (key === 'kemas') key = 'produksi';
  if (key === 'pelanggan' || key === 'crm') key = 'piutang';
  if (key === 'stok-valuasi' || key === 'valuasi-stok') key = 'laporan';
  if (!KIOS_SOP_GUIDES[key]) key = 'dashboard';

  const g = KIOS_SOP_GUIDES[key] || KIOS_SOP_GUIDES['dashboard'];
  const s = APP_SETTINGS || {};
  const storeName = s.store_name || 'Toko Kasir & Inventaris';
  const storeAddress = s.store_address || 'Banjar Baturinggit, Desa Belayu, Kec. Marga, Tabanan - Bali';
  const storeLogo = s.store_logo || s.store_logo_light || '';

  let existingPrint = document.getElementById('print-report-container');
  if (existingPrint) existingPrint.remove();

  const printContainer = document.createElement('div');
  printContainer.id = 'print-report-container';
  printContainer.className = 'print-report-area';

  const logoHtml = storeLogo
    ? '<img src="' + escapeHtml(storeLogo) + '" alt="Logo" style="max-height:50px;max-width:180px;display:block;margin:0 auto 4px auto;object-fit:contain;">'
    : '<h2 style="margin:0 0 2px 0;font-size:16px;text-transform:uppercase;color:#1A1A1A;">' + escapeHtml(storeName) + '</h2>';

  const stepsHtml = (g.steps || []).map(function (step) {
    return '<div style="margin-bottom:10px;padding:6px 10px;border-left:3px solid #1b5e20;background:#f9f9f9;">' +
      '<div style="font-weight:bold;font-size:11.5px;color:#111;">' + escapeHtml(step.num) + '. ' + escapeHtml(step.title) + '</div>' +
      '<div style="font-size:10.5px;color:#333;margin-top:2px;line-height:1.4;">' + escapeHtml(step.desc) + '</div>' +
      '</div>';
  }).join('');

  const tipsHtml = (g.tips || []).map(function (t) {
    return '<li style="margin-bottom:4px;">' + escapeHtml(t) + '</li>';
  }).join('');

  const warningsHtml = (g.warnings || []).map(function (w) {
    return '<li style="margin-bottom:4px;">' + escapeHtml(w) + '</li>';
  }).join('');

  printContainer.innerHTML =
    '<div style="text-align:center;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:12px;">' +
    logoHtml +
    '<div style="font-size:10px;color:#555;">' + escapeHtml(storeAddress) + '</div>' +
    '<div style="margin-top:6px;display:inline-block;padding:3px 12px;background:#e8f5e9;border-radius:4px;font-size:12px;font-weight:700;color:#1b5e20;letter-spacing:0.5px;">' +
    'STANDAR OPERASIONAL PROSEDUR (SOP): ' + escapeHtml(g.title).toUpperCase() +
    '</div>' +
    '<div style="font-size:9.5px;color:#666;margin-top:3px;">Sistem Kasir &amp; Inventaris Terpadu &bull; Dicetak: ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + '</div>' +
    '</div>' +

    '<div style="margin-bottom:10px;padding:6px 10px;background:#f0fdf4;border:1px solid #bbf7d0;font-size:10.5px;line-height:1.4;color:#14532d;">' +
    '<strong>Tujuan Modul:</strong> ' + escapeHtml(g.purpose) +
    '</div>' +

    '<div style="margin-bottom:12px;">' +
    '<div style="font-weight:bold;font-size:11.5px;border-bottom:1.5px solid #1b5e20;padding-bottom:3px;margin-bottom:8px;color:#1b5e20;">' +
    'LANGKAH KERJA OPERASIONAL HARIAN (SOP)' +
    '</div>' +
    stepsHtml +
    '</div>' +

    '<div style="display:flex;gap:12px;margin-bottom:14px;">' +
    (tipsHtml ? (
      '<div style="flex:1;padding:8px 10px;background:#fefce8;border:1px solid #fef08a;font-size:9.5px;">' +
      '<strong style="color:#854d0e;">Tips Efisiensi &amp; Praktik Baik:</strong>' +
      '<ul style="margin:4px 0 0 14px;padding:0;color:#713f12;">' + tipsHtml + '</ul>' +
      '</div>'
    ) : '') +
    (warningsHtml ? (
      '<div style="flex:1;padding:8px 10px;background:#fef2f2;border:1px solid #fecaca;font-size:9.5px;">' +
      '<strong style="color:#991b1b;">Pantangan &amp; Hal yang Dilarang:</strong>' +
      '<ul style="margin:4px 0 0 14px;padding:0;color:#7f1d1d;">' + warningsHtml + '</ul>' +
      '</div>'
    ) : '') +
    '</div>' +

    '<div style="display:flex;justify-content:space-between;margin-top:20px;padding:0 20px;font-size:10px;color:#111827;page-break-inside:avoid;">' +
    '<div style="text-align:center;width:180px;">' +
    '<div>Disusun Oleh:</div>' +
    '<div style="margin-top:35px;border-top:1px solid #444;font-weight:bold;padding-top:2px;">Staf Pelaksana Unit</div>' +
    '</div>' +
    '<div style="text-align:center;width:180px;">' +
    '<div>Disetujui Oleh:</div>' +
    '<div style="margin-top:35px;border-top:1px solid #444;font-weight:bold;padding-top:2px;">Koordinator Toko</div>' +
    '</div>' +
    '</div>';

  document.body.appendChild(printContainer);
  setTimeout(function () {
    window.print();
  }, 250);
}


