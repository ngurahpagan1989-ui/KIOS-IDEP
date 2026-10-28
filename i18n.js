/**
 * =============================================================================
 * KIOS IDEP POS - Multi-Language (i18n) Engine & Translation Dictionary
 * Version: 2.0.0 (Comprehensive English & Indonesian Edition)
 * Supports: Bahasa Indonesia (ID) & English (EN)
 * =============================================================================
 */

(function (window) {
  'use strict';

  var STORAGE_KEY = 'idep_language';
  var DEFAULT_LANG = 'id';

  var currentLang = DEFAULT_LANG;
  try {
    var savedLang = localStorage.getItem(STORAGE_KEY);
    if (savedLang === 'en' || savedLang === 'id') {
      currentLang = savedLang;
    }
  } catch (e) {
    currentLang = DEFAULT_LANG;
  }

  // ===========================================================================
  // COMPREHENSIVE TRANSLATION DICTIONARY (ID -> EN)
  // ===========================================================================
  var DICTIONARY = {
    '-- Belum ada supplier, klik "+ Baru" --': '-- No suppliers yet, click "+ New" --',
    '-- Pilih Bahan Baku Curah --': '-- Select Bulk Raw Material --',
    '-- Pilih Bahan Baku Dulu --': '-- Select Raw Material First --',
    '-- Pilih Batch / Lot --': '-- Select Batch / Lot --',
    '-- Pilih Batch Antrean QC --': '-- Select QC Queue Batch --',
    '-- Pilih Kemasan Pcs --': '-- Select Packaged Pcs --',
    '-- Pilih Petani Penangkar --': '-- Select Seed Grower Farmer --',
    '-- Pilih Produk Benih --': '-- Select Seed Product --',
    '-- Pilih Varietas Benih --': '-- Select Seed Variety --',
    '-- Tidak ada produk --': '-- No products --',
    '( Bagian Keuangan / Kasir )': '( Finance / Cashier Department )',
    '(Hak akses baca / view-only). Tombol input, aksi tambah, ubah, dan hapus dinonaktifkan.': '(Read-only access). Create, edit, and delete buttons are disabled.',
    '(Tanda tangan tidak tersedia)': '(Signature not available)',
    '(Tanpa foto)': '(No photo)',
    '(Tidak ada rincian item)': '(No item details)',
    '(tidak diketahui)': '(unknown)',
    '(Tunai)': '(Cash)',
    '[HAPUS/BATAL]': '[DELETE/VOID]',
    '[INPUT/UBAH]': '[CREATE/EDIT]',
    '[LIHAT]': '[VIEW]',
    '*** TRANSAKSI DIBATALKAN (VOID) ***': '*** TRANSACTION VOIDED ***',
    '&#8635; Segarkan': '&#8635; Refresh',
    '&laquo; Sebelumnya': '&laquo; Previous',
    '+ Ajukan Klaim Garansi': '+ Submit Warranty Claim',
    '+ Baru': '+ New',
    '+ Buat Batch': '+ Create Batch',
    '+ Buat Batch Baru': '+ Create New Batch',
    '+ Catat Pengeluaran': '+ Record Expense',
    '+ Catat Pengeluaran Baru': '+ Record New Expense',
    '+ Drop / Transfer Stok Baru': '+ Drop / Transfer New Stock',
    '+ Input Pembelian': '+ New Purchase',
    '+ Input Pembelian Baru': '+ New Purchase Entry',
    '+ Member Lengkap': '+ Full Member Details',
    '+ Mulai Prosedur Recall': '+ Initiate Recall Procedure',
    '+ Pembelian Baru': '+ New Purchase',
    '+ Penyesuaian Stok (Koreksi)': '+ Stock Adjustment (Correction)',
    '+ Rekam Klaim Kebun': '+ New Garden Claim',
    '+ Rekam Klaim Kebun Baru': '+ Record New Garden Claim',
    '+ Restock Baru': '+ New Restock',
    '+ Tambah': '+ Add',
    '+ Tambah Akun Pengguna': '+ Add User Account',
    '+ Tambah Baris': '+ Add Row',
    '+ Tambah Baris Barang': '+ Add Item Row',
    '+ Tambah Kategori': '+ Add Category',
    '+ Tambah Outlet Mitra': '+ Add Partner Outlet',
    '+ Tambah Pelanggan': '+ Add Customer',
    '+ Tambah Pelanggan Baru': '+ Add New Customer',
    '+ Tambah Pengguna Baru': '+ Add New User',
    '+ Tambah Peran Baru': '+ Add New Role',
    '+ Tambah Peran Hak Akses Baru': '+ Add New Role Permission',
    '+ Tambah Petani': '+ Add Farmer',
    '+ Tambah Petani Mitra': '+ Add Partner Farmer',
    '+ Tambah Petani Penangkar': '+ Add Seed Farmer',
    '+ Tambah Preset Tier Baru': '+ Add New Price Tier Preset',
    '+ Tambah Produk': '+ Add Product',
    '+ Tambah Produk Baru': '+ Add New Product',
    '+ Tambah Supplier': '+ Add Supplier',
    '+ Tambah Toko Mitra': '+ Add Partner Store',
    '+ Tambah Transaksi': '+ Add Transaction',
    '+ Tambah Varietas Benih': '+ Add Seed Variety',
    '+ Titip Konsinyasi': '+ New Consignment',
    '+ Uji QC': '+ QC Test',
    '⏳ Proses DHT': '⏳ DHT Processing',
    '⚠️ Batalkan (Void)': '⚠️ Void Invoice',
    '⚠️ Batalkan Transaksi (Void)': '⚠️ Void Transaction',
    '⚠️ Kesehatan Stok & Expired': '⚠️ Stock Health & Expiration',
    '⚠️ Kesehatan Stok &amp; Expired': '⚠️ Stock Health & Expiration',
    '⚠️ Menunggu Uji': '⚠️ Awaiting Testing',
    '⚡ Kirim & Terbitkan Surat Jalan': '⚡ Send & Issue Delivery Order',
    '⚡ Proses & Terbitkan Stok Kemasan': '⚡ Process & Issue Packaged Stock',
    '⚡ Proses &amp; Terbitkan Stok Kemasan': '⚡ Process & Issue Packaged Stock',
    '⛔ Karantina/Gagal': '⛔ Quarantine/Failed',
    '🇬🇧 English (International)': '🇬🇧 English (International)',
    '🇮🇩 Bahasa Indonesia (Standar)': '🇮🇩 Bahasa Indonesia (Default)',
    '✅ Lolos Mutu': '✅ Quality Passed',
    '✏️ [Input/Ubah]': '✏️ [Create/Edit]',
    '✏️ Koreksi': '✏️ Adjust',
    '✏️ Koreksi Nota': '✏️ Invoice Correction',
    '✓ Kuantitas sachet/benih telah dikembalikan ke stok batch fisik.': '✓ Packet/seed quantity has been returned to physical batch stock.',
    '✕ Tutup': '✕ Close',
    '➕ Tiket Komplain': '➕ Complaint Ticket',
    '🌱 Benih (Memerlukan QC & Uji Semai)': '🌱 Seed (Requires QC & Germination Test)',
    '🌱 Klaim Benih': '🌱 Seed Claim',
    '🌾 Pangan & Beras Merah (Bebas QC)': '🌾 Food & Brown Rice (QC-Free)',
    '🌾 Penyerapan Petani Penangkar': '🌾 Seed Farmer Offtake',
    '🌿 Bibit Tanaman Hidup (Bebas QC)': '🌿 Live Seedlings (QC-Free)',
    '🏛️ Faktur Formal (A4)': '🏛️ Formal Invoice (A4)',
    '🏢 Kontribusi Kanal': '🏢 Channel Contribution',
    '🏪 Konsinyasi & Cabang': '🏪 Consignment & Branches',
    '🏪 Konsinyasi &amp; Cabang': '🏪 Consignment & Branches',
    '🏪 Toko Cabang & Mitra': '🏪 Branch Stores & Partners',
    '🏪 Toko Cabang &amp; Mitra': '🏪 Branch Stores & Partners',
    '👁️ [Lihat]': '👁️ [View]',
    '👁️ Lihat Detail': '👁️ View Details',
    '👕 Merchandise & Kaos (Bebas QC)': '👕 Merchandise & Shirts (QC-Free)',
    '💬 Kirim Berita Acara via WhatsApp': '💬 Send Official Report via WhatsApp',
    '💬 Kirim WA': '💬 Send WhatsApp',
    '💾 Simpan Format Batch & Multi-Tier': '💾 Save Batch Format & Multi-Tier',
    '📄 Faktur Minimalis': '📄 Minimalist Invoice',
    '📄 PDF': '📄 PDF',
    '📈 Laporan Penjualan & Margin FIFO': '📈 Sales Reports & FIFO Margin',
    '📊 Rotasi Produk (Top & Slow)': '📊 Product Turnover (Top & Slow)',
    '📊 Rotasi Produk (Top &amp; Slow)': '📊 Product Turnover (Top & Slow)',
    '📋 Cetak Lembar Opname Fisik (A4)': '📋 Print Physical Stocktake Sheet (A4)',
    '📋 Salin': '📋 Copy',
    '📚 Buku & Publikasi (Bebas QC)': '📚 Books & Publications (QC-Free)',
    '📥 Ekspor CSV/Excel': '📥 Export CSV/Excel',
    '📦 Lainnya / Non-Benih (Bebas QC)': '📦 Other / Non-Seed (QC-Free)',
    '📦 Posisi Stok & Valuasi': '📦 Stock Position & Valuation',
    '📦 Posisi Stok & Valuasi Aset': '📦 Stock Position & Asset Valuation',
    '📦 Posisi Stok &amp; Valuasi': '📦 Stock Position & Valuation',
    '📦 Posisi Stok &amp; Valuasi Aset': '📦 Stock Position & Asset Valuation',
    '📲 Kirim WA': '📲 Send WhatsApp',
    '🔄 30 Hari': '🔄 30 Days',
    '🔄 Ganti Foto': '🔄 Replace Photo',
    '🔄 Ulangi / Hapus': '🔄 Retry / Clear',
    '🔍 Cari nomor nota, pelanggan, atau metode bayar...': '🔍 Search receipt number, customer, or payment method...',
    '🔍 Filter': '🔍 Filter',
    '🔍 Rincian': '🔍 Details',
    '🔍 Rincian Lengkap': '🔍 Full Details',
    '🔎 Lacak Batch': '🔎 Track Batch',
    '🔎 Terapkan': '🔎 Apply',
    '🔒 Buka Kunci Rekening': '🔒 Unlock Bank Account',
    '🔔 Uji Kirim Notifikasi': '🔔 Test Send Notification',
    '🔬 Uji Berkala': '🔬 Periodic Retest',
    '🖨️ Cetak / Simpan PDF': '🖨️ Print / Save PDF',
    '🖨️ Cetak Rekap Laporan (A4/PDF)': '🖨️ Print Report Summary (A4/PDF)',
    '🖨️ Cetak SJ': '🖨️ Print DO',
    '🖨️ Cetak Struk (PDF)': '🖨️ Print Receipt (PDF)',
    '🗑️ [Hapus/Batal]': '🗑️ [Delete/Void]',
    '🗑️ Buka Panel Reset Data': '🗑️ Open Reset Data Panel',
    '🧾 Struk Termal (58mm)': '🧾 Thermal Receipt (58mm)',
    '🪴 Media Tanam & Kompos (Bebas QC)': '🪴 Growing Media & Compost (QC-Free)',
    '1 Uji': '1 Test',
    '1. Pilih Varietas Benih': '1. Select Seed Variety',
    '1. Uji Lapangan Petani': '1. Farmer Field Test',
    '2 Uji': '2 Tests',
    '2. Pilih Lot Batch yang Disesuaikan': '2. Select Batch Lot to Adjust',
    '2. Uji Semai Kantor (Pre-DHT)': '2. Office Germination Test (Pre-DHT)',
    '3 Uji': '3 Tests',
    '3. Arah Koreksi': '3. Correction Direction',
    '3. Log DHT 1 Hari': '3. 1-Day DHT Oven Log',
    '30 Hari': '30 Days',
    '360° Detail': '360° Details',
    '4. Kategori Alasan': '4. Reason Category',
    '4. Uji Semai Pasca-DHT': '4. Post-DHT Germination Test',
    '5 Produk Paling Laris': 'Top 5 Best-Selling Products',
    '5 Produk Slow-Moving': 'Top 5 Slow-Moving Products',
    '5. Jumlah Kuantitas Penyesuaian (pcs/gr)': '5. Adjustment Quantity (pcs/gr)',
    '5. Uji Berkala / Semai Ulang (Toples Simpan > 6 Bulan)': '5. Periodic / Retest (> 6 Months Storage)',
    '6. Catatan Rinci & Keterangan Petugas': '6. Detailed Notes & Officer Remarks',
    '7 Hari': '7 Days',
    'Admin': 'Admin',
    'Admin Utama': 'Main Admin',
    'Agustus': 'August',
    'Ajukan Klaim Garansi': 'Submit Warranty Claim',
    'Ajukan klaim garansi benih dari nota ini': 'Submit seed warranty claim from this receipt',
    'Akses ditolak': 'Access denied',
    'Akses Terbatas': 'Restricted Access',
    'Aksi': 'Action',
    'Aksi Cepat': 'Quick Actions',
    'Aksi Penarikan': 'Recall Action',
    'Aksi Serah Terima': 'Handover Action',
    'Aksi Surat Jalan': 'Delivery Order Action',
    'Aktif': 'Active',
    'Aktif (Bisa Terima Drop Stok)': 'Active (Can Receive Stock Drops)',
    'Aktifkan': 'Activate',
    'Aktivitas Terkini': 'Recent Activities',
    'Akumulasi Nilai Modal HPP Lot': 'Accumulated Batch COGS Value',
    'Akun Pengguna': 'User Accounts',
    'Akun pengguna baru berhasil ditambahkan ke sistem Kios IDEP.': 'New user account added to IDEP Kiosk system successfully.',
    'Alamat / Lokasi Kebun': 'Address / Farm Location',
    'Alamat Fisik Toko': 'Store Physical Address',
    'Alamat Lengkap': 'Full Address',
    'Alamat Lengkap / Lokasi Outlet': 'Full Address / Outlet Location',
    'Alasan pembatalan (void) wajib diisi.': 'Void cancellation reason is required.',
    'Alasan Pembatalan Transaksi': 'Transaction Void Reason',
    'Alert Void Transaksi:': 'Transaction Void Alert:',
    'Aman': 'Safe',
    'Ambang Stok Minimum': 'Minimum Stock Threshold',
    'Ambil atau unggah foto rak pajangan benih di outlet. Foto otomatis dikompresi (maksimal 1000px) sebelum diunggah ke Google Drive.': 'Take or upload outlet shelf photo. Photo is automatically compressed (max 1000px) before Drive upload.',
    'Analisis menyeluruh kinerja keuangan, margin FIFO asli per transaksi belanja, penyerapan petani, dan rotasi stok.': 'Comprehensive analysis of financial performance, authentic FIFO margins, farmer offtake, and stock turnover.',
    'Analisis performa omzet penjualan, estimasi margin kotor, dan valuasi nilai aset benih FIFO.': 'Analyze sales turnover, gross margin estimates, and FIFO seed asset valuations.',
    'Anda masuk sebagai': 'You are logged in as',
    'Antrean FIFO #1 (Prioritas Keluar)': 'FIFO Queue #1 (Outgoing Priority)',
    'Antrean Terdekat': 'Earliest Queue',
    'Antrean Uji QC': 'QC Testing Queue',
    'Apakah Anda yakin ingin melanjutkan tindakan ini?': 'Are you sure you want to proceed with this action?',
    'Apakah Anda yakin ingin membatalkan produksi kemasan ini?': 'Are you sure you want to cancel this repackaging production?',
    'Apakah Anda yakin ingin membatalkan transaksi belanja ini?': 'Are you sure you want to void this sales transaction?',
    'Apakah Anda yakin ingin menghapus akun pengguna ini?': 'Are you sure you want to delete this user account?',
    'Apakah Anda yakin ingin menghapus catatan klaim ini?': 'Are you sure you want to delete this claim record?',
    'Apakah Anda yakin ingin menghapus data ini?': 'Are you sure you want to delete this record?',
    'Apakah Anda yakin ingin menghapus faktur pembelian ini?': 'Are you sure you want to delete this purchase invoice?',
    'Apakah Anda yakin ingin menghapus kategori biaya ini?': 'Are you sure you want to delete this cost category?',
    'Apakah Anda yakin ingin menghapus outlet mitra ini?': 'Are you sure you want to delete this partner outlet?',
    'Apakah Anda yakin ingin menghapus pelanggan ini?': 'Are you sure you want to delete this customer?',
    'Apakah Anda yakin ingin menghapus peran hak akses ini?': 'Are you sure you want to delete this role permission?',
    'Apakah Anda yakin ingin menghapus petani mitra ini?': 'Are you sure you want to delete this partner farmer?',
    'Apakah Anda yakin ingin menghapus supplier ini?': 'Are you sure you want to delete this supplier?',
    'Apakah Anda yakin ingin mengosongkan keranjang belanja?': 'Are you sure you want to clear the shopping cart?',
    'April': 'April',
    'Asal Batch / Supplier': 'Batch Source / Supplier',
    'Asal Petani / Pemasok': 'Origin Farmer / Supplier',
    'Atas Nama': 'Account Holder Name',
    'Atur persentase MDR (Merchant Discount Rate) QRIS dan tentukan skema pembebanan biaya.': 'Set QRIS MDR (Merchant Discount Rate) percentage and determine fee charging scheme.',
    'Audit & Rekonsiliasi': 'Audit & Reconciliation',
    'Audit antrean lot batch': 'Audit batch lot queue',
    'Audit Batch': 'Audit Batch',
    'Audit Opname Fisik': 'Physical Stock Audit',
    'Audit Opname Lapangan, Penanganan Selisih Fisik, Mutasi Retur, Restock Baru di Rak & Rekonsiliasi Berita Acara MOV Resmi': 'Field Stocktake Audit, Physical Discrepancy Handling, Returns, Shelf Restock & Official MOV Reports',
    'Audit stok opname dan pelacakan riwayat mutasi persediaan.': 'Stock opname audit and inventory movement history tracking.',
    'Bagi Hasil / Komisi (%)': 'Revenue Share / Commission (%)',
    'Bahan Baku (Curah/Gram)': 'Raw Material (Bulk/Grams)',
    'Bahan Baku Curah': 'Bulk Raw Material',
    'Bahan Baku Curah (Gram)': 'Bulk Raw Material (Grams)',
    'Bahan Curah (Batch Asal)': 'Bulk Raw Material (Source Batch)',
    'Bahasa / Language': 'Language / Bahasa',
    'Bahasa berhasil diubah ke Bahasa Indonesia.': 'Language successfully changed to Bahasa Indonesia.',
    'Bahasa berhasil diubah ke Bahasa Inggris.': 'Language successfully changed to English.',
    'Baki A': 'Tray A',
    'Baki A (Jumlah Tumbuh 0-50)': 'Tray A (Germinated 0-50)',
    'Baki B': 'Tray B',
    'Baki B (Jumlah Tumbuh 0-50)': 'Tray B (Germinated 0-50)',
    'Bali Buda': 'Bali Buda Partner',
    'Barang Jadi Kemasan (Pcs)': 'Finished Packaged Goods (Pcs)',
    'Barcode / SKU': 'Barcode / SKU',
    'Batal': 'Cancel',
    'Batal Koreksi': 'Cancel Correction',
    'Batalkan (Void)': 'Void Invoice',
    'Batalkan produksi ini?': 'Cancel this production run?',
    'Batalkan produksi ini? Batch kemasan jadi akan dihapus dan modal kuantiti bahan mentah dikembalikan ke batch asal.': 'Cancel this production run? Finished packets batch will be deleted and raw material quantity restored to original batch.',
    'Batalkan Transaksi (Void)': 'Void Transaction',
    'Batalkan Transaksi (VOID)': 'Void Transaction',
    'Batch': 'Batch',
    'Batch / Lot': 'Batch / Lot',
    'Batch Asal': 'Source Batch',
    'Batch berikut otomatis dikarantina karena menerima &ge; 3 komplain daya tumbuh dan': 'The following batch was automatically quarantined for receiving ≥ 3 germination complaints and',
    'Batch berikut otomatis dikarantina karena menerima ≥ 3 komplain daya tumbuh dan': 'The following batch was automatically quarantined for receiving ≥ 3 germination complaints and',
    'Batch diset ke Otomatis (FEFO terdekat)': 'Batch set to Automatic (Earliest FEFO)',
    'Batch terpilih tidak memiliki sisa stok!': 'Selected batch has no remaining stock!',
    'Bayar Piutang': 'Pay Receivable',
    'Bayar Transaksi': 'Pay Transaction',
    'Beban Selisih': 'Discrepancy Expense',
    'Bebas QC (Langsung Aktif)': 'QC-Free (Directly Active)',
    'Belum / Nanti Saja': 'Not Yet / Later',
    'Belum ada akun pengguna.': 'No user accounts yet.',
    'Belum ada catatan klaim garansi benih.': 'No seed warranty claims recorded yet.',
    'Belum ada catatan mutasi persediaan pada periode/filter ini.': 'No inventory mutation records in this period/filter.',
    'Belum ada catatan pengeluaran biaya operasional bulan ini.': 'No operational expense records this month.',
    'Belum ada catatan pengeluaran yang sesuai filter.': 'No expense records match the filter.',
    'Belum ada data pengadaan benih dari petani penangkar pada periode ini.': 'No seed procurement data from grower farmers during this period.',
    'Belum ada data pengujian QC yang sesuai dengan filter ini.': 'No QC test data matching this filter.',
    'Belum ada data produk.': 'No product data yet.',
    'Belum ada data transaksi.': 'No transaction data yet.',
    'Belum ada dokumen Surat Jalan yang diterbitkan pada toko ini.': 'No Delivery Order documents issued for this store.',
    'Belum ada faktur pembelian yang tercatat pada periode ini.': 'No purchase invoices recorded in this period.',
    'Belum ada foto baki': 'No tray photo yet',
    'Belum Ada Logo': 'No Logo Yet',
    'Belum ada outlet mitra terdaftar.': 'No partner outlets registered yet.',
    'Belum ada outlet mitra terdaftar. Klik "+ Tambah Outlet Mitra" untuk mendaftarkan toko mitra baru.': 'No partner outlets registered yet. Click "+ Add Partner Outlet" to register a new partner store.',
    'Belum ada pelanggan terdaftar.': 'No customers registered yet.',
    'Belum ada pembelian tercatat.': 'No purchases recorded yet.',
    'Belum ada riwayat konsultasi kebun yang dicatat pada CRM.': 'No garden consultation records in CRM yet.',
    'Belum ada riwayat pengemasan.': 'No repackaging history yet.',
    'Belum ada stok fisik benih di outlet ini. Lakukan drop stok terlebih dahulu.': 'No physical seed stock at this outlet yet. Please perform a stock drop first.',
    'Belum Dikonfigurasi': 'Not Configured',
    'Belum Ditandatangani': 'Not Signed Yet',
    'Belum Lunas': 'Unpaid',
    'BELUM MEMENUHI': 'NOT MET',
    'Belum pernah bertransaksi.': 'No transactions yet.',
    'Benih Curah': 'Bulk Seeds',
    'Benih di Rak': 'Seeds on Shelf',
    'BENIH DI RAK': 'SEEDS ON SHELF',
    'Berat Curah / Sisa Stok': 'Bulk Weight / Remaining Stock',
    'Berat Curah yang Digunakan (Gram)': 'Bulk Weight Used (Grams)',
    'Berat Isi per Sachet (Gram)': 'Net Weight per Packet (Grams)',
    'Berhasil': 'Success',
    'Berita Acara & Bukti Serah Terima': 'Official Report & Proof of Delivery',
    'Berita Acara Serah Terima Fisik Benih di Lokasi Toko Mitra': 'Official Physical Seed Handover Report at Partner Store',
    'Beritahu administrator seketika saat ada pembatalan / void nota transaksi kasir.': 'Notify administrators immediately upon cashier transaction cancellation / void.',
    'Bersihkan': 'Clear',
    'Bersihkan pencarian': 'Clear search',
    'Biarkan kosong jika tidak ingin mengubah password saat mengedit pengguna.': 'Leave blank if you do not want to change the password when editing user.',
    'Biaya Ekstra/Pcs (Rp)': 'Extra Cost / Pcs (Rp)',
    'Biaya Kemas': 'Packaging Cost',
    'Biaya Kemas:': 'Packaging Cost:',
    'Biaya Kemasan / Pcs (Plastik & Label)': 'Packaging Cost / Pcs (Plastic & Label)',
    'BIAYA KEMASAN / PCS (PLASTIK & LABEL)': 'PACKAGING COST / PCS (PLASTIC & LABEL)',
    'Biaya Kemasan / Pcs (Plastik &amp; Label)': 'Packaging Cost / Pcs (Plastic & Label)',
    'BIAYA KEMASAN / PCS (PLASTIK &amp; LABEL)': 'PACKAGING COST / PCS (PLASTIC & LABEL)',
    'Biaya MDR QRIS dihitung otomatis dan ditambahkan ke total belanja saat kasir memilih metode QRIS di checkout POS.': 'QRIS MDR fee is automatically calculated and added to the total when cashier selects QRIS method.',
    'Biaya operasional harian berhasil dicatat ke buku kas toko.': 'Daily operational expense recorded in store cash book.',
    'Biaya Pokok (HPP)': 'Cost of Goods Sold (COGS)',
    'Biaya Transaksi QRIS': 'QRIS Transaction Fee',
    'Bibit Tanaman Hidup': 'Live Seedlings',
    'Bot Telegram': 'Telegram Bot',
    'Buat Faktur Resmi': 'Create Official Invoice',
    'Bubuhkan tanda tangan langsung menggunakan jari pada layar sentuh atau kursor mouse.': 'Sign directly using your finger on the touchscreen or mouse cursor.',
    'Buka di Google Drive': 'Open in Google Drive',
    'Buka Kamera & Jepret Baki Semai': 'Open Camera & Snap Seed Tray',
    'Buka Kasir': 'Open Cashier',
    'Buka Menu Lengkap': 'Open Full Menu',
    'Buka Menu Navigasi': 'Open Navigation Menu',
    'Buka Panel Reset Data': 'Open Reset Data Panel',
    'Buka PDF Surat Jalan': 'Open Delivery Order PDF',
    'Bukti / Kuitansi': 'Proof / Receipt',
    'Bukti Keaslian & Uji Semai On-Site': 'On-Site Seed Trial & Authenticity Proof',
    'Bukti Serah Terima': 'Proof of Delivery',
    'Buku & Publikasi': 'Books & Publications',
    'Buku Konsultasi Kebun': 'Garden Consultation Logbook',
    'Buku Log Konsultasi Kebun': 'Garden Consultation Logbook',
    'Bulan': 'Months',
    'Bulan Ini': 'This Month',
    'Bulan/Tahun Exp (MM/YY atau YYYY-MM)': 'Exp Month/Year (MM/YY or YYYY-MM)',
    'Butir': 'Seeds',
    'Butuh Uji Semai Ulang': 'Needs Germination Retest',
    'Cari': 'Search',
    'Cari ID, keperluan, kategori...': 'Search ID, purpose, category...',
    'Cari kode batch / varietas...': 'Search batch code / variety...',
    'Cari mitra konsinyasi...': 'Search consignment partner...',
    'Cari nama atau barcode...': 'Search name or barcode...',
    'Cari nama atau kode batch...': 'Search name or batch code...',
    'Cari No. SJ / Outlet...': 'Search DO No. / Outlet...',
    'Cari nomor faktur / pelanggan...': 'Search invoice no / customer...',
    'Cari nomor nota atau nama pelanggan...': 'Search receipt number or customer name...',
    'Cari nota, pelanggan, cara bayar': 'Search receipt, customer, payment method',
    'Cari nota, pelanggan, cara bayar...': 'Search receipt, customer, payment method...',
    'Cari nota, produk, atau pelanggan...': 'Search receipt, product, or customer...',
    'Cari pelanggan CRM...': 'Search CRM customer...',
    'Cari produk kemasan...': 'Search packaged product...',
    'Cari produk, batch, atau outlet...': 'Search product, batch, or outlet...',
    'Cari varietas benih atau ID batch...': 'Search seed variety or batch ID...',
    'Catat Bayar': 'Record Payment',
    'Catat detail pengeluaran, nomor nota bon, atau keperluan...': 'Record expense details, receipt number, or purpose...',
    'Catat Pembayaran Cicilan': 'Record Payment Installment',
    'Catat Pengeluaran Operasional': 'Record Operational Expense',
    'Catat seluruh beban operasional harian, biaya listrik, logistik, dan perawatan toples.': 'Record all daily operational expenses, utilities, logistics, and jar maintenance costs.',
    'Catatan': 'Notes',
    'Catatan / Keterangan': 'Notes / Description',
    'Catatan / Keterangan Pengiriman (Opsional)': 'Delivery Notes / Description (Optional)',
    'Catatan / Kondisi Media Semai & Suhu': 'Notes / Seed Media Condition & Temperature',
    'Catatan internal kasir/staf...': 'Internal cashier/staff notes...',
    'Catatan Kaki Faktur': 'Invoice Footer Note',
    'Catatan Kaki Struk Kasir': 'Cashier Receipt Footer Note',
    'Catatan Kondisi Fisik': 'Physical Condition Notes',
    'Catatan kondisi pajangan benih, permintaan varian baru dari toko mitra, atau evaluasi kebersihan rak...': 'Notes on seed display condition, new variant requests from partner store, or shelf cleanliness evaluation...',
    'Catatan Lapangan (Opsional)': 'Field Notes (Optional)',
    'Catatan pengeluaran berhasil dihapus.': 'Expense record deleted successfully.',
    'Catatan pengeluaran berhasil disimpan.': 'Expense record saved successfully.',
    'Catatan Tambahan Penanganan': 'Additional Handling Notes',
    'Catatan Transaksi': 'Transaction Notes',
    'Centang jika pelanggan membawa fisik kemasan sachet tanpa membawa struk/nota': 'Check if customer brings physical packet without original receipt',
    'Cetak': 'Print',
    'Cetak / Simpan PDF': 'Print / Save PDF',
    'Cetak Barcode': 'Print Barcode',
    'Cetak Faktur': 'Print Invoice',
    'Cetak faktur formal A4, simpan PDF, struk thermal kasir, dan kirim nota via WhatsApp.': 'Print formal A4 invoice, save PDF, print thermal cashier receipt, and send via WhatsApp.',
    'Cetak Lembar Kerja Stock Opname Fisik format A4 (Harga disembunyikan)': 'Print Physical Stock Opname Worksheet A4 (Prices hidden)',
    'Cetak Nota': 'Print Receipt',
    'Cetak Rekap Laporan (A4/PDF)': 'Print Report Summary (A4/PDF)',
    'Cetak Struk (PDF)': 'Print Receipt (PDF)',
    'Cetak Surat Jalan': 'Print Delivery Order',
    'Cetak Surat Jalan A4 Langsung': 'Print Delivery Order (A4)',
    'Cetak Ulang Faktur Formal': 'Reprint Formal Invoice',
    'Cetak Ulang Nota Termal': 'Reprint Thermal Receipt',
    'Cetak Valuasi Aset (A4)': 'Print Asset Valuation (A4)',
    'Chat ID Telegram': 'Telegram Chat ID',
    'Cicilan / Tempo': 'Installment / Credit',
    'CICILAN / TEMPO': 'INSTALLMENT / CREDIT',
    'Cicilan / Tempo (Piutang)': 'Installment / Credit (Receivable)',
    'Coba Koreksi Stok Sekarang': 'Try Adjusting Stock Now',
    'Coba Lagi': 'Try Again',
    'Contoh: 12/27 atau 2712': 'Example: 12/27 or 2712',
    'Contoh: Angsuran nota tempo...': 'Example: Installment for credit receipt...',
    'Contoh: Berikan kapur dolomit untuk menetralkan pH, semprotkan pestisida nabati neem oil sore hari...': 'Example: Apply dolomite lime to neutralize pH, spray organic neem oil in the evening...',
    'Contoh: Budi Santoso': 'Example: Budi Santoso',
    'Contoh: Dari 50 benih disemai pada media cocopeat, hanya 5 yang berkecambah setelah 10 hari...': 'Example: Out of 50 seeds sown in cocopeat, only 5 germinated after 10 days...',
    'Contoh: Daun cabai menguning keriting, media tanam terasa padat dan asam...': 'Example: Chili leaves yellowing and curling, growing media feels compacted and acidic...',
    'Contoh: Ditemukan 2 sachet kemasan robek saat penataan display rak depan...': 'Example: Found 2 torn packets during front display arrangement...',
    'Contoh: koordinator_bali, kasir1': 'Example: coordinator_bali, cashier1',
    'Contoh: Media kokopit + kompos steril, kecambah serempak di hari ke-5, vigor sehat...': 'Example: Cocopeat + sterile compost media, uniform germination at day 5, healthy vigor...',
    'Contoh: Salah input varietas benih / dobel cetak nota / pelanggan membatalkan pembelian...': 'Example: Mistyped seed variety / duplicate receipt printed / customer cancelled purchase...',
    'Contoh: Supervisor, Auditor, Relawan': 'Example: Supervisor, Auditor, Volunteer',
    'Curah': 'Bulk',
    'Curah/Gram': 'Bulk / Grams',
    'Daftar Belanja': 'Shopping List',
    'Daftar Item Pembelian & Perhitungan HPP (Landed Cost)': 'Purchase Items List & Landed Cost (COGS) Calculation',
    'Daftar Item Pembelian &amp; Perhitungan HPP (Landed Cost)': 'Purchase Items List & Landed Cost (COGS) Calculation',
    'Daftar kategori pengeluaran akan diatur ulang ke 7 kategori standar IDEP. Lanjutkan?': 'Expense categories list will be reset to IDEP\'s 7 standard categories. Proceed?',
    'Daftar Peran Pengguna': 'User Roles List',
    'Daftar Petani Mitra': 'Partner Farmers Directory',
    'Daftar Piutang Aktif': 'Active Receivables List',
    'Daftar Supplier': 'Suppliers Directory',
    'Daftar Toko Mitra': 'Partner Stores Directory',
    'Daftar Transaksi': 'Transaction List',
    'Daftar transaksi belanja per nota lengkap dengan HPP modal riil dan margin keuntungan.': 'List of shopping transactions per receipt complete with real cost (COGS) and profit margins.',
    'Daftar Varietas Benih yang Dikirim': 'List of Seed Varieties Shipped',
    'Dalam Proses Oven': 'In Oven Process',
    'Dana Pengadaan (Rp)': 'Procurement Funds (Rp)',
    'Dapatkan token dari @BotFather di aplikasi Telegram saat membuat bot baru.': 'Get token from @BotFather in Telegram app when creating a new bot.',
    'Dari Tgl': 'From Date',
    'Dari Tgl:': 'From Date:',
    'Dashboard': 'Dashboard',
    'Dashboard Ringkasan': 'Dashboard Overview',
    'Data audit fisik opname berhasil disimpan dan mutasi disesuaikan.': 'Physical audit stocktake data saved and mutations adjusted.',
    'Data berhasil dihapus!': 'Data deleted successfully!',
    'Data berhasil diperbarui!': 'Data updated successfully!',
    'Data berhasil disimpan!': 'Data saved successfully!',
    'Data faktur tidak ditemukan.': 'Invoice data not found.',
    'Data pelanggan tersimpan.': 'Customer data saved.',
    'Data petani penangkar mitra berhasil disimpan ke direktori.': 'Partner seed farmer data saved to directory successfully.',
    'Data produk, harga tier, ambang batas stok, dan varian bahasa disimpan.': 'Product data, tier pricing, stock thresholds, and language variants saved.',
    'Data profil toko, tarif pajak, dan footer struk diperbarui.': 'Store profile, tax rate, and receipt footer updated.',
    'Data sapaan pelanggan tidak ditemukan.': 'Customer greeting data not found.',
    'Data struk tidak ditemukan.': 'Receipt data not found.',
    'Data supplier resmi berhasil disimpan ke master database.': 'Authorized supplier data saved to master database successfully.',
    'Data toko berhasil dimuat ulang langsung dari server Supabase.': 'Store data refreshed successfully from Supabase server.',
    'Data toko disegarkan.': 'Store data refreshed.',
    'Daya Tumbuh': 'Germination Rate',
    'Daya Tumbuh (%)': 'Germination Rate (%)',
    'Daya Tumbuh & Teknik Semai': 'Germination & Sowing Techniques',
    'Daya Tumbuh: 0% (Standar IDEP: Min 80%)': 'Germination Rate: 0% (IDEP Standard: Min 80%)',
    'Desember': 'December',
    'Deskripsi Produk': 'Product Description',
    'Detail': 'Details',
    'Dibatalkan (VOID)': 'Voided (VOID)',
    'DIBATALKAN (VOID)': 'VOIDED',
    'Dibuat Pada': 'Created At',
    'DIBUAT PADA': 'CREATED AT',
    'Digunakan': 'Used In',
    'Digunakan untuk layar login, faktur minimalis, dan struk kasir.': 'Used for login screen, minimalist invoice, and cashier receipt.',
    'Digunakan untuk menu samping (sidebar hijau tua) dan kop faktur formal.': 'Used for sidebar navigation (dark green) and formal invoice header.',
    'Diproses': 'Processing',
    'Direktori pelanggan loyal, riwayat pembelian benih, dan preferensi tanaman kebun.': 'Loyal customer directory, seed purchase history, and garden plant preferences.',
    'Diserahkan': 'Handed Over',
    'Disetujui': 'Approved',
    'Diskon': 'Discount',
    'DITAGIHKAN KEPADA:': 'BILLED TO:',
    'ditekan, timer 24 jam akan berjalan otomatis dan terpantau secara realtime di tabel QC.': 'pressed, 24-hour timer will run automatically and be monitored in real-time in the QC table.',
    'Diterima': 'Received',
    'Ditolak': 'Rejected',
    'Dokumentasi Foto Baki Benih': 'Seed Tray Photo Documentation',
    'Dokumentasi Foto Baki On-Site': 'On-Site Tray Photo Documentation',
    'Draft': 'Draft',
    'Duplikat': 'Duplicate',
    'Durasi Tetap: 24 Jam': 'Fixed Duration: 24 Hours',
    'Edit': 'Edit',
    'Ekspor': 'Export',
    'Ekspor CSV': 'Export CSV',
    'Ekspor CSV/Excel': 'Export CSV/Excel',
    'Ekspor Data': 'Export Data',
    'Ekspor Excel / CSV': 'Export Excel / CSV',
    'Email Toko': 'Store Email',
    'Estimasi HPP Final / Sachet': 'Estimated Final COGS / Packet',
    'ESTIMASI HPP FINAL / SACHET': 'ESTIMATED FINAL COGS / PACKET',
    'Estimasi Keuntungan': 'Estimated Profit',
    'Estimasi Laba Kotor': 'Estimated Gross Profit',
    'Estimasi Margin Laba Kotor:': 'Estimated Gross Profit Margin:',
    'Estimasi Sisa Akhir:': 'Estimated Final Remaining:',
    'Faktur Formal (A4)': 'Formal Invoice (A4)',
    'Faktur Minimalis': 'Minimalist Invoice',
    'Faktur Pembelian': 'Purchase Invoices',
    'FAKTUR PENJUALAN': 'SALES INVOICE',
    'Februari': 'February',
    'Filter': 'Filter',
    'Filter Jenis Produk': 'Filter Product Type',
    'Filter Produk (Opsional)': 'Filter Products (Optional)',
    'FINANSIAL & KLIEN': 'FINANCE & CLIENTS',
    'Fisik di Rak': 'Physical on Shelf',
    'Form Catat Pengeluaran': 'Record Expense Form',
    'Form Kemas Mandiri': 'Repackaging Form',
    'Format Batch & Multi-Tier': 'Batch Format & Multi-Tier',
    'Format Kode Batch FIFO': 'FIFO Batch Code Format',
    'Format Penomoran Batch': 'Batch Numbering Format',
    'Formulir Pengemasan Baru': 'New Repackaging Form',
    'Foto Baki': 'Tray Photo',
    'Foto Bukti Semaian (Dikompres Otomatis via Kanvas)': 'Seedling Proof Photo (Auto-compressed via Canvas)',
    'Foto Semaian': 'Seedling Photo',
    'Gagal login: Username atau password salah.': 'Login failed: Incorrect username or password.',
    'Gagal memuat data Surat Jalan.': 'Failed to load Delivery Order data.',
    'Gagal Memuat Modul Biaya': 'Failed to Load Expense Module',
    'Gagal memuat produk.': 'Failed to load products.',
    'Gagal menyimpan data': 'Failed to save data',
    'Gagal QC': 'QC Failed',
    'Ganti / Lepas': 'Change / Detach',
    'Ganti Benih Baru Batch Lain (Retur Stok)': 'Replace with New Seed from Another Batch (Stock Return)',
    'Ganti Foto': 'Replace Photo',
    'Gejala di Lahan': 'Field Symptoms',
    'Gram': 'Grams',
    'Gram Diambil (Total)': 'Total Grams Used',
    'Gram Per Kemasan': 'Grams per Packet',
    'Gram Terpakai': 'Grams Used',
    'Gram terpakai harus lebih dari 0.': 'Grams used must be greater than 0.',
    'Gramatur (gr)': 'Net Weight (gr)',
    'Gudang Utama': 'Main Warehouse',
    'Gunakan fitur ini untuk menghapus seluruh riwayat transaksi simulasi. Data master produk dan pengaturan tidak akan terhapus.': 'Use this feature to clear simulated transaction history. Master product and settings data will not be deleted.',
    'Habis': 'Out of Stock',
    'Hak Akses & Peran': 'Permissions & Roles',
    'Hapus': 'Delete',
    'Hapus Catatan': 'Delete Record',
    'Hapus catatan pengeluaran ini?': 'Delete this expense record?',
    'Hapus Catatan Pengeluaran?': 'Delete Expense Record?',
    'Hapus Data': 'Delete Data',
    'Hapus faktur pengadaan ini? Seluruh batch stok dan mutasi yang masuk akan dibersihkan.': 'Delete this procurement invoice? All incoming stock batches and mutations will be cleared.',
    'Hapus Foto': 'Delete Photo',
    'Hapus Kategori Biaya?': 'Delete Cost Category?',
    'Hapus Permanen': 'Permanently Delete',
    'Hapus permanen darurat (khusus admin)': 'Emergency permanent delete (admin only)',
    'Hapus Permanen Data Terpilih': 'Permanently Delete Selected Data',
    'Hapus permanen nota #': 'Permanently delete receipt #',
    'Harap kunci tanda tangan terlebih dahulu sebelum menyelesaikan serah terima!': 'Please lock signature first before completing handover!',
    'Harap pilih file gambar (PNG/JPG/SVG).': 'Please select an image file (PNG/JPG/SVG).',
    'Harga': 'Price',
    'Harga Beli (Rp)': 'Purchase Price (Rp)',
    'Harga Jual': 'Selling Price',
    'Harga Jual (Tier)': 'Selling Price (Tier)',
    'Harga Jual Bahan Curah (Opsional bila hanya untuk stok produksi)': 'Bulk Selling Price (Optional if only used for production)',
    'Harga Jual Bali Buda': 'Bali Buda Selling Price',
    'Harga Jual Kemasan Sachet (Multi-Tier)': 'Packet Selling Price (Multi-Tier)',
    'Harga Jual Outlet': 'Outlet Selling Price',
    'Harga Jual Reguler': 'Regular Selling Price',
    'Harga Modal': 'Cost Price',
    'Harga Modal (HPP)': 'Unit Cost (COGS)',
    'Harga Satuan': 'Unit Price',
    'Harga:': 'Price:',
    'Hari': 'Days',
    'Hari Ini': 'Today',
    'Hasil': 'Result',
    'Hasil Estimasi Teoritis': 'Theoretical Output Estimate',
    'Hasil Jadi': 'Finished Output',
    'Hilang / Selisih': 'Lost / Discrepancy',
    'Hitung kuantitas fisik riil di rak/wadah penyimpanan, tuliskan angka hasil hitung pada kolom': 'Count actual physical quantity on shelf/storage jar, enter the count figure in column',
    'Hitungan Fisik Nyata': 'Actual Physical Count',
    'Hormat Kami,': 'Sincerely,',
    'HPP / Pcs': 'COGS / Packet',
    'HPP FIFO': 'FIFO Cost',
    'HPP Final/Pcs (Rp)': 'Final COGS/Pcs (Rp)',
    'HPP Modal per Sachet': 'COGS per Packet',
    'HPP Satuan': 'Unit Cost (COGS)',
    'HPP/Modal': 'COGS / Cost',
    'hr (Aman)': 'days (Safe)',
    'hr (Mendesak)': 'days (Urgent)',
    'hr (Perlu Jadwal)': 'days (Needs Schedule)',
    'Hubungkan sistem Kios IDEP dengan Bot Telegram untuk notifikasi otomatis instan ke pengelola.': 'Connect IDEP Kiosk with Telegram Bot for instant automatic notifications to managers.',
    'ID obrolan pribadi atau ID grup tempat notifikasi akan dikirimkan (gunakan bot @userinfobot atau sejenis).': 'Personal chat ID or group ID where notifications will be sent (use @userinfobot or similar).',
    'Identifikasi toples asal bahan curah & petani penangkar dari kode bulan/tahun exp (MM/YY).': 'Identify bulk raw material source jar & seed grower farmer from MM/YY expiry code.',
    'Identitas Batch Terpilih (Otomatis dari Pengadaan Tanpa Dobel Ketik)': 'Selected Batch Details (Auto-filled from procurement)',
    'In Transit (Perlu Serah Terima)': 'In Transit (Handover Required)',
    'INFORMASI PEMBAYARAN:': 'PAYMENT INFORMATION:',
    'Input Uji QC & Dokumentasi Foto': 'QC Test Entry & Photo Documentation',
    'Input Uji QC Baru': 'New QC Test Entry',
    'Input uji tahapan lanjutan': 'Enter next stage test',
    'Install Aplikasi di HP': 'Install App on Phone',
    'Instruksi Tanam': 'Planting Instructions',
    'Interval Kunjungan': 'Visit Interval',
    'INTERVAL KUNJUNGAN': 'VISIT INTERVAL',
    'INVOICE MINIMALIS': 'MINIMALIST INVOICE',
    'Item Benih & Batch': 'Seed Item & Batch',
    'Item Terjual': 'Items Sold',
    'Jabatan / Peran': 'Job Title / Role',
    'Jabatan / Status Penerima': 'Recipient Position / Role',
    'Jabatan:': 'Position:',
    'Jam Masuk Oven': 'Oven Entry Time',
    'Jam Selesai Oven': 'Oven Completion Time',
    'Januari': 'January',
    'Jatuh Tempo': 'Due Date',
    'Jatuh Tempo Pembayaran': 'Payment Due Date',
    'Jatuh Tempo Tagihan': 'Invoice Due Date',
    'Jatuh Tempo:': 'Due Date:',
    'Jelaskan kendala daya tumbuh semaian.': 'Please explain the germination issue.',
    'Jenis / Klasifikasi Produk': 'Product Classification',
    'Jenis Media Tanam': 'Growing Media Type',
    'Juli': 'July',
    'Jumat': 'Friday',
    'Jumlah': 'Quantity',
    'Jumlah Bayar': 'Payment Amount',
    'Jumlah Biaya': 'Cost Amount',
    'Jumlah butir tumbuh pada Baki A dan Baki B harus di antara 0 sampai 50.': 'Number of germinated seeds on Tray A and Tray B must be between 0 and 50.',
    'Jumlah Nota': 'Receipts Count',
    'Jumlah Nota Tempo': 'Total Due Invoices',
    'JUMLAH NOTA TEMPO': 'TOTAL DUE INVOICES',
    'Jumlah pcs dihasilkan harus lebih dari 0.': 'Packets produced must be greater than 0.',
    'Jumlah Sachet Dihasilkan': 'Packets Produced (Qty)',
    'Juni': 'June',
    'Kadaluarsa': 'Expired',
    'Kamis': 'Thursday',
    'Kanal': 'Channel',
    'Kanal Penjualan': 'Sales Channels',
    'Kantong': 'Bags',
    'Kanvas tanda tangan telah dibersihkan.': 'Signature canvas cleared.',
    'Karantina': 'Quarantine',
    'Karantina / Gagal': 'Quarantine / Failed',
    'Karantina/Gagal': 'Quarantine/Failed',
    'Kas Kecil / Tunai Kios': 'Petty Cash / Store Cash',
    'KAS KECIL / TUNAI KIOS': 'PETTY CASH / STORE CASH',
    'Kasir': 'Cashier',
    'Kasir (POS)': 'Cashier (POS)',
    'Kasir / Pengelola Persediaan': 'Cashier / Inventory Manager',
    'Kasir & Gudang Terhubung': 'Cashier & Warehouse Connected',
    'Kasir Toko': 'Store Cashier',
    'Kasir Utama': 'Main Cashier',
    'Katalog pelanggan setia, preferensi kebun, dan riwayat belanja.': 'Loyal customer catalog, garden preferences, and purchase history.',
    'Katalog Produk': 'Product Catalog',
    'Kategori': 'Category',
    'Kategori Biaya': 'Expense Categories',
    'Kategori Member': 'Member Tier',
    'Kategori Pelanggan': 'Customer Category',
    'Kategori Pengeluaran': 'Expense Category',
    'Kategori Sumber': 'Source Category',
    'Kedaluwarsa': 'Expiration',
    'Kelola akun staf kasir, operator QC, koordinator, dan administrator.': 'Manage accounts for cashier staff, QC operators, coordinators, and administrators.',
    'Kelola hak otorisasi matriks modul per jabatan pengguna sistem.': 'Manage module authorization matrix per user role.',
    'Kelola kontak member, kategori diskon, dan histori belanja 360 derajat.': 'Manage member contacts, discount categories, and 360-degree purchase history.',
    'Kelola master data barang siap jual, bahan baku curah, media dan varian bahasa.': 'Manage master data for ready-to-sell goods, bulk materials, media, and language variants.',
    'Kelola pengadaan benih mentah dari petani lokal dan barang dari supplier resmi.': 'Manage raw seed procurement from local farmers and goods from authorized suppliers.',
    'Kelola toko mitra konsinyasi, surat jalan titip barang, dan audit fisik opname.': 'Manage partner consignment stores, delivery orders, and physical stock audits.',
    'Kelola toples benih, batch FIFO/FEFO, mutasi stok, dan audit opname fisik.': 'Manage seed jars, FIFO/FEFO batches, stock mutations, and physical inventory audits.',
    'Keluar': 'Logout',
    'Keluar dari Aplikasi': 'Sign Out from App',
    'Keluar Penjualan (POS)': 'Out for Sales (POS)',
    'Keluar Produksi (Curah)': 'Out for Production (Bulk)',
    'Keluarkan': 'Remove / Complete',
    'Keluarkan dari Oven & Selesaikan Tahap DHT': 'Remove from Oven & Complete DHT Stage',
    'Keluarkan dari Oven &amp; Selesaikan Tahap DHT': 'Remove from Oven & Complete DHT Stage',
    'Kemas Mandiri': 'Repackaging',
    'Kemas Mandiri & Produksi': 'Repackaging & Production',
    'Kemas Mandiri &amp; Produksi': 'Repackaging & Production',
    'Kemasan': 'Packaged',
    'Kemasan Retail Eceran Toko': 'Store Retail Packaging',
    'Kemasan Rusak / Bocor / Cacat Fisik': 'Damaged / Leaking / Defective Packaging',
    'Kemasan Sachet': 'Packet Packaging',
    'Kemasan Sachet (Siap Jual)': 'Sachet Packets (Ready to Sell)',
    'Kemasan Siap Jual': 'Packaged Ready to Sell',
    'Kemasan Siap Jual (Pcs)': 'Packaged Ready to Sell (Pcs)',
    'Kembali': 'Back',
    'Kembalian': 'Change',
    'Kembalikan ke 30 Hari Terakhir': 'Reset to Last 30 Days',
    'Kendala & Media Tanam': 'Issues & Growing Media',
    'Kendala &amp; Media Tanam': 'Issues & Growing Media',
    'Kepemilikan barang tetap berada pada Kios IDEP sampai barang dinyatakan terjual pada saat opname bersama.': 'Goods remain the property of IDEP Kiosk until declared sold during joint audit.',
    'Keperluan': 'Purpose',
    'Keranjang masih kosong.': 'Cart is empty.',
    'Keranjang Penjualan': 'Sales Cart',
    'Kesehatan Stok & Expired': 'Stock Health & Expiration',
    'Kesehatan Stok &amp; Expired': 'Stock Health & Expiration',
    'Ketentuan Konsinyasi:': 'Consignment Terms:',
    'Keterangan': 'Description',
    'Keterangan / Keperluan': 'Description / Purpose',
    'Keterangan / Peruntukan': 'Description / Allocation',
    'Keterangan & Petugas': 'Notes & Officer',
    'Ketik / pilih pelanggan...': 'Type / select customer...',
    'Ketik alamat email resmi toko atau yayasan...': 'Type official email of store or foundation...',
    'Ketik alamat lengkap lokasi kebun atau toko...': 'Type full address of farm or store location...',
    'Ketik alasan pembatalan / void nota kasir...': 'Type reason for receipt cancellation / void...',
    'Ketik alasan penyesuaian selisih stok fisik...': 'Type reason for physical stock discrepancy adjustment...',
    'Ketik batas ambang minimum persediaan stok...': 'Type minimum stock threshold limit...',
    'Ketik berat bersih isi benih per sachet...': 'Type net seed weight per packet...',
    'Ketik biaya tambahan kemasan per sachet...': 'Type extra packaging cost per packet...',
    'Ketik catatan kaki yang dicetak di struk...': 'Type footer note printed on receipt...',
    'Ketik catatan tambahan untuk transaksi ini...': 'Type additional notes for this transaction...',
    'Ketik deskripsi lengkap mengenai komoditas benih...': 'Type full description of seed commodity...',
    'Ketik format penomoran batch kustom...': 'Type custom batch numbering format...',
    'Ketik hasil wawancara keluhan daya tumbuh...': 'Type interview results of germination complaint...',
    'Ketik ID chat Telegram tujuan notifikasi...': 'Type target Telegram chat ID for notifications...',
    'Ketik instruksi penanaman dan pemeliharaan...': 'Type planting and care instructions...',
    'Ketik jumlah baki semai yang tidak tumbuh...': 'Type number of ungerminated seed trays...',
    'Ketik jumlah hari perkiraan umur panen...': 'Type estimated days to harvest...',
    'Ketik kata RESET untuk melanjutkan pembersihan:': 'Type RESET to proceed with cleanup:',
    'Ketik ketinggian lokasi kebun dari MDPL...': 'Type farm altitude above sea level (MASL)...',
    'Ketik kode batch dari fisik sachet...': 'Type batch code from physical sachet...',
    'Ketik luas lahan yang mengalami kendala...': 'Type affected field area size...',
    'Ketik musim panen benih penangkar...': 'Type seed grower harvest season...',
    'Ketik nama kategori pengeluaran baru...': 'Type new expense category name...',
    'Ketik nama lengkap penanggung jawab (PIC)...': 'Type full name of person-in-charge (PIC)...',
    'Ketik nama pelanggan (misal: Pak Ketut / Subak)...': 'Type customer name (e.g. Pak Ketut / Subak)...',
    'Ketik nama peran hak akses baru...': 'Type new role permission name...',
    'Ketik nama petani atau kelompok tani mitra...': 'Type farmer name or partner group...',
    'Ketik nama supplier atau distributor resmi...': 'Type supplier name or official distributor...',
    'Ketik nama tingkat harga tier baru...': 'Type new price tier name...',
    'Ketik nama toko mitra atau lokasi outlet...': 'Type partner store name or outlet location...',
    'Ketik nama varietas benih yang dicari...': 'Type seed variety name to search...',
    'Ketik nominal pembayaran angsuran piutang...': 'Type receivable installment payment amount...',
    'Ketik nominal pengeluaran kas operasional...': 'Type operational petty cash expense amount...',
    'Ketik nomor batch fisik yang tertera pada sachet...': 'Type physical batch number printed on sachet...',
    'Ketik nomor nota atau nomor telepon pelanggan...': 'Type receipt number or customer phone number...',
    'Ketik nomor WhatsApp aktif yang dapat dihubungi...': 'Type active contact WhatsApp number...',
    'Ketik password baru (minimal 6 karakter)...': 'Type new password (minimum 6 characters)...',
    'Ketik perkiraan persentase daya tumbuh lahan...': 'Type estimated field germination rate...',
    'Ketik perkiraan persentase susut rendemen...': 'Type estimated shrinkage/waste percentage...',
    'Ketik perlakuan benih pasca panen...': 'Type post-harvest seed treatment...',
    'Ketik persentase biaya transaksi MDR QRIS...': 'Type QRIS MDR transaction fee percentage...',
    'Ketik persentase komisi bagi hasil outlet...': 'Type outlet revenue share commission percentage...',
    'Ketik RESET dengan benar untuk mengaktifkan': 'Type RESET correctly to enable',
    'Ketik RESET di sini...': 'Type RESET here...',
    'Ketik saran teknis untuk penanganan kebun...': 'Type technical advice for garden management...',
    'Ketik slogan atau tagline resmi toko...': 'Type official store slogan or tagline...',
    'Ketik solusi garansi yang telah disepakati...': 'Type agreed warranty solution...',
    'Ketik suhu target operasional ruang oven...': 'Type target operational oven temperature...',
    'Ketik tarif persentase pajak penjualan PPN...': 'Type sales tax VAT percentage rate...',
    'Ketik tindak lanjut dan rekomendasi kebun...': 'Type follow-up action and garden recommendations...',
    'Ketik token bot yang didapatkan dari BotFather...': 'Type bot token obtained from BotFather...',
    'Ketik username untuk login ke sistem...': 'Type username to log into system...',
    'Ketinggian (MDPL)': 'Altitude (MASL)',
    'Kios IDEP': 'IDEP Kiosk',
    'Kios IDEP POS': 'IDEP Kiosk POS',
    'Kios IDEP POS & Manajemen Stok': 'IDEP Kiosk POS & Stock Management',
    'Kirim & Terbitkan Surat Jalan': 'Send & Issue Delivery Order',
    'Kirim Berita Acara via WhatsApp': 'Send Official Report via WhatsApp',
    'Kirim WA': 'Send WhatsApp',
    'Klaim Benih': 'Seed Claim',
    'Klaim Garansi Benih': 'Seed Warranty Claims',
    'Klaim garansi daya tumbuh benih berhasil dicatat dan diproses.': 'Seed germination warranty claim recorded and processed.',
    'Klaim Tanpa Nota (Bawa Fisik Sachet)': 'Claim Without Receipt (Physical Sachet Presented)',
    'Klik produk untuk menambahkan.': 'Click product to add.',
    'Klik salah satu nota di panel kiri untuk membuka faktur dan menu aksinya.': 'Click a receipt on the left panel to open the invoice and its actions.',
    'Klik untuk memperbesar foto baki': 'Click to zoom tray photo',
    'Kode Barcode / SKU': 'Barcode / SKU Code',
    'Kode Batch': 'Batch Code',
    'Kode Batch / Lot': 'Batch / Lot Code',
    'Kode Batch Bermasalah': 'Problematic Batch Code',
    'Kode Batch Toples Benih': 'Seed Jar Batch Code',
    'Kode Inisial Petani (Opsional)': 'Farmer Initial Code (Optional)',
    'Komoditas / Benih Dibeli:': 'Commodity / Seed Purchased:',
    'Kompresi otomatis client-side (~150-300 KB) untuk upload kilat.': 'Automatic client-side compression (~150-300 KB) for fast upload.',
    'Kondisi display dan kunjungan masih aman (≤ 14 hari)': 'Display and visit condition still safe (≤ 14 days)',
    'Konfigurasi Biaya Transaksi & QRIS POS': 'Transaction Fee & QRIS POS Settings',
    'Konfigurasi Hak Akses & Peran': 'Permissions & Roles Settings',
    'Konfigurasi profil toko, tarif pajak, format batch & preset multi-tier, hak akses peran, akun pengguna, dan integrasi Bot Telegram.': 'Configure store profile, tax rates, batch format & multi-tier presets, role permissions, users, and Telegram Bot.',
    'Konfigurasi toko, format batch, akun staf, dan hak akses.': 'Store configuration, batch format, staff accounts, and permissions.',
    'Konfirmasi': 'Confirm',
    'Konfirmasi & Selesaikan Serah Terima': 'Confirm & Complete Handover',
    'Konfirmasi Aksi': 'Confirm Action',
    'Konsinyasi & Cabang': 'Consignment & Branches',
    'Konsinyasi &amp; Cabang': 'Consignment & Branches',
    'Konsinyasi Mitra': 'Partner Consignment',
    'Konsinyasi Toko Mitra': 'Partner Store Consignment',
    'Kontak WhatsApp': 'WhatsApp Contact',
    'Kontribusi Kanal': 'Channel Contribution',
    'Kontribusi Omzet': 'Revenue Contribution',
    'Konversi bahan curah gram ke produk sachet siap jual dengan penomoran lot dan kalkulasi HPP otomatis.': 'Convert bulk gram material into retail packets with automatic lot numbering and COGS calculation.',
    'Konversi benih curah mentah menjadi sachet siap jual dengan pelacakan HPP akurat.': 'Convert bulk raw seeds into retail-ready packets with accurate COGS tracking.',
    'Koordinator': 'Coordinator',
    'Koordinator (View-Only)': 'Coordinator (View-Only)',
    'Koreksi': 'Adjust',
    'Koreksi Nota': 'Invoice Correction',
    'Koreksi Stok': 'Adjust Stock',
    'Koreksi stok batch ini': 'Adjust this batch stock',
    'Koreksi stok berhasil disimpan! Saldo lot & mutasi telah diperbarui.': 'Stock adjustment saved! Lot balance & mutations have been updated.',
    'Kosongkan': 'Clear',
    'Kuantitas': 'Quantity',
    'Kunci Tanda Tangan': 'Lock Signature',
    'Kunci tanda tangan dibuka. Silakan ubah goresan atau kunci kembali.': 'Signature lock opened. Please edit stroke or re-lock.',
    'Kunjungan opname sangat mendesak (> 30 hari)': 'Stocktake visit very urgent (> 30 days)',
    'Kunjungan Terakhir': 'Last Visit',
    'Kustom': 'Custom Range',
    'Laba Kotor': 'Gross Profit',
    'Laba Kotor (FIFO Riil):': 'Gross Profit (Real FIFO):',
    'Lacak Batch': 'Track Batch',
    'Lainnya / Non-Benih': 'Other / Non-Seed',
    'Lanjutkan': 'Proceed',
    'Laporan & Valuasi Stok': 'Reports & Stock Valuation',
    'Laporan Penjualan & Margin': 'Sales Reports & Margin',
    'Laporan Penjualan & Margin FIFO': 'Sales Reports & FIFO Margin',
    'Laporan Penjualan &amp; Margin FIFO': 'Sales Reports & FIFO Margin',
    'Lewati Sapaan': 'Skip Greeting',
    'Lihat': 'View',
    'Lihat Detail': 'View Details',
    'Lihat rincian nota & struk #': 'View receipt details & ticket #',
    'Lihat riwayat lengkap': 'View full history',
    'Log audit lengkap mutasi persediaan benih curah & kemasan (Pembelian, Kemas Mandiri, Penjualan POS, dan Penyesuaian).': 'Complete audit log of bulk & packaged seed inventory movements (Purchases, Repackaging, POS Sales, and Adjustments).',
    'Log Oven DHT 24 Jam': '24-Hour DHT Oven Log',
    'Logo berhasil diproses. Simpan profil toko untuk menerapkan.': 'Logo processed successfully. Save store profile to apply.',
    'Logo Sekunder (Putih/Monokrom / Sidebar & Faktur Formal)': 'Secondary Logo (White/Monochrome / Sidebar & Invoices)',
    'Logo Toko (Format Gambar)': 'Store Logo (Image Format)',
    'Logo Utama (Full Color / Layar Login & Struk)': 'Primary Logo (Full Color / Login & Receipts)',
    'Lokasi Lahan / Subak': 'Field / Subak Location',
    'Lolos Mutu': 'Quality Passed',
    'Lot Batch': 'Batch Lot',
    'LULUS': 'PASSED',
    'Lulus QC': 'QC Passed',
    'LULUS STANDAR': 'PASSED STANDARD',
    'Lunas': 'Paid in Full',
    'LUNAS': 'PAID',
    'Lunas (Paid)': 'Paid',
    'Lunas Bulan Ini': 'Paid Off This Month',
    'Lunas Langsung': 'Paid in Full',
    'Maks. 50 butir per baki': 'Max. 50 seeds per tray',
    'Manajemen Biaya & Pengeluaran': 'Cost & Expense Management',
    'Manajemen terpadu outlet mitra: saldo benih di rak, drop stok baru, interval audit, berita acara MOV resmi, dan faktur hasil penjualan.': 'Integrated partner outlet management: shelf seed balance, new stock drops, audit intervals, official MOV reports, and sales invoices.',
    'Manajer Toko / Yayasan IDEP': 'Store Manager / IDEP Foundation',
    'Maret': 'March',
    'Margin': 'Margin',
    'Margin Laba Terhadap Omzet': 'Profit Margin Relative to Revenue',
    'Masuk Produksi (Kemas)': 'In from Production (Packaged)',
    'Masukkan kuantitas penyesuaian yang valid (lebih besar dari 0).': 'Enter a valid adjustment quantity (greater than 0).',
    'Masukkan minimal pilihan produk atau bulan/tahun kadaluarsa (MM/YY).': 'Please enter at least product selection or expiration month/year (MM/YY).',
    'Masukkan password': 'Enter password',
    'Masukkan password akun Anda saat ini untuk membuka kunci data rekening bank.': 'Enter your current account password to unlock bank account details.',
    'Masukkan username': 'Enter username',
    'Media': 'Media',
    'Media Tanam & Kompos': 'Growing Media & Compost',
    'Media/Buku': 'Books / Media',
    'Mei': 'May',
    'Melewati Batas Kadaluarsa (Expired)': 'Past Expiration Date (Expired)',
    'Membuka WhatsApp untuk mengirim struk #': 'Opening WhatsApp to send receipt #',
    'Memerlukan alur QC & Uji Semai': 'Requires QC & Germination Test',
    'Memilih "Ya, Berhasil" akan memindahkan pelanggan ini langsung ke tab': 'Selecting "Yes, Successful" will move this customer directly to the tab',
    'Memiliki akses penuh (Lihat, Input/Ubah, Hapus) pada seluruh modul. Matriks terkunci demi integritas sistem.': 'Full access (View, Create/Edit, Delete) across all modules. Locked for system integrity.',
    'Memiliki hak akses baca/pantau (View-Only) ke seluruh modul, tanpa izin memodifikasi atau menghapus data.': 'Read-only view access across all modules, without permissions to modify or delete data.',
    'Memperbarui status pengeluaran oven DHT...': 'Updating DHT oven removal status...',
    'Memproses kemas mandiri & pembaruan saldo...': 'Processing repackaging & updating balances...',
    'Memproses...': 'Processing...',
    'Memuat daftar pengguna...': 'Loading users list...',
    'Memuat data pelanggan...': 'Loading customer data...',
    'Memuat data piutang...': 'Loading receivables data...',
    'Memuat katalog produk kasir...': 'Loading cashier product catalog...',
    'Memuat katalog produk...': 'Loading product catalog...',
    'Memuat matriks hak akses...': 'Loading permissions matrix...',
    'Memuat rincian nota #': 'Loading receipt details #',
    'Memuat riwayat pengadaan...': 'Loading procurement history...',
    'Memuat...': 'Loading...',
    'Mencatat komplain daya tumbuh benih. Batch dengan &ge; 3 komplain otomatis masuk karantina mutu.': 'Record seed germination complaints. Batches with ≥ 3 complaints are automatically quarantined.',
    'Mencatat komplain daya tumbuh benih. Batch dengan ≥ 3 komplain otomatis masuk karantina mutu.': 'Record seed germination complaints. Batches with ≥ 3 complaints are automatically quarantined.',
    'Mendekati Kadaluarsa (30 Hari)': 'Near Expiration (30 Days)',
    'Mengambil daftar batch...': 'Fetching batch list...',
    'Mengerti': 'Understood',
    'Mengompres dan memproses logo...': 'Compressing and processing logo...',
    'Mengonversi unit terjual dari berita acara menjadi faktur penjualan resmi dengan harga tier khusus outlet ini.': 'Converts units sold from official report into a formal sales invoice with this outlet\'s custom tier pricing.',
    'Menu': 'Menu',
    'Menunggu': 'Pending',
    'Menunggu QC': 'Awaiting QC',
    'Menunggu Serah Terima': 'Pending Handover',
    'Menunggu Uji': 'Awaiting Testing',
    'Menunggu Verifikasi': 'Pending Verification',
    'Menyimpan catatan dan mengunggah foto ke Drive...': 'Saving record and uploading photo to Drive...',
    'Menyimpan...': 'Saving...',
    'Menyinkronkan ke Spreadsheet...': 'Syncing to Spreadsheet...',
    'Merchandise & Kaos': 'Merchandise & Shirts',
    'METODE & KANAL:': 'METHOD & CHANNEL:',
    'Metode Bayar': 'Payment Method',
    'Metode Pembayaran': 'Payment Method',
    'Metode:': 'Method:',
    'Minggu': 'Sunday',
    'Minimal 1 item pembelian valid harus terisi (Qty & Harga Beli harus lebih dari 0).': 'At least 1 valid purchase item must be filled (Qty & Purchase Price must be > 0).',
    'Minimal 6 karakter': 'Minimum 6 characters',
    'Minimal cantumkan 1 harga jual nominal positif (Reguler/Outlet/Bali Buda) untuk kemasan': 'Please specify at least 1 positive selling price (Regular/Outlet/Bali Buda) for package',
    'Minimal cantumkan 1 harga jual.': 'Please provide at least 1 selling price.',
    'Minimal cantumkan 1 variasi kemasan sachet atau hilangkan centang 2-in-1.': 'Please include at least 1 packet variant or uncheck 2-in-1.',
    'Misal: Perbaikan Mesin & Oven': 'E.g.: Machine & Oven Maintenance',
    'Modal Benih': 'Seed Cost',
    'Modal Benih:': 'Seed Cost:',
    'Modal HPP': 'COGS Cost',
    'MODE KOREKSI NOTA:': 'INVOICE CORRECTION MODE:',
    'Mode Pantau Aktif:': 'View-Only Mode Active:',
    'Modul ini sedang disiapkan.': 'This module is being prepared.',
    'Modul Sistem': 'System Module',
    'MODUL SISTEM': 'SYSTEM MODULE',
    'Monitoring posisi inventaris benih aktif, valuasi modal metode FIFO, kesegaran lot batch, dan lembar kerja opname fisik.': 'Monitor active seed inventory, FIFO cost valuation, batch lot freshness, and physical stocktake worksheets.',
    'Monitoring tagihan belum lunas dan pencatatan pembayaran tempo.': 'Monitor unpaid invoices and record credit payments.',
    'Muat Ulang Data': 'Refresh Data',
    'Mulai': 'From',
    'Mulai Proses Oven': 'Start Oven Process',
    'Mulai Stok Opname Lapangan': 'Start Field Stock Audit',
    'Mulai:': 'From:',
    'Multi-Tier Harga Jual': 'Multi-Tier Selling Prices',
    'Musim Panen': 'Harvest Season',
    'Mutasi Keluar': 'Outgoing Stock',
    'Mutasi Konsinyasi & Laporan Audit Opname': 'Consignment Stock Transfers & Stocktake Audits',
    'Mutasi Masuk': 'Incoming Stock',
    'Nama Bank': 'Bank Name',
    'Nama Benih': 'Seed Name',
    'Nama Kategori': 'Category Name',
    'Nama kategori wajib diisi!': 'Category name is required!',
    'Nama kemasan otomatis tersinkronisasi mengikuti nama bahan curah + gramatur.': 'Packaging name automatically synchronized with bulk material name + net weight.',
    'Nama Komoditas / Benih & Batch': 'Commodity Name / Seed & Batch',
    'Nama Lengkap': 'Full Name',
    'Nama Lengkap *': 'Full Name *',
    'Nama Lengkap Petani': 'Farmer Full Name',
    'Nama Lengkap Petani *': 'Farmer Full Name *',
    'Nama Orang yang Menerima di Lokasi': 'Name of Person Receiving on Site',
    'Nama Outlet Mitra / Toko Cabang': 'Partner Outlet / Branch Store Name',
    'Nama outlet mitra wajib diisi.': 'Partner outlet name is required.',
    'Nama Pelanggan': 'Customer Name',
    'NAMA PELANGGAN / NOTA ATAS NAMA:': 'CUSTOMER NAME / INVOICE TO:',
    'Nama pelanggan wajib diisi.': 'Customer name is required.',
    'Nama Penanggung Jawab (PIC)': 'Person-in-Charge (PIC) Name',
    'Nama Penerima': 'Receiver Name',
    'Nama Penerima / Cabang': 'Receiver Name / Branch',
    'Nama Peran Baru': 'New Role Name',
    'Nama Peran Baru *': 'New Role Name *',
    'Nama peran wajib diisi.': 'Role name is required.',
    'Nama Petani / Kelompok Tani': 'Farmer / Farmer Group Name',
    'Nama Petani / Penangkar': 'Farmer / Seed Grower Name',
    'Nama Petani / Penangkar Mitra': 'Partner Farmer / Seed Grower Name',
    'Nama Petani / Supplier': 'Farmer / Supplier Name',
    'Nama PIC / Supervisor Toko Mitra': 'Partner Store PIC / Supervisor Name',
    'Nama Produk': 'Product Name',
    'Nama Produk Kemasan Sachet': 'Packet Product Name',
    'Nama produk wajib diisi.': 'Product name is required.',
    'Nama Supplier': 'Supplier Name',
    'Nama supplier wajib diisi.': 'Supplier name is required.',
    'Nama Tingkat Harga (Tier)': 'Price Tier Name',
    'Nama Toko / Kios': 'Store / Kiosk Name',
    'Nama Varietas Benih': 'Seed Variety Name',
    'Navigasi Cepat Handphone': 'Mobile Quick Navigation',
    'Navigasi Utama': 'Main Navigation',
    'Nilai Valuasi': 'Valuation Value',
    'Nilai Valuasi (Rp)': 'Valuation Value (Rp)',
    'No': 'No.',
    'No / ID': 'No. / ID',
    'No.': 'No.',
    'No. Batch / Lot': 'Batch / Lot No.',
    'No. Batch / Lot Kemasan Baru (1:1 Otomatis)': 'New Batch / Lot No. (1:1 Automatic)',
    'NO. BATCH / LOT KEMASAN BARU (1:1 OTOMATIS)': 'NEW BATCH / LOT NO. (1:1 AUTOMATIC)',
    'No. Batch / Ref': 'Batch / Ref No.',
    'No. Faktur': 'Invoice No.',
    'NO. FAKTUR': 'INVOICE NO.',
    'No. Faktur / Surat Jalan': 'Invoice / Delivery Order No.',
    'No. Faktur:': 'Invoice No:',
    'No. Nota': 'Receipt No.',
    'No. Nota:': 'Receipt No:',
    'No. Surat Jalan': 'Delivery Order No.',
    'No. WhatsApp / HP': 'WhatsApp / Phone Number',
    'No. WhatsApp PIC (Untuk Kirim Berita Acara)': 'PIC WhatsApp Number (To Send Official Report)',
    'No. WhatsApp Toko / PIC': 'Store / PIC WhatsApp Number',
    'Nominal': 'Amount',
    'Nominal Bawaan / Default (Rp)': 'Default Amount (Rp)',
    'Nominal Pembayaran (Rp)': 'Payment Amount (Rp)',
    'Nominal Pengeluaran (Rp)': 'Expense Amount (Rp)',
    'Nomor batch kemasan sachet otomatis mengikuti kode batch bahan mentah terpilih.': 'Sachet packet batch number automatically follows selected raw material batch code.',
    'Nomor Kontak / WhatsApp': 'Contact / WhatsApp Number',
    'Nomor Kontak WhatsApp': 'WhatsApp Contact Number',
    'Nomor Rekening': 'Account Number',
    'Nomor WhatsApp (misal: 08123456789)': 'WhatsApp Number (e.g. 08123456789)',
    'Nomor WhatsApp / HP': 'WhatsApp / Phone Number',
    'Nomor WhatsApp pelanggan tidak valid:': 'Invalid customer WhatsApp number:',
    'Nomor WhatsApp Toko': 'Store WhatsApp Number',
    'Nomor WhatsApp wajib diisi.': 'WhatsApp number is required.',
    'Nonaktif': 'Inactive',
    'Nonaktifkan': 'Deactivate',
    'Nota Belanja Selesai Diproses': 'Sales Receipt Processed Successfully',
    'Nota ini dibatalkan pada': 'This receipt was voided on',
    'NOTA PENJUALAN': 'SALES RECEIPT',
    'November': 'November',
    'Offline': 'Offline',
    'Oktober': 'October',
    'Omzet (Subtotal)': 'Revenue (Subtotal)',
    'Omzet kotor transaksi hari ini': 'Gross revenue from today\'s transactions',
    'Online': 'Online',
    'Operasional & ATK Kios': 'Operational & Office Supplies',
    'Operasional &amp; ATK Kios': 'Operational & Office Supplies',
    'OPERASIONAL UTAMA': 'MAIN OPERATIONS',
    'Orang yang Menerima Fisik': 'Person Receiving Physical Goods',
    'Otomatis FEFO': 'Automatic FEFO',
    'Otomatis mengikuti batch bahan': 'Automatically follows raw batch',
    'Otomatis mengikuti batch bahan mentah': 'Automatically follows selected raw batch',
    'Outlet': 'Outlet Partner',
    'Outlet Mitra / Cabang': 'Partner Outlet / Branch',
    'Outlet Mitra & Lokasi': 'Partner Outlets & Locations',
    'Oven 1 (Lab Utama)': 'Oven 1 (Main Lab)',
    'Oven 2 (Ruang Produksi)': 'Oven 2 (Production Room)',
    'Oven 3 (Gudang Benih)': 'Oven 3 (Seed Warehouse)',
    'Oven DHT 24J': '24H DHT Oven',
    'Pajak': 'Tax',
    'Pakai Maks': 'Use Max',
    'Paket': 'Packs',
    'Panduan iOS: Ketuk tombol Bagikan (Share ⎋) di Safari lalu pilih': 'iOS Guide: Tap Share button (⎋) in Safari then select',
    'Pangan & Beras Merah': 'Food & Brown Rice',
    'Pantau alokasi lot kedaluwarsa, tanggal produksi, mutu penangkar, dan mutasi keluar masuk gudang.': 'Monitor expiration lot allocation, production date, grower quality, and warehouse ins and outs.',
    'Pantau performa penjualan hari ini dan alert stok kritis secara real-time.': 'Monitor today\'s sales performance and critical stock alerts in real-time.',
    'Pantau tagihan jatuh tempo pelanggan, riwayat angsuran, dan status pelunasan nota tempo.': 'Monitor customer due invoices, installment history, and credit settlement statuses.',
    'Parameter Oven Dry Heat Treatment (DHT) 24 Jam': '24-Hour Dry Heat Treatment (DHT) Oven Parameters',
    'Password salah, akses ditolak!': 'Incorrect password, access denied!',
    'Password wajib diisi.': 'Password is required.',
    'Pcs': 'Pcs',
    'Pcs nyata': 'Actual packets',
    'Pcs Retur': 'Pcs Returned',
    'Pcs Riil Dihasilkan': 'Actual Packets Produced',
    'Pcs Selisih / Hilang': 'Pcs Discrepancy / Lost',
    'Pcs Terjual': 'Pcs Sold',
    'PDF berhasil diarsipkan di folder Drive.': 'PDF successfully archived in Drive folder.',
    'Pelanggan': 'Customer',
    'PELANGGAN': 'CUSTOMER',
    'Pelanggan (CRM)': 'Customers (CRM)',
    'Pelanggan Aktif': 'Active Customers',
    'Pelanggan member berhasil didaftarkan ke sistem CRM toko.': 'Member customer successfully registered in store CRM system.',
    'Pelanggan Umum': 'General Customer',
    'Pelanggan Umum (Walk-in)': 'General Customer (Walk-in)',
    'Pelanggan:': 'Customer:',
    'Pelayanan keluhan daya tumbuh benih di lahan, klaim garansi, dan konsultasi kebun.': 'Field seed germination complaints, warranty claims, and garden consultation service.',
    'Pembayaran': 'Payment',
    'Pembayaran berhasil dicatat!': 'Payment recorded successfully!',
    'Pembelian & Pengadaan': 'Purchases & Procurement',
    'Pembelian Baru': 'New Purchase',
    'Pembelian berhasil dihapus.': 'Purchase deleted successfully.',
    'Pembelian berhasil disimpan.': 'Purchase saved successfully.',
    'Pembelian Stok': 'Stock Purchases',
    'Pemberitahuan': 'Notice',
    'Pemberitahuan berhasil diproses.': 'Notification processed successfully.',
    'Pembersihan Khusus Riwayat Transaksi Uji Coba': 'Test Transaction History Cleanup',
    'Pemeriksaan stok fisik dan penagihan hasil penjualan dilakukan secara periodik melalui Berita Acara Rekonsiliasi resmi.': 'Physical stock check and sales billing are performed periodically via official Reconciliation Reports.',
    'Penanggung Jawab (PIC) & WA': 'Person-in-Charge (PIC) & WA',
    'PENANGGUNG JAWAB (PIC) & WA': 'PERSON-IN-CHARGE (PIC) & WA',
    'Penanggung Jawab (PIC) &amp; WA': 'Person-in-Charge (PIC) & WA',
    'Penanggung Jawab Toko': 'Store Person-in-Charge',
    'Penangkar / Mutu': 'Grower / Quality',
    'Penangkar / Petani:': 'Seed Grower / Farmer:',
    'Penarikan Batch (Recall)': 'Batch Recall',
    'Pencarian dan cetak ulang struk kasir, faktur formal pajak, dan audit transaksi.': 'Search and reprint cashier receipts, formal invoices, and audit past transactions.',
    'Pencatatan faktur masuk dari supplier dan mitra penangkar benih.': 'Recording incoming invoices from suppliers and partner seed growers.',
    'Pencatatan kas operasional toko (petty cash) & beban harian.': 'Store operational petty cash and daily expense records.',
    'Pencatatan kas operasional toko (petty cash), histori belanja, dan pengaturan biaya MDR QRIS.': 'Store operational petty cash records, purchasing history, and QRIS MDR fee settings.',
    'Penerima di Lokasi': 'Recipient on Site',
    'Penerima Pembayaran': 'Payment Receiver',
    'Penerimaan Bersih Kasir Kios:': 'Net Kiosk Cashier Receipt:',
    'PENGADAAN & MITRA': 'PROCUREMENT & PARTNERS',
    'Pengamatan Baki Semai Duplo (100 Butir)': 'Duplo Germination Tray Observation (100 Seeds)',
    'Pengaturan Biaya Transaksi & QRIS': 'Transaction Fee & QRIS Settings',
    'Pengaturan Biaya Transaksi &amp; QRIS': 'Transaction Fee & QRIS Settings',
    'Pengaturan profil toko & format batch FIFO berhasil disimpan.': 'Store profile & FIFO batch format settings saved successfully.',
    'Pengaturan profil toko & preset tingkat harga berhasil disimpan.': 'Store profile settings & price tier presets saved successfully.',
    'Pengaturan Sistem': 'System Settings',
    'Pengaturan Toko': 'Store Settings',
    'Pengeluaran & Biaya': 'Expenses & Costs',
    'Pengeluaran & Biaya Operasional': 'Expenses & Operational Costs',
    'Pengeluaran Melalui Rekening': 'Bank Account Expenses',
    'Pengeluaran Petty Cash Fisik': 'Physical Petty Cash Expenses',
    'Pengemasan berhasil!': 'Repackaging successful!',
    'Penggantian Benih': 'Seed Replacement',
    'Pengguna berhasil disimpan!': 'User saved successfully!',
    'Pengingat Panen & Sapaan': 'Harvest Reminders & Greetings',
    'Pengingat Panen &amp; Sapaan': 'Harvest Reminders & Greetings',
    'PENGIRIMAN STOK KONSINYASI': 'CONSIGNMENT STOCK SHIPMENT',
    'Penjualan Hari Ini': 'Today\'s Sales',
    'Penyerapan Petani Penangkar': 'Seed Farmer Offtake',
    'Penyesuaian Opname': 'Stocktake Adjustment',
    'Penyesuaian stok manual': 'Manual stock adjustment',
    'Peran / Hak Akses': 'Role / Permission',
    'Peran / Hak Akses *': 'Role / Permission *',
    'Peran dan matriks hak akses berhasil disimpan ke database.': 'Role and permission matrix saved to database successfully.',
    'Perhatian': 'Attention',
    'Perhatian:': 'Warning:',
    'Perhatian: Durasi 24 jam akan berakhir di akhir pekan saat kantor/lab tutup. Disarankan memulai proses pada hari Senin–Kamis agar benih dapat dikeluarkan tepat waktu.': 'Warning: 24-hour duration will end on the weekend when office/lab is closed. Recommended to start Mon–Thu.',
    'Peringatan': 'Warning',
    'Peringatan saat ada lot benih atau bahan baku yang berstatus karantina / afkir QC.': 'Alert when a seed lot or raw material has a quarantine / QC rejected status.',
    'Periode Tanggal': 'Date Period',
    'PERIODE TANGGAL': 'DATE PERIOD',
    'Perlakuan Pasca-Panen': 'Post-Harvest Treatment',
    'Perlu dijadwalkan kunjungan opname (15-30 hari)': 'Stocktake visit needs scheduling (15-30 days)',
    'Persentase pajak yang dikenakan pada transaksi (misal: 0 untuk bebas pajak atau 11 untuk PPN 11%).': 'Tax percentage applied to transactions (e.g. 0 for tax-free or 11 for 11% VAT).',
    'Perubahan Qty': 'Qty Change',
    'Perubahan Qty (+/-)': 'Qty Change (+/-)',
    'Petani Mitra': 'Partner Farmer',
    'Petani Penangkar': 'Seed Grower Farmer',
    'Petani Penangkar Baru': 'New Seed Farmer',
    'Petugas / Staf yang Menangani': 'Officer / Handling Staff',
    'Petugas Pemeriksa Kios IDEP': 'IDEP Kiosk Audit Officer',
    'Petugas QC': 'QC Officer',
    'PIC Terdaftar Outlet:': 'Registered Outlet PIC:',
    'Pilih': 'Select',
    'Pilih / ketik nama...': 'Select / type name...',
    'Pilih Bahan Baku Curah': 'Select Bulk Raw Material',
    'Pilih bahan baku dan produk kemasan jadi.': 'Select raw material and finished packaged product.',
    'Pilih bahasa tampilan untuk menu, kasir, formulir, struk belanja, dan laporan:': 'Select display language for menus, cashier, forms, receipts, and reports:',
    'Pilih Batch Asal (Lot Bahan Curah)': 'Select Source Batch (Bulk Raw Material)',
    'Pilih Bulan': 'Select Month',
    'Pilih format penomoran kode batch:': 'Select batch code numbering format:',
    'Pilih jenis media semai yang digunakan:': 'Select seed germination media used:',
    'Pilih jenis pengadaan benih / barang:': 'Select seed / goods procurement type:',
    'Pilih kategori biaya pengeluaran operasional:': 'Select operational expense category:',
    'Pilih kode batch di atas untuk melacak kontak pembeli dan cabang penerima.': 'Select batch code above to track buyer contacts and receiving branches.',
    'Pilih Kode Batch:': 'Select Batch Code:',
    'Pilih metode pelunasan piutang pelanggan:': 'Select customer receivable settlement method:',
    'Pilih metode pembayaran yang digunakan:': 'Select payment method used:',
    'Pilih modul riwayat simulasi yang ingin Anda kosongkan. Data master (produk, batch stok, outlet, kemasan, user, dan pengaturan toko) tidak akan terhapus:': 'Select simulation history modules to clear. Master data (products, batches, outlets, packaging, users, and store settings) will not be deleted:',
    'Pilih peran / hak akses untuk pengguna ini:': 'Select role / permission for this user:',
    'Pilih Semua': 'Select All',
    'Pilih skema komisi bagi hasil untuk outlet:': 'Select revenue share commission scheme for outlet:',
    'Pilih solusi klaim garansi yang diberikan:': 'Select warranty claim resolution provided:',
    'Pilih status kelulusan pengujian mutu:': 'Select quality test passing status:',
    'Pilih status operasional untuk outlet ini:': 'Select operational status for this outlet:',
    'Pilih tahapan pengujian yang dilakukan:': 'Select testing stage performed:',
    'Pilih tindakan penanganan penarikan batch:': 'Select batch recall handling action:',
    'Pilih tingkat harga untuk barang ini:': 'Select price tier for this item:',
    'Pilih Toples / Batch Curah': 'Select Bulk Jar / Batch',
    'Pilih Transaksi': 'Select Transaction',
    'Pilih unit oven yang akan digunakan:': 'Select oven unit to use:',
    'Pilih varietas benih dan lot batch yang akan disesuaikan.': 'Select the seed variety and batch lot to adjust.',
    'Pilihan Cepat': 'Quick Select',
    'Pilihan Cepat:': 'Quick Select:',
    'PILIHAN CEPAT:': 'QUICK SELECT:',
    'Pilihan Jenis Kemasan': 'Packaging Type Selection',
    'Pilihan Kategori': 'Category Selection',
    'PILIHAN KEDALUWARSA / BATCH:': 'EXPIRY / BATCH SELECTION:',
    'Pilihan Unit Oven': 'Oven Unit Selection',
    'Piutang & Cicilan Pelanggan': 'Customer Receivables & Installments',
    'Piutang & Pembayaran Tempo': 'Receivables & Credit Payments',
    'Piutang & Tempo': 'Accounts Receivable & Credit',
    'Piutang Aktif': 'Active Receivables',
    'Piutang atau jadwal sapaan follow-up terkait nota ini otomatis dibatalkan.': 'Receivables or follow-up greeting schedules linked to this receipt are automatically cancelled.',
    'Piutang Jatuh Tempo': 'Overdue Receivables',
    'Pop-up terblokir oleh browser. Izinkan pop-up untuk mencetak Surat Jalan.': 'Pop-up blocked by browser. Allow pop-ups to print Delivery Order.',
    'Posisi Stok & Valuasi': 'Stock Position & Valuation',
    'Posisi Stok & Valuasi Aset': 'Stock Position & Asset Valuation',
    'Posisi Stok &amp; Valuasi': 'Stock Position & Valuation',
    'Posisi Stok &amp; Valuasi Aset': 'Stock Position & Asset Valuation',
    'Pratinjau Logo': 'Logo Preview',
    'Prioritas FIFO': 'FIFO Priority',
    'Produk': 'Products',
    'Produk & Batch': 'Product & Batch',
    'Produk &amp; Batch': 'Product & Batch',
    'Produk Benih': 'Seed Product',
    'Produk berhasil disimpan.': 'Product saved successfully.',
    'Produk diaktifkan.': 'Product activated.',
    'Produk dinonaktifkan.': 'Product deactivated.',
    'Produk Terlaris': 'Best Selling Products',
    'Produksi dibatalkan & stok dikembalikan.': 'Production cancelled & stock restored.',
    'Profil outlet mitra berhasil disimpan.': 'Partner outlet profile saved successfully.',
    'Profil Toko & Pajak': 'Store Profile & Tax',
    'Proses': 'Process',
    'Proses & Simpan Kemasan': 'Process & Save Packets',
    'Proses & Terbitkan Stok Kemasan': 'Process & Issue Packaged Stock',
    'Proses &amp; Terbitkan Stok Kemasan': 'Process & Issue Packaged Stock',
    'Proses DHT': 'DHT Processing',
    'Proses Oven': 'Oven Processing',
    'Pulihkan Kategori Standar?': 'Restore Default Categories?',
    'Purna Jual & Kepuasan': 'After-Sales & Satisfaction',
    'Purna Jual & Kepuasan Pelanggan': 'After-Sales & Customer Satisfaction',
    'Pusat Benih Tanaman Lokal & Edukasi Permakultur': 'Local Plant Seed Center & Permaculture Education',
    'Pusat cetak faktur, struk kasir, dan arsip nota penjualan.': 'Invoice printing center, cashier receipts, and sales archive.',
    'Pusat kendali klaim garansi benih, pelacakan penarikan batch, sapaan panen via WA, dan konsultasi kebun.': 'Command center for warranty claims, batch recalls, WhatsApp harvest greetings, and garden consultations.',
    'Pusat monitoring pengiriman Surat Jalan, serah terima fisik benih (Proof of Delivery), dan arsip tanda tangan digital mitra.': 'Monitoring center for Delivery Order shipments, physical seed handover (Proof of Delivery), and partner digital signatures archive.',
    'Qty': 'Qty',
    'Qty Kirim': 'Shipped Qty',
    'Quality Control (QC)': 'Quality Control (QC)',
    'Quality Control & Sertifikasi Benih': 'Quality Control & Seed Certification',
    'Quality Control &amp; Sertifikasi Benih': 'Quality Control & Seed Certification',
    'Rabu': 'Wednesday',
    'Rata-rata Margin (%)': 'Average Margin (%)',
    'RATA-RATA MARGIN (%)': 'AVERAGE MARGIN (%)',
    'Ref Faktur / SJ': 'Invoice / DO Ref',
    'Reguler': 'Regular',
    'Rekam keluhan daya tumbuh benih, garansi, dan edukasi kebun.': 'Record seed germination complaints, warranties, and garden education.',
    'Rekam Medis Kebun & Klaim Purna Jual': 'Garden Medical Records & After-Sales Claims',
    'Rekening Bank Kios': 'Kiosk Bank Account',
    'Rentang Tanggal': 'Date Range',
    'Reset': 'Reset',
    'Reset Filter': 'Reset Filter',
    'Resolusi': 'Resolution',
    'Retur': 'Returned',
    'Retur Rusak/Exp': 'Damaged/Expired Returns',
    'Rincian': 'Details',
    'Rincian Benih Fisik yang Diserahkan': 'Details of Physical Seeds Handed Over',
    'Rincian Kendala Daya Tumbuh': 'Germination Issue Details',
    'Rincian Kendala Kebun Pelanggan': 'Customer Garden Issues Details',
    'Rincian Lengkap': 'Full Details',
    'Rincian Modal & Biaya': 'Cost & Expense Details',
    'RINCIAN MODAL & BIAYA': 'COST & EXPENSE DETAILS',
    'Rincian Modal &amp; Biaya': 'Cost & Expense Details',
    'RINCIAN MODAL &amp; BIAYA': 'COST & EXPENSE DETAILS',
    'Ringkasan Finansial': 'Financial Summary',
    'Ringkasan Operasional': 'Operational Overview',
    'Riwayat & Faktur': 'History & Invoices',
    'Riwayat Hasil QC': 'QC Results History',
    'Riwayat Kemas Benih': 'Repackaging History',
    'Riwayat Mutasi Stok': 'Stock Mutation History',
    'Riwayat Mutasi Stok Fisik': 'Physical Stock Mutation History',
    'Riwayat Nota Belanja': 'Shopping Receipts History',
    'Riwayat Pengeluaran': 'Expense History',
    'Riwayat Produksi Pengemasan': 'Packaging Production History',
    'Riwayat Sudah Disapa': 'Previously Contacted History',
    'Riwayat Tagihan Lunas': 'Paid Invoices History',
    'Riwayat Transaksi': 'Transaction History',
    'Riwayat Transaksi & Faktur': 'Transaction History & Invoices',
    'Riwayat Transaksi Kasir & Detail Item': 'Cashier Transaction History & Item Details',
    'Rockwool / Spons Semai': 'Rockwool / Germination Sponge',
    'Rotasi Produk (Top & Slow)': 'Product Turnover (Top & Slow)',
    'Rotasi Produk (Top &amp; Slow)': 'Product Turnover (Top & Slow)',
    'Sabtu': 'Saturday',
    'Sachet': 'Packets',
    'Saldo Baru': 'New Balance',
    'Saldo Lalu': 'Previous Balance',
    'Saldo Stok Fisik': 'Physical Stock Balance',
    'Salin': 'Copy',
    'Sampai': 'Until',
    'Sampai Tgl': 'To Date',
    'Sampai Tgl:': 'To Date:',
    'Sampai:': 'Until:',
    'Satuan': 'Unit',
    'Satuan (Unit)': 'Unit of Measure',
    'Sebelumnya': 'Previous',
    'Segarkan Data': 'Refresh Data',
    'Segera Expired': 'Expiring Soon',
    'Segera Expired (≤60 Hari)': 'Near Expiry (≤60 Days)',
    'Sekaligus buatkan versi kemasan sachet siap jual (2-in-1)': 'Simultaneously create retail packet version (2-in-1)',
    'Selanjutnya': 'Next',
    'Selanjutnya &raquo;': 'Next &raquo;',
    'Selasa': 'Tuesday',
    'Selesai': 'Completed',
    'Selesai (Delivered)': 'Completed (Delivered)',
    'Selesai & Tutup': 'Done & Close',
    'Selesai DHT': 'DHT Completed',
    'Selesai Oven': 'Oven Completed',
    'Selesaikan Pembayaran': 'Complete Payment',
    'Selisih (+/-)': 'Discrepancy (+/-)',
    'Seluruh barang di atas dititipkan untuk dipajang dan dijual di outlet mitra Kios IDEP.': 'All goods above are consigned for display and sale at IDEP Kiosk partner outlets.',
    'Seluruh data mutasi, saldo toples benih, dan antrean FIFO disegarkan.': 'All mutation data, seed jar balances, and FIFO queues refreshed.',
    'Seluruh simulasi riwayat transaksi berhasil dibersihkan!': 'All simulated transaction history cleared successfully!',
    'Semua': 'All',
    'Semua Kasir': 'All Cashiers',
    'Semua Kategori': 'All Categories',
    'Semua Mutasi': 'All Mutations',
    'Semua Peringatan / Status': 'All Alerts / Statuses',
    'Semua persediaan stok dalam batas aman.': 'All stock inventory levels are within safe limits.',
    'Semua Petani': 'All Farmers',
    'Semua Produk': 'All Products',
    'Semua Status': 'All Statuses',
    'Semua Status Pembayaran': 'All Payment Statuses',
    'Semua Supplier': 'All Suppliers',
    'Semua Toko': 'All Stores',
    'Semua Waktu': 'All Time',
    'Senin': 'Monday',
    'September': 'September',
    'Serah Terima / Tanda Tangan': 'Handover / Signatures',
    'Serah Terima Barang Konsinyasi': 'Consignment Goods Handover',
    'Sesi berakhir. Silakan login kembali.': 'Session expired. Please log in again.',
    'Sesuai standar Bank Indonesia, tarif MDR QRIS untuk Usaha Mikro (UMI) adalah': 'According to Bank Indonesia standards, the QRIS MDR rate for Micro Enterprises (UMI) is',
    'Setelah peran dibuat, Anda dapat mengatur centang izin per modul pada tabel matriks.': 'After creating the role, you can configure module permissions on the matrix table.',
    'Setelah tombol Mulai Proses Oven ditekan, timer 24 jam akan berjalan otomatis dan terpantau secara realtime di tabel QC.': 'After pressing Start Oven, 24-hour timer will run automatically and be monitored in real-time.',
    'Siap Jual': 'Ready for Sale',
    'Siap Panen & Rotasi': 'Ready to Harvest & Rotation',
    'Silakan pilih Kode Batch toples benih.': 'Please select seed jar Batch Code.',
    'Simpan': 'Save',
    'Simpan & Proses Klaim': 'Save & Process Claim',
    'Simpan & Terbitkan Berita Acara Resmi': 'Save & Issue Official Report',
    'Simpan Catatan Konsultasi': 'Save Consultation Record',
    'Simpan Catatan QC': 'Save QC Record',
    'Simpan Data': 'Save Data',
    'Simpan Faktur Pembelian': 'Save Purchase Invoice',
    'Simpan ke Database Member CRM': 'Save to Member CRM Database',
    'Simpan Koreksi': 'Save Correction',
    'Simpan Matriks Hak Akses': 'Save Role Permissions Matrix',
    'Simpan Pelanggan': 'Save Customer',
    'Simpan Pembayaran': 'Save Payment',
    'Simpan Pending': 'Hold Transaction',
    'Simpan Pengaturan Telegram': 'Save Telegram Settings',
    'Simpan Pengguna': 'Save User',
    'Simpan Penyesuaian Stok': 'Save Stock Adjustment',
    'Simpan Perubahan': 'Save Changes',
    'Simpan Produk': 'Save Product',
    'Simpan Profil Outlet': 'Save Outlet Profile',
    'Simpan Profil Toko & Pajak': 'Save Store Profile & Tax',
    'Simpan struk ini sebagai bukti transaksi benih resmi.': 'Keep this receipt as official seed transaction proof.',
    'Simpan Transaksi': 'Save Transaction',
    'Sisa / Awal': 'Remaining / Initial',
    'Sisa Batch Saat Ini:': 'Current Batch Remaining:',
    'Sisa di Toko': 'Remaining at Store',
    'Sisa Kuantitas': 'Remaining Quantity',
    'Sisa Piutang:': 'Remaining Balance:',
    'Sisa Stok': 'Remaining Stock',
    'Sisa Stok di Rak': 'Remaining Shelf Stock',
    'Sisa stok lot akan otomatis terpotong atau bertambah sesuai koreksi.': 'Remaining lot stock will automatically decrease or increase according to correction.',
    'Sisa Tagihan': 'Remaining Balance',
    'Sisa Waktu Oven': 'Remaining Oven Time',
    'Sistem Kasir & Inventaris Benih Terpadu': 'Integrated Cashier & Seed Inventory System',
    'Skema Pembayaran Toko Mitra': 'Partner Store Payment Scheme',
    'SKU': 'SKU',
    'Slogan / Tagline Toko': 'Store Slogan / Tagline',
    'Smart Seed & Eco POS': 'Smart Seed & Eco POS',
    'Solusi / Resolusi Garansi': 'Warranty Resolution / Solution',
    'Solusi & Rekomendasi Teknis yang Diberikan': 'Technical Solutions & Recommendations Provided',
    'Solusi Diberikan': 'Resolution Provided',
    'Staf Gudang': 'Warehouse Staff',
    'Staf Kios': 'Kiosk Staff',
    'Staf Kios IDEP': 'IDEP Kiosk Staff',
    'Staf Toko / Kasir': 'Store Staff / Cashier',
    'Standardisasi Daya Tumbuh Duplo 100 Butir (Ambang Minimal IDEP 80%)': '100-Seed Duplo Germination Standardization (IDEP Min. 80%)',
    'Standardisasi mutu benih, uji daya tumbuh duplo 100 butir, dan pengeringan DHT 24 jam.': 'Seed quality standards, 100-seed duplo germination tests, and 24-hr DHT oven curing.',
    'Standardisasi uji duplo 100 butir (Ambang Minimal IDEP 80%), penjemuran DHT 24 jam, & dokumentasi foto baki on-site.': '100-seed duplo standardization (IDEP Min. 80%), 24-hr DHT curing, & on-site tray photo documentation.',
    'Standardisasi uji duplo 100 butir (Ambang Minimal IDEP 80%), penjemuran DHT 24 jam, &amp; dokumentasi foto baki on-site.': '100-seed duplo standardization (IDEP Min. 80%), 24-hr DHT curing, & on-site tray photo documentation.',
    'Status': 'Status',
    'Status & Usia': 'Status & Age',
    'Status Hari': 'Days Status',
    'Status Kelulusan': 'Passing Status',
    'Status nota akan ditandai': 'Receipt status will be marked as',
    'Status Operasional Outlet': 'Outlet Operational Status',
    'Status Pembayaran': 'Payment Status',
    'Status Pengiriman': 'Delivery Status',
    'Status Tagihan Piutang Aktif': 'Active Receivables Billing Status',
    'Stok': 'Stock',
    'Stok & Antrean Batch (FIFO)': 'Stock & FIFO Batch Queue',
    'Stok & Antrean FIFO': 'Stock & FIFO Queue',
    'Stok & Batch FIFO': 'Stock & FIFO Batches',
    'Stok batch di atas saat ini adalah saldo awal master. Riwayat akan otomatis tercatat di sini saat terjadi': 'The batch stock above is currently the master initial balance. History will automatically be recorded here upon',
    'Stok benih kemasan jadi akan dipotong otomatis dari gudang pusat secara FIFO dan ditambahkan ke saldo rak outlet. Dokumen Surat Jalan Delivery Order otomatis diterbitkan ke Google Drive.': 'Packaged seed stock will be deducted from central warehouse via FIFO and added to outlet shelf balance. Delivery Order documents automatically published to Google Drive.',
    'Stok gudang pusat untuk': 'Central warehouse stock for',
    'Stok Menipis (≤ 5 pcs/gr)': 'Low Stock (≤ 5 pcs/gr)',
    'Stok Menipis (6 - 15)': 'Low Stock (6 - 15)',
    'Stok otomatis disinkronkan & dihitung menggunakan kaidah FIFO.': 'Stock automatically synchronized & calculated using FIFO principles.',
    'Stok Sistem': 'System Stock',
    'Struk belanja terselesaikan': 'Completed sales receipts',
    'Struk Termal (58mm)': 'Thermal Receipt (58mm)',
    'Subtotal': 'Subtotal',
    'Sudah Bayar': 'Amount Paid',
    'Suhu Target (°C)': 'Target Temperature (°C)',
    'Sumber Dana': 'Funding Source',
    'Supplier ditambahkan.': 'Supplier added.',
    'Surat Jalan & Serah Terima Lapangan': 'Delivery Order & Field Handover',
    'Surat Jalan Konsinyasi': 'Consignment Delivery Orders',
    'Surat Jalan pengiriman ke outlet berhasil dibuat di Google Drive. Apakah Anda ingin membuka/mengunduh dokumen PDF Surat Jalan sekarang?': 'Delivery order document created in Google Drive. Would you like to view/download PDF now?',
    'Surat jalan pengiriman konsinyasi berhasil dibuat dan disimpan.': 'Consignment delivery order created and saved successfully.',
    'Susut / Rendemen (%)': 'Loss / Waste (%)',
    'Susut Kadar Air / Timbangan (Curah)': 'Moisture Loss / Scale Shrinkage (Bulk)',
    'Tabel Rincian Penjualan & Margin FIFO': 'Sales Breakdown & FIFO Margin Table',
    'Tabel Rincian Penjualan &amp; Margin FIFO': 'Sales Breakdown & FIFO Margin Table',
    'Tagihan Konsinyasi': 'Consignment Billing',
    'Tagihan tempo berjalan': 'Outstanding credit invoices',
    'Tahap 4 adalah penentu kelulusan batch untuk membuka kunci kasir & kemas mandiri.': 'Stage 4 determines batch passing to unlock cashier & repackaging.',
    'Tahap Terakhir': 'Last Stage',
    'Tahapan Pengujian': 'Testing Stage',
    'Tahapan Uji': 'Testing Stage',
    'Tahun': 'Years',
    'Tahun Ini': 'This Year',
    'Tambah': 'Add',
    'Tambah Akun Pengguna': 'Add User Account',
    'Tambah Baru': 'Add New',
    'Tambahkan Peran': 'Add Role',
    'Tanah Kebun + Kompos': 'Garden Soil + Compost',
    'Tanda Tangan & Cap Toko': 'Store Signature & Stamp',
    'Tanda Tangan Auditor': 'Auditor Signature',
    'Tanda Tangan Digital Penerima': 'Receiver Digital Signature',
    'Tanda Tangan Penerima': 'Recipient Signature',
    'Tanda Tangan Pengirim (IDEP)': 'Courier / Sender Signature (IDEP)',
    'Tanda Tangan Petugas IDEP': 'IDEP Officer Signature',
    'Tanda Tangan PIC Toko': 'Store PIC Signature',
    'Tanda Tangan PIC Toko Mitra': 'Partner Store PIC Signature',
    'Tanda Tangan Toko Mitra (Penerima)': 'Partner Store Signature (Receiver)',
    'Tanda Terima Pelanggan,': 'Customer Acknowledgment,',
    'Tandai sebagai selesai setelah diverifikasi:': 'Mark as completed after verification:',
    'Tanggal': 'Date',
    'Tanggal / Waktu': 'Date / Time',
    'Tanggal Drop': 'Drop Date',
    'Tanggal Faktur:': 'Invoice Date:',
    'Tanggal Jatuh Tempo Pembayaran': 'Payment Due Date',
    'Tanggal Kadaluarsa': 'Expiration Date',
    'Tanggal Kirim': 'Shipment Date',
    'Tanggal Masuk': 'Entry Date',
    'Tanggal Masuk Toko': 'Store Entry Date',
    'Tanggal Opname': 'Stocktake Date',
    'Tanggal Panen': 'Harvest Date',
    'Tanggal Pengeluaran': 'Expense Date',
    'Tanggal Semai': 'Sowing Date',
    'Tanggal:': 'Date:',
    'Tanpa Exp': 'No Expiry',
    'Target Kemasan (Siap Jual)': 'Target Packaging (Ready to Sell)',
    'Tarif Pajak (PPN %)': 'Tax Rate (VAT %)',
    'Tarif Pajak Penjualan (PPN %)': 'Sales Tax Rate (VAT %)',
    'Tarik Batch (Recall)': 'Batch Recall',
    'Telegram Bot Token': 'Telegram Bot Token',
    'Telegram Chat ID / Group ID': 'Telegram Chat ID / Group ID',
    'Template Format Kode Batch': 'Batch Code Format Template',
    'Template otomatis untuk menghasilkan kode lot/batch benih saat pembelian atau produksi.': 'Automatic template to generate seed lot/batch codes upon purchase or production.',
    'TEMPO': 'CREDIT',
    'Tempo / Piutang': 'Credit / Receivable',
    'Terapkan': 'Apply',
    'Terapkan Filter': 'Apply Filter',
    'Terbilang:': 'In Words:',
    'Terdaftar di CRM': 'Registered in CRM',
    'Terdaftar di CRM:': 'Registered in CRM:',
    'Terima kasih atas kunjungan Anda. Salam Lestari!': 'Thank you for your visit. Best regards!',
    'Terjadi Kesalahan': 'An Error Occurred',
    'Terjual': 'Sold',
    'Terjual (Auto)': 'Sold (Auto)',
    'Terkirim': 'Dispatched',
    'Terlambat': 'Overdue',
    'Tgl / ID': 'Date / ID',
    'Tgl Expired': 'Expiration Date',
    'Tgl Kadaluarsa': 'Expiration Date',
    'Tgl Kadaluarsa Kemasan': 'Packaging Expiration Date',
    'TGL KADALUARSA KEMASAN': 'PACKAGING EXPIRATION DATE',
    'Tgl Panen': 'Harvest Date',
    'Tgl Panen:': 'Harvest Date:',
    'Tgl Produksi': 'Production Date',
    'Tgl Produksi / Kemas': 'Production / Packaging Date',
    'Tgl Transaksi': 'Transaction Date',
    'Tidak ada audit konsinyasi atau penjualan outlet mitra dalam periode ini.': 'No consignment audits or partner outlet sales during this period.',
    'Tidak ada batch stok yang sesuai dengan filter atau kata kunci.': 'No stock batches match filter or keyword.',
    'Tidak ada catatan penjualan atau drop konsinyasi yang menggunakan batch ini.': 'No sales or consignment drop records using this batch.',
    'Tidak ada dokumen Surat Jalan yang cocok dengan filter saat ini.': 'No Delivery Order documents match current filter.',
    'Tidak ada histori pengemasan yang cocok dengan kata kunci.': 'No repackaging history matching keywords.',
    'Tidak ada nota yang cocok.': 'No matching receipts.',
    'Tidak ada produk pada filter ini.': 'No products found on this filter.',
    'Tidak ada rincian barang.': 'No item details.',
    'Tidak ada rincian item benih.': 'No seed item details.',
    'Tidak ada stok mendekati kadaluarsa.': 'No stock items near expiration.',
    'Tidak ada tagihan piutang aktif yang perlu ditindaklanjuti.': 'No active receivable invoices requiring follow-up.',
    'Tidak ada tagihan piutang aktif.': 'No active receivables.',
    'Tidak ada varietas benih yang sesuai dengan pencarian atau filter.': 'No seed varieties matching search or filter.',
    'tidak diketahui': 'unknown',
    'TIDAK LULUS': 'FAILED',
    'Tidak memiliki piutang aktif.': 'No active receivables.',
    'Tier Harga': 'Price Tier',
    'Tindakan ini tidak dapat dibatalkan. Ketik kata RESET di bawah ini untuk melanjutkan:': 'This action cannot be undone. Type the word RESET below to proceed:',
    'Tingkat Harga': 'Price Tier',
    'TINGKAT HARGA': 'PRICE TIER',
    'Tingkat Harga Khusus Outlet': 'Outlet-Specific Price Tier',
    'Tipe': 'Type',
    'Tipe Barang': 'Item Type',
    'Tipe Mutasi': 'Mutation Type',
    'Tipe Pembayaran': 'Payment Type',
    'Tipe Persediaan': 'Inventory Type',
    'Titip Baru': 'New Stock Delivery',
    'Token Bot Telegram': 'Telegram Bot Token',
    'Toko Cabang / Mitra': 'Branch Store / Partner',
    'Toko Cabang & Mitra': 'Branch Stores & Partners',
    'Toko Cabang & Mitra Konsinyasi': 'Branch Stores & Partner Consignment',
    'Toko Cabang &amp; Mitra': 'Branch Stores & Partners',
    'Topik Tanaman / Komoditas': 'Plant Topic / Commodity',
    'Toples': 'Jars',
    'Toples / Batch Aktif': 'Active Jars / Batches',
    'Toples Curah (Bahan Baku)': 'Bulk Storage Jar (Raw Material)',
    'Toples Simpan': 'Storage Jar',
    'Total': 'Total',
    'Total Belanja': 'Total Spending',
    'Total Benih Terditribusi:': 'Total Distributed Seeds:',
    'Total Biaya Kemasan': 'Total Packaging Cost',
    'Total Daya Tumbuh:': 'Total Germination Rate:',
    'Total Harga': 'Total Price',
    'Total Klaim Kebun': 'Total Garden Claims',
    'Total kuantitas barang yang ditransfer ke rak konsinyasi outlet mitra.': 'Total quantity of items transferred to partner outlet consignment shelf.',
    'Total kuantitas barang yang ditransfer ke rak konsinyasi.': 'Total quantity of items transferred to consignment shelf.',
    'Total Laba Kotor FIFO': 'Total FIFO Gross Profit',
    'TOTAL LABA KOTOR FIFO': 'TOTAL FIFO GROSS PROFIT',
    'Total Modal HPP FIFO:': 'Total FIFO COGS Cost:',
    'Total Nilai Rak': 'Total Shelf Value',
    'Total Nilai Titip': 'Total Consigned Value',
    'Total Nilai Valuasi Aset': 'Total Asset Valuation Value',
    'Total Nilai Valuasi Benih': 'Total Seed Valuation Value',
    'Total Nota': 'Total Receipts',
    'Total Omzet': 'Total Revenue',
    'TOTAL OMZET': 'TOTAL REVENUE',
    'Total Omzet (Rp)': 'Total Revenue (Rp)',
    'Total Pcs': 'Total Pcs',
    'Total Pelanggan Terdaftar': 'Total Registered Customers',
    'Total Pembelian': 'Total Purchases',
    'Total Pendapatan Kotor': 'Total Gross Revenue',
    'Total Pengadaan': 'Total Procurement',
    'TOTAL PENGADAAN': 'TOTAL PROCUREMENT',
    'Total Pengadaan:': 'Total Procurement:',
    'Total Pengeluaran Belanja': 'Total Spending Expenses',
    'Total Pengeluaran Bulan Ini': 'Total Expenses This Month',
    'TOTAL PENGELUARAN BULAN INI': 'TOTAL EXPENSES THIS MONTH',
    'Total Penjualan': 'Total Sales',
    'Total Piutang Berjalan': 'Total Outstanding Receivables',
    'Total Sachet Siap Jual': 'Total Retail Packets',
    'Total Tagihan': 'Total Receivables',
    'TOTAL TAGIHAN': 'TOTAL BILL AMOUNT',
    'Total Tagihan (Rp)': 'Total Billing (Rp)',
    'Total Tagihan Aktif': 'Total Active Receivables',
    'TOTAL TAGIHAN AKTIF': 'TOTAL ACTIVE RECEIVABLES',
    'Total tagihan pelanggan tetap sama dengan harga belanja. Kios menerima dana bersih setelah dipotong biaya MDR QRIS.': 'Customer bill remains equal to purchase amount. Kiosk receives net funds after deducting QRIS MDR fee.',
    'Total Valuasi Aset Modal:': 'Total Capital Asset Valuation:',
    'Traceability Asal Benih': 'Seed Origin Traceability',
    'Transaksi Baru': 'New Transaction',
    'Transaksi berhasil diselesaikan!': 'Transaction completed successfully!',
    'Transaksi cicilan / piutang tempo wajib memiliki nomor kontak pelanggan!': 'Credit / installment transactions must have a customer contact number!',
    'TRANSAKSI DIBATALKAN (VOID)': 'TRANSACTION VOIDED',
    'Transaksi dihapus & stok dikembalikan.': 'Transaction deleted & stock restored.',
    'Transaksi Hari Ini': 'Today\'s Transactions',
    'Transaksi Terkini': 'Recent Transactions',
    'Transaksi tidak ditemukan.': 'Transaction not found.',
    'Transfer Bank': 'Bank Transfer',
    'Transfer Bank IDEP': 'IDEP Bank Transfer',
    'TRANSFER BANK IDEP': 'IDEP BANK TRANSFER',
    'Tujuan Toko Cabang / Mitra': 'Target Branch / Partner Store',
    'Tuliskan catatan detail jika terdapat ketidaksesuaian jumlah fisik': 'Write detailed notes if there is a physical count discrepancy',
    'Tunai': 'Cash',
    'Tutup': 'Close',
    'Tutup Dialog': 'Close Dialog',
    'Tutup Form': 'Close Form',
    'Tutup Menu': 'Close Menu',
    'Tutup Pratinjau': 'Close Preview',
    'Tutup pratinjau faktur': 'Close invoice preview',
    'Uang Diterima': 'Cash Received',
    'Uang Muka (DP)': 'Down Payment (DP)',
    'Uang Pas': 'Exact Cash',
    'Ubah': 'Edit',
    'Ubah Status': 'Change Status',
    'Uji Berkala / Semai Ulang:': 'Periodic / Retest:',
    'Uji Notifikasi Telegram': 'Test Telegram Notification',
    'Uji QC': 'QC Test',
    'Ulangi / Hapus': 'Retry / Clear',
    'Umum': 'General Customer',
    'Umur Panen (Hari)': 'Days to Harvest',
    'Unduh': 'Download',
    'Unduh CSV': 'Download CSV',
    'Unduh Excel': 'Download Excel',
    'Unduh Format Excel / CSV': 'Download Excel / CSV Format',
    'Unduh PDF': 'Download PDF',
    'USERNAME': 'USERNAME',
    'Username wajib diisi.': 'Username is required.',
    'Utama': 'Main',
    'Valuasi Risiko (Rp)': 'Risk Valuation (Rp)',
    'Varian Bahasa:': 'Language Variant:',
    'Varietas Benih': 'Seed Variety',
    'Varietas Benih Diserap': 'Seed Varieties Absorbed',
    'Varietas Diklaim': 'Claimed Variety',
    'Varietas Produk Benih': 'Seed Product Varieties',
    'Verifikasi': 'Verify',
    'Versi Kemasan Siap Jual (Sachet / Pack)': 'Retail Packaged Version (Sachet / Pack)',
    'Volume Nota': 'Receipt Volume',
    'VOLUME NOTA': 'RECEIPT VOLUME',
    'Volume Nota Transaksi:': 'Transaction Receipts Volume:',
    'Wajib memilih salah satu batch bahan mentah dari daftar.': 'Please select a raw material batch from the list.',
    'Wajib mengisi catatan alasan penyesuaian untuk transparansi audit.': 'Adjustment reason note is required for audit transparency.',
    'Waktu': 'Time',
    'Waktu & Penguji': 'Time & Tester',
    'Waktu Transaksi': 'Transaction Time',
    'Wilayah / Alamat Asal': 'Region / Origin Address',
    'Administrator:': 'Administrator:',
    'Administrator Utama': 'Main Administrator',
    'Atur centang izin akses operasional kasir, katalog produk, pelanggan, dan faktur transaksi.': 'Configure access permissions for cashier operations, product catalog, customers, and transaction invoices.',
    'Atur centang izin akses pengujian mutu benih, stok batch FIFO, dan kemas mandiri.': 'Configure access permissions for seed quality testing, FIFO stock batches, and repackaging.',
    'Atur centang izin akses per modul untuk peran': 'Configure module access permissions for role',
    'Bahasa Antarmuka (Language Settings)': 'Interface Language (Language Settings)',
    'Belum ada akun pengguna.': 'No user accounts found.',
    'Biaya & Pengeluaran': 'Operational Expenses',
    'Biaya &amp; Pengeluaran': 'Operational Expenses',
    'Daftar Akun Pengguna': 'User Accounts List',
    'Dibuat Pada': 'Created At',
    'DIBUAT PADA': 'CREATED AT',
    'Edit Akun Pengguna': 'Edit User Account',
    'Gunakan fitur ini untuk menghapus seluruh riwayat transaksi simulasi. Data master produk dan pengaturan tidak akan terhapus.': 'Use this feature to clear all simulation transaction history. Master product data and settings will not be deleted.',
    'Hanya Admin yang dapat mengelola hak akses peran.': 'Only Admin can manage role permissions.',
    'Hanya Admin yang dapat mengelola pengguna.': 'Only Admin can manage users.',
    'Hapus Akun Pengguna': 'Delete User Account',
    'Karantina QC:': 'QC Quarantine:',
    'Kemas Mandiri (Produksi)': 'Repackaging (Production)',
    'Koordinator (View)': 'Coordinator (View)',
    'Koordinator (View-Only)': 'Coordinator (View-Only)',
    'Koordinator Lapangan & Evaluasi': 'Field & Evaluation Coordinator',
    'Koordinator Program:': 'Program Coordinator:',
    'Matriks hak akses berhasil disimpan!': 'Role permissions matrix saved successfully!',
    'Memiliki akses penuh (Lihat, Input/Ubah, Hapus) pada seluruh modul sistem demi integritas dan kelancaran operasional.': 'Has full access (View, Create/Edit, Delete) across all system modules for operational integrity and continuity.',
    'Memiliki hak akses baca/pantau (View-Only) ke seluruh modul, tanpa izin memodifikasi atau menghapus data.': 'Has read/monitor (View-Only) access across all modules, without permission to modify or delete data.',
    'Memuat daftar pengguna...': 'Loading users list...',
    'Memuat matriks hak akses...': 'Loading permissions matrix...',
    'MODUL SISTEM': 'SYSTEM MODULE',
    'NAMA LENGKAP': 'FULL NAME',
    'Nama Peran Baru': 'New Role Name',
    'Operator Quality Control': 'Quality Control Operator',
    'Pengaturan Peran:': 'Role Settings:',
    'Pengguna berhasil disimpan!': 'User saved successfully!',
    'Pengingat Oven DHT:': 'DHT Oven Reminder:',
    'Peran / Hak Akses': 'Role / Permissions',
    'PERAN / HAK AKSES': 'ROLE / PERMISSIONS',
    'Peringatan jatuh tempo proses pengeringan / oven benih DHT.': 'Due alert for DHT seed drying / oven process.',
    'Pilihan Notifikasi Otomatis (Push Alerts)': 'Automatic Notification Options (Push Alerts)',
    'Preset Tingkat Harga (Multi-Tier)': 'Price Tier Presets (Multi-Tier)',
    'Quality Control (QC):': 'Quality Control (QC):',
    'Simpan Pengguna': 'Save User',
    'Staf Kasir:': 'Cashier Staff:',
    'Staf Kasir Toko': 'Store Cashier Staff',
    'Standarisasi tingkatan harga jual produk dan penomoran batch.': 'Standardize product selling price tiers and batch numbering.',
    'Tambah Akun Pengguna': 'Add User Account',
    'Tambah Peran Hak Akses Baru': 'Add New Role Permission',
    'Tambahkan Peran': 'Add Role',
    'Zona Bahaya / Pembersihan Data Uji Coba': 'Danger Zone / Test Data Cleanup',
    'Zona Bahaya: Reset Data': 'Danger Zone: Reset Data'
  };

  // Pre-compiled regex patterns for dynamic phrases and mixed content
  var PATTERN_RULES = [
    { regex: /^Sisa\s*:\s*(.*)$/i, replace: 'Left: $1' },
    { regex: /^Stok\s*:\s*(.*)$/i, replace: 'Stock: $1' },
    { regex: /^Harga\s*:\s*(.*)$/i, replace: 'Price: $1' },
    { regex: /^Total\s*:\s*(.*)$/i, replace: 'Total: $1' },
    { regex: /^Subtotal\s*:\s*(.*)$/i, replace: 'Subtotal: $1' },
    { regex: /^Waktu\s*:\s*(.*)$/i, replace: 'Time: $1' },
    { regex: /^Tanggal\s*:\s*(.*)$/i, replace: 'Date: $1' },
    { regex: /^Metode\s*:\s*(.*)$/i, replace: 'Method: $1' },
    { regex: /^Status\s*:\s*(.*)$/i, replace: 'Status: $1' },
    { regex: /^Petani\s*:\s*(.*)$/i, replace: 'Farmer: $1' },
    { regex: /^Supplier\s*:\s*(.*)$/i, replace: 'Supplier: $1' },
    { regex: /^Pelanggan\s*:\s*(.*)$/i, replace: 'Customer: $1' },
    { regex: /^Kasir\s*:\s*(.*)$/i, replace: 'Cashier: $1' },
    { regex: /^Jatuh Tempo\s*:\s*(.*)$/i, replace: 'Due Date: $1' },
    { regex: /^Kode Batch\s*:\s*(.*)$/i, replace: 'Batch Code: $1' },
    { regex: /^Varietas\s*:\s*(.*)$/i, replace: 'Variety: $1' },
    { regex: /^Kategori\s*:\s*(.*)$/i, replace: 'Category: $1' },
    { regex: /^Toples Simpan\s*:\s*(.*)$/i, replace: 'Storage Jar: $1' },
    { regex: /^HPP\s*:\s*(.*)$/i, replace: 'COGS: $1' },
    { regex: /^Diskon\s*:\s*(.*)$/i, replace: 'Discount: $1' },
    { regex: /^Pajak\s*:\s*(.*)$/i, replace: 'Tax: $1' },
    { regex: /^Kembalian\s*:\s*(.*)$/i, replace: 'Change: $1' },
    { regex: /^Uang Diterima\s*:\s*(.*)$/i, replace: 'Received: $1' },
    { regex: /^Est\.\s*Laba\s*:\s*(.*)$/i, replace: 'Est. Profit: $1' },
    { regex: /^(Kotor|Gross)\s*:\s*(.*?)\s*•\s*(\d+)\s+Nota$/i, replace: 'Gross: $2 • $3 Receipts' },
    { regex: /^Kotor\s*:\s*(.*)$/i, replace: 'Gross: $1' },
    { regex: /^Tagihan Hasil Penjualan\s*:\s*(.*)$/i, replace: 'Sales Proceeds Billing: $1' },
    { regex: /^Surat Jalan\s*#\s*(.*)$/i, replace: 'Delivery Order #$1' },
    { regex: /^Sisa\s+(\d+.*)$/i, replace: 'Left: $1' },
    { regex: /^Tgl Panen\s*:\s*(.*)$/i, replace: 'Harvest Date: $1' },
    { regex: /^Modal Benih\s*:\s*(.*)$/i, replace: 'Seed Cost: $1' },
    { regex: /^Biaya Kemas\s*:\s*(.*)$/i, replace: 'Packaging Cost: $1' },
    { regex: /^Modal HPP\s*:\s*(.*)$/i, replace: 'COGS: $1' },
    { regex: /^Contoh\s*:\s*(.*)$/i, replace: 'e.g. $1' },
    { regex: /^(\d+)\s+Data$/i, replace: '$1 Records' },
    { regex: /^Menampilkan\s+(\d+)\s+dari\s+(\d+)\s+transaksi$/i, replace: 'Showing $1 of $2 transactions' },
    { regex: /^Menampilkan\s+(\d+)\s+transaksi$/i, replace: 'Showing $1 transactions' },
    { regex: /^(.*?)\s*•\s*Tunai$/i, replace: '$1 • Cash' },
    { regex: /^(.*?)\s*•\s*Cicilan$/i, replace: '$1 • Installment' },
    { regex: /^(.*?)\s*•\s*Tempo$/i, replace: '$1 • Credit' },
    { regex: /^(.*?)\s*\(Tunai\)$/i, replace: '$1 (Cash)' },
    { regex: /^(.*?)\s*\(Cicilan\)$/i, replace: '$1 (Installment)' },
    { regex: /^(.*?)\s*\(Tempo\)$/i, replace: '$1 (Credit)' },
    { regex: /^Pakai Maks\s*\((.*?)\)$/i, replace: 'Use Max ($1)' },
    { regex: /^•\s*(\d+)\s+Nota$/i, replace: '• $1 Receipts' },
    { regex: /^(\d+)\s+Nota$/i, replace: '$1 Receipts' },
    { regex: /^(\d+)\s+Klien$/i, replace: '$1 Clients' },
    { regex: /^(\d+)\s+sachet$/i, replace: '$1 packets' },
    { regex: /^(\d+)\s+butir$/i, replace: '$1 seeds' },
    { regex: /^(\d+)\s+toples$/i, replace: '$1 jars' },
    { regex: /^(\d+)\s+pcs$/i, replace: '$1 pcs' },
    { regex: /^(\d+)\s+gr$/i, replace: '$1 gr' },
    { regex: /^(\d+)\s+gram$/i, replace: '$1 grams' },
    { regex: /^(\d+)\s+hari lagi$/i, replace: '$1 days left' },
    { regex: /^(\d+)\s+hari terlambat$/i, replace: '$1 days overdue' },
    { regex: /^(\d+)\s+hari$/i, replace: '$1 days' },
    { regex: /^(\d+)\s+bulan$/i, replace: '$1 months' },
    { regex: /^(\d+)\s+tahun$/i, replace: '$1 years' },
    { regex: /^(\d+)\s+jam$/i, replace: '$1 hours' },
    { regex: /^(\d+)\s+menit$/i, replace: '$1 minutes' },
    { regex: /^(\d+)\s+hr\s*\(Mendesak\)$/i, replace: '$1 days (Urgent)' },
    { regex: /^(\d+)\s+hr\s*\(Perlu Jadwal\)$/i, replace: '$1 days (Schedule Needed)' },
    { regex: /^(\d+)\s+hr\s*\(Aman\)$/i, replace: '$1 days (Safe)' },
    { regex: /^(\d+)\s+Uji$/i, replace: '$1 Tests' },
    { regex: /^(\d+)\s+Pilihan Harga$/i, replace: '$1 Price Tiers' },
    { regex: /^(\d+)\s+variasi$/i, replace: '$1 variations' },
    { regex: /^Daya Tumbuh:\s*(\d+)%/i, replace: 'Germination Rate: $1%' },
    { regex: /^Memuat\s+(.*?)\.\.\.$/i, replace: 'Loading $1...' },
    { regex: /^Cari\s+(.*?)\.\.\.$/i, replace: 'Search $1...' },
    { regex: /^Ketik\s+(.*?)\.\.\.$/i, replace: 'Type $1...' },
    { regex: /^PERINGATAN MUTU:\s*(\d+)\s*Batch Dalam Status QUARANTINE/i, replace: 'QUALITY WARNING: $1 Batches in QUARANTINE Status' },
    { regex: /^Biaya Transaksi QRIS\s*\((.*?)\)\s*:/i, replace: 'QRIS Transaction Fee ($1):' },
    { regex: /^Biaya Transaksi QRIS\s*\((.*?)\)\s*:\s*(.*)$/i, replace: 'QRIS Transaction Fee ($1): $2' },
    { regex: /^Daftar Kontak Penerima Batch\s*\((.*?)\)/i, replace: 'Batch Recipient Contacts List ($1)' },
    { regex: /^Memuat riwayat faktur transaksi periode\s+(.*?)\s+s\.d\.\s+(.*?)\.\.\.$/i, replace: 'Loading invoice history from $1 to $2...' },
    { regex: /^Akses ke modul\s+(.*?)\s+dibatasi untuk peran\s+(.*?)\.?$/i, replace: 'Access to module $1 is restricted for role $2.' },
    { regex: /^Gagal memuat\s+(.*?)\s*:\s*(.*)$/i, replace: 'Failed to load $1: $2' },
    { regex: /^Gagal memuat\s+(.*?)\s*:/i, replace: 'Failed to load $1:' },
    { regex: /^Gagal memuat\s+(.*?)\.?$/i, replace: 'Failed to load $1.' },
    { regex: /^Gagal menyimpan\s+(.*?)\s*:\s*(.*)$/i, replace: 'Failed to save $1: $2' },
    { regex: /^Gagal menyimpan\s*:\s*(.*)$/i, replace: 'Failed to save: $1' },
    { regex: /^Gagal menghapus\s+(.*?)\s*:\s*(.*)$/i, replace: 'Failed to delete $1: $2' },
    { regex: /^Gagal menghapus\s+(.*?)\.?$/i, replace: 'Failed to delete $1.' },
    { regex: /^Gagal membatalkan transaksi\s*:\s*(.*)$/i, replace: 'Failed to void transaction: $1' },
    { regex: /^Gagal mencatat pengeluaran\s*:\s*(.*)$/i, replace: 'Failed to record expense: $1' },
    { regex: /^Gagal mencatat pembayaran\s*:\s*(.*)$/i, replace: 'Failed to record payment: $1' },
    { regex: /^Gagal menyelesaikan DHT\s*:\s*(.*)$/i, replace: 'Failed to complete DHT: $1' },
    { regex: /^Gagal memulai DHT\s*:\s*(.*)$/i, replace: 'Failed to start DHT: $1' },
    { regex: /^Gagal menerbitkan faktur\s*:\s*(.*)$/i, replace: 'Failed to issue invoice: $1' },
    { regex: /^Gagal sinkronisasi webhook\s*:\s*(.*)$/i, replace: 'Failed to sync webhook: $1' },
    { regex: /^Berhasil membuat\s+(\d+)\s+produk\s*:\s*(.*)$/i, replace: 'Successfully created $1 products: $2' },
    { regex: /^Berhasil menyimpan\s+(.*?)\.?$/i, replace: 'Successfully saved $1.' },
    { regex: /^Berhasil memperbarui\s+(.*?)\.?$/i, replace: 'Successfully updated $1.' },
    { regex: /^Berhasil menghapus\s+(.*?)\.?$/i, replace: 'Successfully deleted $1.' },
    { regex: /^Pengemasan berhasil!\s*HPP baru\s*:\s*(.*)$/i, replace: 'Repackaging successful! New COGS: $1' },
    { regex: /^Koreksi stok berhasil disimpan!\s*(.*)$/i, replace: 'Stock adjustment saved! $1' },
    { regex: /^Foto baki siap disimpan\s*\((.*?)\)/i, replace: 'Tray photo ready to save ($1)' },
    { regex: /^Kuantitas pengurangan\s*\((.*?)\)\s*melebihi sisa batch\s*\((.*?)\)\.\s*Sisa batch akan diset ke 0\./i, replace: 'Reduction quantity ($1) exceeds remaining batch ($2). Remaining batch will be set to 0.' },
    { regex: /^Perhatian:\s*Kuantitas pengurangan\s*\((.*?)\)\s*melebihi sisa batch\s*\((.*?)\)\.\s*Sisa batch akan diset ke 0\./i, replace: 'Warning: Reduction quantity ($1) exceeds remaining batch ($2). Remaining batch will be set to 0.' },
    { regex: /^Halaman\s+(\d+)\s+dari\s+(\d+)$/i, replace: 'Page $1 of $2' },
    { regex: /^Menampilkan\s+(\d+)\s*-\s*(\d+)\s+dari\s+(\d+)\s+data$/i, replace: 'Showing $1-$2 of $3 records' },
    { regex: /^Menampilkan\s+(\d+)\s+dari\s+(\d+)\s+data$/i, replace: 'Showing $1 of $2 records' },
    { regex: /^Tidak ada transaksi yang cocok dengan\s+"(.*?)"/i, replace: 'No transactions matching "$1"' },
    { regex: /^Tidak ada produk yang cocok dengan\s+"(.*?)"/i, replace: 'No products matching "$1"' },
    { regex: /^Tidak ada batch benih yang sesuai dengan filter\s+"(.*?)"\.?/i, replace: 'No seed batches match filter "$1".' },
    { regex: /^Usia simpan:\s*(\d+)\s*hari$/i, replace: 'Shelf life: $1 days' },
    { regex: /^Semua persediaan stok dalam batas aman\.$/i, replace: 'All stock inventory levels are within safe limits.' },
    { regex: /^Tidak ada stok mendekati kadaluarsa\.$/i, replace: 'No stock items near expiration.' }
  ];

  // Regex patterns for smart prefix & punctuation stripping
  var PREFIX_REGEX = /^([\s\uD800-\uDBFF\uDC00-\uDFFF\u2600-\u27BF\uFE00-\uFE0F\u200D\u200B\u25A0-\u25FF\u2B00-\u2BFF\u2300-\u23FF\u2190-\u21FF\u2700-\u27BF\u2900-\u297F\u2B50\u2022\u00A9\u00AE\u203C\u2049\u2122\u2139\u3030\u303D\u3297\u3299\+\-\*✍️📦🌾📚🌱🪴👕⚡📄🧾🔥📷🔗⚠️✅🚚⭐🗑️📊🏪📋⏳🚨🖨️💾📁🔄🔒🏷️⚖️👨‍🌾🚀🐢⚪🟡🔴ℹ️⛔✔✓•]+)(.*)$/;
  var TRAIL_REGEX = /^(.*?)([\s:!?,.\*_\-]+)$/;
  var BRACKET_REGEX = /^(\(\{|\[)(.*?)(\)\}|\])$/;
  var COUNT_SUFFIX_REGEX = /^(.*?)\s*(\(\d+\)|\d+)$/;

  // Number to English Words converter (for invoice 'Terbilang')
  function numberToWordsEn(num) {
    num = Math.round(Number(num) || 0);
    if (num === 0) return 'Zero';
    if (num < 0) return 'Negative ' + numberToWordsEn(Math.abs(num));

    var a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    var b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function inWords(n) {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
      if (n < 1000000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
      if (n < 1000000000) return inWords(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 !== 0 ? ' ' + inWords(n % 1000000) : '');
      return inWords(Math.floor(n / 1000000000)) + ' Billion' + (n % 1000000000 !== 0 ? ' ' + inWords(n % 1000000000) : '');
    }

    return inWords(num).trim();
  }

  // Pre-build lowercase dictionary map for case-insensitive matching
  var LOWER_DICTIONARY = {};
  for (var dictKey in DICTIONARY) {
    LOWER_DICTIONARY[dictKey.toLowerCase()] = DICTIONARY[dictKey];
  }

  // Translate a single string
  function t(text, fallback) {
    if (!text || typeof text !== 'string') return text;
    if (currentLang !== 'en') return text;

    var trimmed = text.trim();
    if (!trimmed) return text;

    // 1. Direct exact dictionary lookup
    if (DICTIONARY[trimmed]) {
      return text.replace(trimmed, DICTIONARY[trimmed]);
    }

    // 2. Case-insensitive dictionary fallback
    var lower = trimmed.toLowerCase();
    if (LOWER_DICTIONARY[lower]) {
      var match = LOWER_DICTIONARY[lower];
      // If original text was all UPPERCASE, preserve uppercase
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 2) {
        match = match.toUpperCase();
      }
      return text.replace(trimmed, match);
    }

    // 3. Pattern rule match
    for (var i = 0; i < PATTERN_RULES.length; i++) {
      var rule = PATTERN_RULES[i];
      if (rule.regex.test(trimmed)) {
        return text.replace(trimmed, trimmed.replace(rule.regex, rule.replace));
      }
    }

    // 4. Bracket wrapper match: ( ... ) or [ ... ]
    var bm = trimmed.match(BRACKET_REGEX);
    if (bm) {
      var innerTrans = t(bm[2]);
      if (innerTrans !== bm[2]) {
        return text.replace(trimmed, bm[1] + innerTrans + bm[3]);
      }
    }

    // 5. Trailing count or parentheses count: e.g. "Toko Cabang & Mitra (0)", "Menunggu Uji 0"
    var cm = trimmed.match(COUNT_SUFFIX_REGEX);
    if (cm && cm[1]) {
      var baseTrans = t(cm[1]);
      if (baseTrans !== cm[1]) {
        return text.replace(trimmed, baseTrans + ' ' + cm[2]);
      }
    }

    // 6. Trailing punctuation match: e.g. "...", ":", "!", "?", "."
    var tm = trimmed.match(TRAIL_REGEX);
    if (tm) {
      var headTrans = t(tm[1]);
      if (headTrans !== tm[1]) {
        return text.replace(trimmed, headTrans + tm[2]);
      }
    }

    // 7. Leading prefix match: emoji / icons / bullets
    var pm = trimmed.match(PREFIX_REGEX);
    if (pm) {
      var restTrans = t(pm[2]);
      if (restTrans !== pm[2]) {
        return text.replace(trimmed, pm[1] + restTrans);
      }
    }

    // 8. Combination: Prefix + Trailing count or punctuation
    if (pm && pm[2]) {
      var rest = pm[2].trim();
      var restCm = rest.match(COUNT_SUFFIX_REGEX);
      if (restCm && restCm[1]) {
        var baseTrans2 = t(restCm[1]);
        if (baseTrans2 !== restCm[1]) {
          return text.replace(trimmed, pm[1] + baseTrans2 + ' ' + restCm[2]);
        }
      }
      var restTm = rest.match(TRAIL_REGEX);
      if (restTm && restTm[1]) {
        var baseTrans3 = t(restTm[1]);
        if (baseTrans3 !== restTm[1]) {
          return text.replace(trimmed, pm[1] + baseTrans3 + restTm[2]);
        }
      }
    }

    return fallback !== undefined ? fallback : text;
  }

  // ===========================================================================
  // DOM TRANSLATION ENGINE (High Performance & Reversible)
  // ===========================================================================
  var isMutating = false;

  function translateTextNode(node) {
    if (!node || node.nodeType !== 3) return;
    var val = node.nodeValue;
    if (!val || !val.trim()) return;

    if (currentLang === 'en') {
      if (node._origText === undefined) {
        node._origText = val;
      }
      var translated = t(node._origText);
      if (translated !== val) {
        node.nodeValue = translated;
      }
    } else {
      if (node._origText !== undefined && node.nodeValue !== node._origText) {
        node.nodeValue = node._origText;
      }
    }
  }

  function translateElementAttributes(el) {
    if (!el || el.nodeType !== 1) return;
    var tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style') return;

    // Attributes to translate
    var attrs = ['placeholder', 'title', 'aria-label', 'label'];
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      if (el.hasAttribute(attr)) {
        var origAttrKey = 'data-i18n-orig-' + attr;
        if (currentLang === 'en') {
          if (!el.hasAttribute(origAttrKey)) {
            el.setAttribute(origAttrKey, el.getAttribute(attr));
          }
          var origVal = el.getAttribute(origAttrKey);
          var transVal = t(origVal);
          if (transVal !== el.getAttribute(attr)) {
            el.setAttribute(attr, transVal);
          }
        } else {
          if (el.hasAttribute(origAttrKey)) {
            el.setAttribute(attr, el.getAttribute(origAttrKey));
          }
        }
      }
    }

    // Button input value
    if (tag === 'input' && (el.type === 'button' || el.type === 'submit' || el.type === 'reset')) {
      if (currentLang === 'en') {
        if (!el.hasAttribute('data-i18n-orig-val')) {
          el.setAttribute('data-i18n-orig-val', el.value);
        }
        var origV = el.getAttribute('data-i18n-orig-val');
        el.value = t(origV);
      } else {
        if (el.hasAttribute('data-i18n-orig-val')) {
          el.value = el.getAttribute('data-i18n-orig-val');
        }
      }
    }
  }

  function walkAndTranslate(rootNode) {
    if (!rootNode) return;
    var node = rootNode;
    var tag = node.tagName ? node.tagName.toLowerCase() : '';
    if (tag === 'script' || tag === 'style') return;

    if (node.nodeType === 3) {
      translateTextNode(node);
      return;
    }

    if (node.nodeType === 1) {
      translateElementAttributes(node);
      var child = node.firstChild;
      while (child) {
        walkAndTranslate(child);
        child = child.nextSibling;
      }
    }
  }

  function translateDOM(target) {
    isMutating = true;
    try {
      walkAndTranslate(target || document.body);
    } finally {
      isMutating = false;
    }
  }

  // MutationObserver to automatically translate newly injected components/modals
  var domObserver = null;
  var scheduled = false;

  function scheduleBatchTranslate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      if (currentLang === 'en') {
        translateDOM(document.body);
      }
    });
  }

  function startObserver() {
    if (typeof MutationObserver === 'undefined') return;
    if (domObserver) domObserver.disconnect();

    domObserver = new MutationObserver(function (mutations) {
      if (isMutating || currentLang !== 'en') return;
      var hasMeaningfulChange = false;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList' && (m.addedNodes.length > 0)) {
          hasMeaningfulChange = true;
          break;
        } else if (m.type === 'characterData') {
          hasMeaningfulChange = true;
          break;
        }
      }
      if (hasMeaningfulChange) {
        scheduleBatchTranslate();
      }
    });

    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // Intercept app alert dialogs & toasts so popup messages translate dynamically
  function patchAppDialogs() {
    if (window.showToast && !window.showToast._i18nPatched) {
      var origShowToast = window.showToast;
      window.showToast = function (msg, isErr, forceToast) {
        if (currentLang === 'en' && typeof msg === 'string') {
          msg = t(msg);
        }
        return origShowToast(msg, isErr, forceToast);
      };
      window.showToast._i18nPatched = true;
    }

    if (window.showConfirmDialog && !window.showConfirmDialog._i18nPatched) {
      var origConfirm = window.showConfirmDialog;
      window.showConfirmDialog = function (title, msg, onConfirm, isDanger) {
        if (currentLang === 'en') {
          if (typeof title === 'string') title = t(title);
          if (typeof msg === 'string') msg = t(msg);
        }
        return origConfirm(title, msg, onConfirm, isDanger);
      };
      window.showConfirmDialog._i18nPatched = true;
    }

    if (window.showAlertDialog && !window.showAlertDialog._i18nPatched) {
      var origAlert = window.showAlertDialog;
      window.showAlertDialog = function (titleOrOpts, message, type, onClose) {
        if (currentLang === 'en') {
          if (typeof titleOrOpts === 'object' && titleOrOpts !== null) {
            if (typeof titleOrOpts.title === 'string') titleOrOpts.title = t(titleOrOpts.title);
            if (typeof titleOrOpts.message === 'string') titleOrOpts.message = t(titleOrOpts.message);
          } else {
            if (typeof titleOrOpts === 'string') titleOrOpts = t(titleOrOpts);
            if (typeof message === 'string') message = t(message);
          }
        }
        return origAlert(titleOrOpts, message, type, onClose);
      };
      window.showAlertDialog._i18nPatched = true;
    }
  }

  // ===========================================================================
  // UI SWITCHER CONTROLS
  // ===========================================================================
  function updateSwitcherUI() {
    document.documentElement.lang = currentLang;

    // Update all .lang-btn elements
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      var lang = btn.getAttribute('data-lang');
      if (lang === currentLang) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });

    // Update topbar flag & code if single button format
    var flagEl = document.getElementById('lang-current-flag');
    var codeEl = document.getElementById('lang-current-code');
    if (flagEl) flagEl.textContent = currentLang === 'en' ? '🇬🇧' : '🇮🇩';
    if (codeEl) codeEl.textContent = currentLang.toUpperCase();
  }

  function setLanguage(lang, silent) {
    if (lang !== 'en' && lang !== 'id') return;
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) { }

    updateSwitcherUI();
    translateDOM(document.body);
    patchAppDialogs();

    // If router is available, trigger current view refresh so dynamic calculations & titles adapt
    if (typeof window.router === 'function') {
      try {
        window.router(false);
      } catch (e) {
        console.warn('i18n router refresh warning:', e);
      }
    }

    if (!silent && typeof window.showToast === 'function') {
      var msg = currentLang === 'en'
        ? 'Language switched to English'
        : 'Bahasa dialihkan ke Bahasa Indonesia';
      window.showToast(msg, false, true);
    }
  }

  function toggleLanguage() {
    setLanguage(currentLang === 'en' ? 'id' : 'en');
  }

  function getLanguage() {
    return currentLang;
  }

  // ===========================================================================
  // INITIALIZATION ON DOM READY
  // ===========================================================================
  function init() {
    updateSwitcherUI();
    patchAppDialogs();
    if (currentLang === 'en') {
      translateDOM(document.body);
    }
    startObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also hook dialogs after window load in case app.js initialized later
  window.addEventListener('load', function () {
    patchAppDialogs();
    if (currentLang === 'en') {
      translateDOM(document.body);
    }
  });

  // ===========================================================================
  // EXPOSE GLOBAL API
  // ===========================================================================
  window.i18n = {
    t: t,
    getLanguage: getLanguage,
    setLanguage: setLanguage,
    toggleLanguage: toggleLanguage,
    translateDOM: translateDOM,
    numberToWords: numberToWordsEn,
    dictionary: DICTIONARY
  };

  // Shortcut global helper t()
  window.t = t;

})(window);
