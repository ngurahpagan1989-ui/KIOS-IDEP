/**
 * =============================================================================
 * KIOS IDEP POS - Multi-Language (i18n) Engine & Translation Dictionary
 * Version: 1.0.0
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
    // --- Navigation & Brand ---
    'Kios IDEP': 'IDEP Kiosk',
    'Kios IDEP POS': 'IDEP Kiosk POS',
    'Kios IDEP POS & Manajemen Stok': 'IDEP Kiosk POS & Stock Management',
    'Sistem Kasir & Inventaris Benih Terpadu': 'Integrated Cashier & Seed Inventory System',
    'Smart Seed & Eco POS': 'Smart Seed & Eco POS',
    'Kasir & Gudang Terhubung': 'Cashier & Warehouse Connected',
    'OPERASIONAL UTAMA': 'MAIN OPERATIONS',
    'PENGADAAN & MITRA': 'PROCUREMENT & PARTNERS',
    'FINANSIAL & KLIEN': 'FINANCE & CLIENTS',
    'Dashboard': 'Dashboard',
    'Dashboard Ringkasan': 'Dashboard Overview',
    'Ringkasan Operasional': 'Operational Overview',
    'Kasir': 'Cashier',
    'Kasir (POS)': 'Cashier (POS)',
    'Utama': 'Main',
    'Katalog Produk': 'Product Catalog',
    'Stok & Batch FIFO': 'Stock & FIFO Batches',
    'Stok & Antrean FIFO': 'Stock & FIFO Queue',
    'Kemas Mandiri': 'Repackaging',
    'Kemas Mandiri & Produksi': 'Repackaging & Production',
    'Quality Control (QC)': 'Quality Control (QC)',
    'Pembelian Stok': 'Stock Purchases',
    'Pembelian & Pengadaan': 'Purchases & Procurement',
    'Konsinyasi Mitra': 'Partner Consignment',
    'Konsinyasi Toko Mitra': 'Partner Store Consignment',
    'Piutang & Tempo': 'Accounts Receivable & Credit',
    'Piutang & Pembayaran Tempo': 'Receivables & Credit Payments',
    'Pengeluaran & Biaya': 'Expenses & Costs',
    'Pengeluaran & Biaya Operasional': 'Expenses & Operational Costs',
    'Pelanggan (CRM)': 'Customers (CRM)',
    'Purna Jual & Kepuasan': 'After-Sales & Satisfaction',
    'Purna Jual & Kepuasan Pelanggan': 'After-Sales & Customer Satisfaction',
    'Riwayat & Faktur': 'History & Invoices',
    'Riwayat Transaksi & Faktur': 'Transaction History & Invoices',
    'Laporan & Valuasi Stok': 'Reports & Stock Valuation',
    'Laporan Penjualan & Margin': 'Sales Reports & Margin',
    'Pengaturan Toko': 'Store Settings',
    'Pengaturan Sistem': 'System Settings',
    'Install Aplikasi di HP': 'Install App on Phone',
    'Buka Kasir': 'Open Cashier',
    'Muat Ulang Data': 'Refresh Data',
    'Keluar dari Aplikasi': 'Sign Out from App',
    'Keluar': 'Sign Out',
    'Admin Utama': 'Main Admin',
    'Online': 'Online',
    'Offline': 'Offline',

    // --- Login Screen ---
    'Masuk ke Sistem': 'Sign In to System',
    'Username': 'Username',
    'Password': 'Password',
    'Masukkan username': 'Enter username',
    'Masukkan password': 'Enter password',
    'Lihat password': 'Show password',
    'Sembunyikan password': 'Hide password',
    'Minimal 6 karakter': 'Minimum 6 characters',
    'Gagal login: Username atau password salah.': 'Login failed: Incorrect username or password.',
    'Mode Pantau Aktif:': 'View-Only Mode Active:',
    'Hak akses baca / view-only. Tombol input, aksi tambah, ubah, dan hapus dinonaktifkan.': 'Read-only access. Create, edit, and delete buttons are disabled.',

    // --- Common Actions & Buttons ---
    '+ Tambah Produk': '+ Add Product',
    '+ Tambah Transaksi': '+ Add Transaction',
    '+ Input Pembelian': '+ New Purchase',
    '+ Titip Konsinyasi': '+ New Consignment',
    '+ Catat Pengeluaran': '+ Record Expense',
    '+ Tambah Pelanggan': '+ Add Customer',
    '+ Rekam Klaim Kebun': '+ New Garden Claim',
    '+ Tambah Akun Pengguna': '+ Add User Account',
    '+ Tambah Peran Baru': '+ Add New Role',
    '+ Buat Batch Baru': '+ Create New Batch',
    '+ Member Lengkap': '+ Full Member Details',
    'Tambah': 'Add',
    'Simpan': 'Save',
    'Simpan Data': 'Save Data',
    'Simpan Perubahan': 'Save Changes',
    'Simpan Catatan QC': 'Save QC Record',
    'Simpan Pengguna': 'Save User',
    'Tambahkan Peran': 'Add Role',
    'Batal': 'Cancel',
    'Tutup': 'Close',
    'Tutup Dialog': 'Close Dialog',
    'Tutup Menu': 'Close Menu',
    'Mengerti': 'Understood',
    'Lanjutkan': 'Proceed',
    'Hapus': 'Delete',
    'Edit': 'Edit',
    'Ubah': 'Edit',
    'Lihat': 'View',
    'Detail': 'Details',
    'Cetak': 'Print',
    'Cetak Nota': 'Print Receipt',
    'Cetak Faktur': 'Print Invoice',
    'Cetak Surat Jalan': 'Print Delivery Order',
    'Unduh': 'Download',
    'Ekspor': 'Export',
    'Ekspor CSV': 'Export CSV',
    'Ekspor Excel / CSV': 'Export Excel / CSV',
    'Filter': 'Filter',
    'Pilih': 'Select',
    'Konfirmasi': 'Confirm',
    'Konfirmasi Aksi': 'Confirm Action',
    'Pemberitahuan': 'Notice',
    'Terjadi Kesalahan': 'An Error Occurred',
    'Berhasil': 'Success',
    'Semua': 'All',
    'Semua Kategori': 'All Categories',
    'Semua Status': 'All Statuses',
    'Aksi': 'Action',
    'Status': 'Status',
    'Tanggal': 'Date',
    'Keterangan': 'Description',
    'Catatan': 'Notes',
    'Total': 'Total',
    'Subtotal': 'Subtotal',
    'Diskon': 'Discount',
    'Pajak': 'Tax',
    'Selesai': 'Completed',
    'Kembali': 'Back',

    // --- Search & Placeholders ---
    'Cari nota, produk, atau pelanggan...': 'Search receipt, product, or customer...',
    'Cari produk kemasan...': 'Search packaged product...',
    'Cari nama atau barcode...': 'Search name or barcode...',
    'Cari nama atau kode batch...': 'Search name or batch code...',
    'Cari produk, batch, atau outlet...': 'Search product, batch, or outlet...',
    'Cari mitra konsinyasi...': 'Search consignment partner...',
    'Cari pelanggan CRM...': 'Search CRM customer...',
    'Cari nomor faktur / pelanggan...': 'Search invoice no / customer...',
    'Bersihkan pencarian': 'Clear search',
    'Ketik RESET di sini...': 'Type RESET here...',

    // --- Dashboard ---
    'Pantau performa penjualan hari ini dan alert stok kritis secara real-time.': 'Monitor today\'s sales performance and critical stock alerts in real-time.',
    'Penjualan Hari Ini': 'Today\'s Sales',
    'Omzet kotor transaksi hari ini': 'Gross revenue from today\'s transactions',
    'Transaksi Hari Ini': 'Today\'s Transactions',
    'Struk belanja terselesaikan': 'Completed sales receipts',
    'Piutang Aktif': 'Active Receivables',
    'Tagihan tempo berjalan': 'Outstanding credit invoices',
    'Stok Menipis (≤ 5 pcs/gr)': 'Low Stock (≤ 5 pcs/gr)',
    'Semua persediaan stok dalam batas aman.': 'All stock inventory levels are within safe limits.',
    'Mendekati Kadaluarsa (30 Hari)': 'Near Expiration (30 Days)',
    'Tidak ada stok mendekati kadaluarsa.': 'No stock items near expiration.',

    // --- Product Catalog ---
    'Kelola master data barang siap jual, bahan baku curah, media dan varian bahasa.': 'Manage master data for ready-to-sell goods, bulk materials, media, and language variants.',
    '📦 Siap Jual': '📦 Packaged / Retail',
    '🌾 Curah/Gram': '🌾 Bulk / Raw',
    '📚 Media/Buku': '📚 Books / Media',
    'Nama Produk': 'Product Name',
    'Kategori': 'Category',
    'Tipe': 'Type',
    'Tipe Barang': 'Item Type',
    'Sisa Stok': 'Remaining Stock',
    'Harga Jual (Tier)': 'Selling Price (Tier)',
    'Harga Jual': 'Selling Price',
    'Harga Modal': 'Cost Price',
    'Satuan': 'Unit',
    'Satuan (Unit)': 'Unit of Measure',
    'Varian Bahasa:': 'Language Variant:',
    'Jenis / Klasifikasi Produk': 'Product Classification',
    'Memerlukan alur QC & Uji Semai': 'Requires QC & Germination Test',
    'Bebas QC (Langsung Aktif)': 'QC-Free (Directly Active)',
    '🌱 Benih (Memerlukan QC & Uji Semai)': '🌱 Seed (Requires QC & Germination Test)',
    '📚 Buku & Publikasi (Bebas QC)': '📚 Books & Publications (QC-Free)',
    '🪴 Media Tanam & Kompos (Bebas QC)': '🪴 Growing Media & Compost (QC-Free)',
    '🌾 Pangan & Beras Merah (Bebas QC)': '🌾 Food & Brown Rice (QC-Free)',
    '🌿 Bibit Tanaman Hidup (Bebas QC)': '🌿 Live Seedlings (QC-Free)',
    '👕 Merchandise & Kaos (Bebas QC)': '👕 Merchandise & Shirts (QC-Free)',
    '📦 Lainnya / Non-Benih (Bebas QC)': '📦 Other / Non-Seed (QC-Free)',
    'Kemasan Siap Jual': 'Packaged Ready to Sell',
    'Bahan Baku Curah': 'Bulk Raw Material',
    'Kode Barcode / SKU': 'Barcode / SKU Code',
    'Ambang Stok Minimum': 'Minimum Stock Threshold',

    // --- POS / Cashier ---
    'Keranjang Penjualan': 'Sales Cart',
    'Keranjang masih kosong.': 'Cart is empty.',
    'Klik produk untuk menambahkan.': 'Click product to add.',
    'Kosongkan': 'Clear',
    'NAMA PELANGGAN / NOTA ATAS NAMA:': 'CUSTOMER NAME / INVOICE TO:',
    'Ketik nama pelanggan (misal: Pak Ketut / Subak)...': 'Type customer name (e.g. Pak Ketut / Subak)...',
    'Simpan ke Database Member CRM': 'Save to Member CRM Database',
    'Nomor WhatsApp (misal: 08123456789)': 'WhatsApp Number (e.g. 08123456789)',
    'PILIHAN KEDALUWARSA / BATCH:': 'EXPIRY / BATCH SELECTION:',
    '⚡ Otomatis FEFO': '⚡ Automatic FEFO',
    'Antrean Terdekat': 'Earliest Queue',
    'Tanpa Exp': 'No Expiry',
    'Harga:': 'Price:',
    'Koreksi Nota': 'Invoice Correction',
    'Batal Koreksi': 'Cancel Correction',
    'TOTAL TAGIHAN': 'TOTAL BILL AMOUNT',
    '⚡ Bayar Transaksi': '⚡ Pay Transaction',
    'Simpan Koreksi': 'Save Correction',
    'Metode Pembayaran': 'Payment Method',
    'Tunai': 'Cash',
    'Transfer Bank': 'Bank Transfer',
    'Tempo / Piutang': 'Credit / Receivable',
    'Uang Diterima': 'Cash Received',
    'Kembalian': 'Change',
    'Uang Pas': 'Exact Cash',
    'Jatuh Tempo Pembayaran': 'Payment Due Date',
    'Catatan Transaksi': 'Transaction Notes',
    'Selesaikan Pembayaran': 'Complete Payment',
    '📜 Riwayat Transaksi': '📜 Transaction History',

    // --- Thermal Receipt & Invoices ---
    'NOTA PENJUALAN': 'SALES RECEIPT',
    'FAKTUR PENJUALAN': 'SALES INVOICE',
    'INVOICE MINIMALIS': 'MINIMALIST INVOICE',
    'No. Nota:': 'Receipt No:',
    'No. Faktur:': 'Invoice No:',
    'Tanggal:': 'Date:',
    'Tanggal Faktur:': 'Invoice Date:',
    'Pelanggan:': 'Customer:',
    'Metode:': 'Method:',
    'Jatuh Tempo:': 'Due Date:',
    'DITAGIHKAN KEPADA:': 'BILLED TO:',
    'METODE & KANAL:': 'METHOD & CHANNEL:',
    'Item Benih & Batch': 'Seed Item & Batch',
    'Kuantitas': 'Quantity',
    'Harga Satuan': 'Unit Price',
    'Total Harga': 'Total Price',
    'Terbilang:': 'In Words:',
    'Sisa Piutang:': 'Remaining Balance:',
    'Tanda Tangan Penerima': 'Recipient Signature',
    'Hormat Kami,': 'Sincerely,',
    'Pusat Benih Tanaman Lokal & Edukasi Permakultur': 'Local Plant Seed Center & Permaculture Education',
    'Terima kasih atas kunjungan Anda. Salam Lestari!': 'Thank you for your visit. Best regards!',
    'Simpan struk ini sebagai bukti transaksi benih resmi.': 'Keep this receipt as official seed transaction proof.',
    '*** TRANSAKSI DIBATALKAN (VOID) ***': '*** TRANSACTION VOIDED ***',
    'DIBATALKAN (VOID)': 'VOIDED',
    'LUNAS': 'PAID',
    'TEMPO': 'CREDIT',
    'CICILAN / TEMPO': 'INSTALLMENT / CREDIT',
    'Lunas Langsung': 'Paid in Full',
    'Umum': 'General Customer',

    // --- Stock & Batches ---
    'Kelola toples benih, batch FIFO/FEFO, mutasi stok, dan audit opname fisik.': 'Manage seed jars, FIFO/FEFO batches, stock mutations, and physical inventory audits.',
    'Toples / Batch Aktif': 'Active Jars / Batches',
    'Riwayat Mutasi Stok': 'Stock Mutation History',
    'Audit Opname Fisik': 'Physical Stock Audit',
    'Kode Batch': 'Batch Code',
    'Tanggal Masuk': 'Entry Date',
    'Tanggal Kadaluarsa': 'Expiration Date',
    'Sisa Kuantitas': 'Remaining Quantity',
    'Biaya Pokok (HPP)': 'Unit Cost (COGS)',
    'Nilai Valuasi': 'Valuation Value',
    'Asal Batch / Supplier': 'Batch Source / Supplier',
    'Toples Simpan': 'Storage Jar',
    'Mutasi Masuk': 'Incoming Stock',
    'Mutasi Keluar': 'Outgoing Stock',
    'Penyesuaian Opname': 'Stocktake Adjustment',
    'Semua Mutasi': 'All Mutations',

    // --- Kemas Mandiri (Repackaging) ---
    'Konversi benih curah mentah menjadi sachet siap jual dengan pelacakan HPP akurat.': 'Convert bulk raw seeds into retail-ready packets with accurate COGS tracking.',
    'Form Kemas Mandiri': 'Repackaging Form',
    'Riwayat Kemas Benih': 'Repackaging History',
    'Pilih Bahan Baku Curah': 'Select Bulk Raw Material',
    'Pilih Toples / Batch Curah': 'Select Bulk Jar / Batch',
    'Berat Curah yang Digunakan (Gram)': 'Bulk Weight Used (Grams)',
    'Pilihan Jenis Kemasan': 'Packaging Type Selection',
    'Jumlah Sachet Dihasilkan': 'Packets Produced (Qty)',
    'Berat Isi per Sachet (Gram)': 'Net Weight per Packet (Grams)',
    'Susut / Rendemen (%)': 'Loss / Waste (%)',
    'Total Biaya Kemasan': 'Total Packaging Cost',
    'HPP Modal per Sachet': 'COGS per Packet',
    'Proses & Simpan Kemasan': 'Process & Save Packets',

    // --- Quality Control (QC) ---
    'Standardisasi mutu benih, uji daya tumbuh duplo 100 butir, dan pengeringan DHT 24 jam.': 'Seed quality standards, 100-seed duplo germination tests, and 24-hr DHT oven curing.',
    'Antrean Uji QC': 'QC Testing Queue',
    'Riwayat Hasil QC': 'QC Results History',
    'Log Oven DHT 24 Jam': '24-Hour DHT Oven Log',
    'Input Uji QC & Dokumentasi Foto': 'QC Test Entry & Photo Documentation',
    'Standardisasi Daya Tumbuh Duplo 100 Butir (Ambang Minimal IDEP 80%)': '100-Seed Duplo Germination Standardization (IDEP Min. 80%)',
    'Kode Batch Toples Benih': 'Seed Jar Batch Code',
    '-- Pilih Batch Antrean QC --': '-- Select QC Queue Batch --',
    'Tahapan Pengujian': 'Testing Stage',
    '1. Uji Lapangan Petani': '1. Farmer Field Test',
    '2. Uji Semai Kantor (Pre-DHT)': '2. Office Germination Test (Pre-DHT)',
    '3. Log DHT 1 Hari': '3. 1-Day DHT Oven Log',
    '4. Uji Semai Pasca-DHT': '4. Post-DHT Germination Test',
    '5. Uji Berkala / Semai Ulang (Toples Simpan > 6 Bulan)': '5. Periodic / Retest (> 6 Months Storage)',
    'Tahap 4 adalah penentu kelulusan batch untuk membuka kunci kasir & kemas mandiri.': 'Stage 4 determines batch passing to unlock cashier & repackaging.',
    'Identitas Batch Terpilih (Otomatis dari Pengadaan Tanpa Dobel Ketik)': 'Selected Batch Details (Auto-filled from procurement)',
    'Varietas Benih': 'Seed Variety',
    'Petani Mitra': 'Partner Farmer',
    'Tanggal Masuk Toko': 'Store Entry Date',
    'Berat Curah / Sisa Stok': 'Bulk Weight / Remaining Stock',
    'Parameter Oven Dry Heat Treatment (DHT) 24 Jam': '24-Hour Dry Heat Treatment (DHT) Oven Parameters',
    'Durasi Tetap: 24 Jam': 'Fixed Duration: 24 Hours',
    'Pilihan Unit Oven': 'Oven Unit Selection',
    'Suhu Target (°C)': 'Target Temperature (°C)',
    'Jam Masuk Oven': 'Oven Entry Time',
    'Jam Selesai Oven': 'Oven Completion Time',
    'Sisa Waktu Oven': 'Remaining Oven Time',
    'Pengamatan Baki Semai Duplo (100 Butir)': 'Duplo Germination Tray Observation (100 Seeds)',
    'Baki A (Jumlah Tumbuh 0-50)': 'Tray A (Germinated 0-50)',
    'Baki B (Jumlah Tumbuh 0-50)': 'Tray B (Germinated 0-50)',
    'Total Daya Tumbuh:': 'Total Germination Rate:',
    'Daya Tumbuh: 0% (Standar IDEP: Min 80%)': 'Germination Rate: 0% (IDEP Standard: Min 80%)',
    'BELUM MEMENUHI': 'NOT MET',
    'LULUS STANDAR': 'PASSED STANDARD',
    'Dokumentasi Foto Baki On-Site': 'On-Site Tray Photo Documentation',
    'Buka Kamera & Jepret Baki Semai': 'Open Camera & Snap Seed Tray',
    'Kompresi otomatis client-side (~150-300 KB) untuk upload kilat.': 'Automatic client-side compression (~150-300 KB) for fast upload.',
    'Hapus Foto': 'Delete Photo',
    'Catatan / Kondisi Media Semai & Suhu': 'Notes / Seed Media Condition & Temperature',
    'Mulai Proses Oven': 'Start Oven Process',
    'Dokumentasi Foto Baki Benih': 'Seed Tray Photo Documentation',
    'Bukti Keaslian & Uji Semai On-Site': 'On-Site Seed Trial & Authenticity Proof',
    'Buka di Google Drive': 'Open in Google Drive',

    // --- Purchases / Procurement ---
    'Kelola pengadaan benih mentah dari petani lokal dan barang dari supplier resmi.': 'Manage raw seed procurement from local farmers and goods from authorized suppliers.',
    'Faktur Pembelian': 'Purchase Invoices',
    'Daftar Petani Mitra': 'Partner Farmers Directory',
    'Daftar Supplier': 'Suppliers Directory',
    'Nama Petani / Supplier': 'Farmer / Supplier Name',
    'Nomor Kontak / WhatsApp': 'Contact / WhatsApp Number',
    'Alamat / Lokasi Kebun': 'Address / Farm Location',
    'Total Pembelian': 'Total Purchases',
    'Metode Bayar': 'Payment Method',
    'Status Pembayaran': 'Payment Status',

    // --- Consignment ---
    'Kelola toko mitra konsinyasi, surat jalan titip barang, dan audit fisik opname.': 'Manage partner consignment stores, delivery orders, and physical stock audits.',
    'Daftar Toko Mitra': 'Partner Stores Directory',
    'Surat Jalan Konsinyasi': 'Consignment Delivery Orders',
    'Audit & Rekonsiliasi': 'Audit & Reconciliation',
    'Serah Terima Barang Konsinyasi': 'Consignment Goods Handover',
    'Berita Acara Serah Terima Fisik Benih di Lokasi Toko Mitra': 'Official Physical Seed Handover Report at Partner Store',
    'Berita Acara & Bukti Serah Terima': 'Official Report & Proof of Delivery',
    'Tanda Tangan Toko Mitra (Penerima)': 'Partner Store Signature (Receiver)',
    'Tanda Tangan Pengirim (IDEP)': 'Courier / Sender Signature (IDEP)',
    'Nama Penerima': 'Receiver Name',
    'Jabatan / Peran': 'Job Title / Role',
    'Bagi Hasil / Komisi (%)': 'Revenue Share / Commission (%)',
    'Titip Baru': 'New Stock Delivery',
    'Terjual': 'Sold',
    'Retur': 'Returned',
    'Sisa di Toko': 'Remaining at Store',
    'Tagihan Konsinyasi': 'Consignment Billing',

    // --- Receivables & Credit ---
    'Pantau tagihan jatuh tempo pelanggan, riwayat angsuran, dan status pelunasan nota tempo.': 'Monitor customer due invoices, installment history, and credit settlement statuses.',
    'Total Piutang Berjalan': 'Total Outstanding Receivables',
    'Piutang Jatuh Tempo': 'Overdue Receivables',
    'Lunas Bulan Ini': 'Paid Off This Month',
    'Nama Pelanggan': 'Customer Name',
    'Sisa Tagihan': 'Remaining Balance',
    'Jatuh Tempo': 'Due Date',
    'Catat Pembayaran Cicilan': 'Record Payment Installment',
    'Bayar Piutang': 'Pay Receivable',
    'Jumlah Bayar': 'Payment Amount',

    // --- Expenses & Costs ---
    'Catat seluruh beban operasional harian, biaya listrik, logistik, dan perawatan toples.': 'Record all daily operational expenses, utilities, logistics, and jar maintenance costs.',
    'Total Pengeluaran Bulan Ini': 'Total Expenses This Month',
    'Kategori Pengeluaran': 'Expense Category',
    'Jumlah Biaya': 'Cost Amount',
    'Penerima Pembayaran': 'Paid To',
    'Bukti / Kuitansi': 'Proof / Receipt',

    // --- CRM & Customers ---
    'Direktori pelanggan loyal, riwayat pembelian benih, dan preferensi tanaman kebun.': 'Loyal customer directory, seed purchase history, and garden plant preferences.',
    'Total Pelanggan Terdaftar': 'Total Registered Customers',
    'Pelanggan Aktif': 'Active Customers',
    'Kategori Member': 'Member Tier',
    'Reguler': 'Regular',
    'Outlet': 'Outlet Partner',
    'Bali Buda': 'Bali Buda Partner',
    'Total Belanja': 'Total Spending',
    'Kunjungan Terakhir': 'Last Visit',

    // --- After-Sales (Purna Jual) ---
    'Pelayanan keluhan daya tumbuh benih di lahan, klaim garansi, dan konsultasi kebun.': 'Field seed germination complaints, warranty claims, and garden consultation service.',
    'Total Klaim Kebun': 'Total Garden Claims',
    'Menunggu Verifikasi': 'Pending Verification',
    'Penggantian Benih': 'Seed Replacement',
    'Solusi Diberikan': 'Resolution Provided',
    'Varietas Diklaim': 'Claimed Variety',
    'Gejala di Lahan': 'Field Symptoms',

    // --- History & Invoices ---
    'Pencarian dan cetak ulang struk kasir, faktur formal pajak, dan audit transaksi.': 'Search and reprint cashier receipts, formal invoices, and audit past transactions.',
    'Rentang Tanggal': 'Date Range',
    'Semua Kasir': 'All Cashiers',
    'Cetak Ulang Nota Termal': 'Reprint Thermal Receipt',
    'Cetak Ulang Faktur Formal': 'Reprint Formal Invoice',
    'Batalkan Transaksi (VOID)': 'Void Transaction',

    // --- Reports & Stock Valuation ---
    'Analisis performa omzet penjualan, estimasi margin kotor, dan valuasi nilai aset benih FIFO.': 'Analyze sales turnover, gross margin estimates, and FIFO seed asset valuations.',
    'Total Penjualan': 'Total Sales',
    'Estimasi Laba Kotor': 'Estimated Gross Profit',
    'Total Nilai Valuasi Benih': 'Total Seed Valuation Value',
    'Kanal Penjualan': 'Sales Channels',
    'Produk Terlaris': 'Best Selling Products',
    'Bulan Ini': 'This Month',
    'Hari Ini': 'Today',
    'Tahun Ini': 'This Year',
    'Kustom': 'Custom Range',

    // --- Settings ---
    'Konfigurasi profil toko, tarif pajak, format batch & preset multi-tier, hak akses peran, akun pengguna, dan integrasi Bot Telegram.': 'Configure store profile, tax rates, batch format & multi-tier presets, role permissions, users, and Telegram Bot.',
    '🏪 Profil Toko & Pajak': '🏪 Store Profile & Tax',
    '🏷️ Format Batch & Multi-Tier': '🏷️ Batch Format & Multi-Tier',
    '🔐 Hak Akses & Peran': '🔐 Permissions & Roles',
    '👥 Akun Pengguna': '👥 User Accounts',
    '🤖 Bot Telegram': '🤖 Telegram Bot',
    '🌐 Bahasa / Language': '🌐 Language / Bahasa',
    'Profil Toko & Pajak': 'Store Profile & Tax',
    'Nama Toko / Kios': 'Store / Kiosk Name',
    'Slogan / Tagline Toko': 'Store Slogan / Tagline',
    'Nomor WhatsApp Toko': 'Store WhatsApp Number',
    'Email Toko': 'Store Email',
    'Alamat Fisik Toko': 'Store Physical Address',
    'Tarif Pajak Penjualan (PPN %)': 'Sales Tax Rate (VAT %)',
    'Catatan Kaki Struk Kasir': 'Cashier Receipt Footer Note',
    'Logo Toko (Format Gambar)': 'Store Logo (Image Format)',
    'Format Penomoran Batch': 'Batch Numbering Format',
    'Daftar Peran Pengguna': 'User Roles List',
    'Tambah Akun Pengguna': 'Add User Account',
    'Tambah Peran Hak Akses Baru': 'Add New Role Permission',
    'Nama Peran Baru': 'New Role Name',
    'Nama Lengkap': 'Full Name',
    'Peran / Hak Akses': 'Role / Permission',
    'Token Bot Telegram': 'Telegram Bot Token',
    'Chat ID Telegram': 'Telegram Chat ID',
    'Uji Notifikasi Telegram': 'Test Telegram Notification',

    // --- Danger Zone / Reset Data ---
    'Zona Bahaya: Reset Data': 'Danger Zone: Reset Data',
    'Pembersihan Khusus Riwayat Transaksi Uji Coba': 'Test Transaction History Cleanup',
    'Pilih modul riwayat simulasi yang ingin Anda kosongkan. Data master (produk, batch stok, outlet, kemasan, user, dan pengaturan toko) tidak akan terhapus:': 'Select simulation history modules to clear. Master data (products, batches, outlets, packaging, users, and store settings) will not be deleted:',
    'Riwayat Transaksi Kasir & Detail Item': 'Cashier Transaction History & Item Details',
    'Mutasi Konsinyasi & Laporan Audit Opname': 'Consignment Stock Transfers & Stocktake Audits',
    'Rekam Medis Kebun & Klaim Purna Jual': 'Garden Medical Records & After-Sales Claims',
    'Tindakan ini tidak dapat dibatalkan. Ketik kata RESET di bawah ini untuk melanjutkan:': 'This action cannot be undone. Type the word RESET below to proceed:',
    'Hapus Permanen Data Terpilih': 'Permanently Delete Selected Data',
    'Ketik RESET dengan benar untuk mengaktifkan': 'Type RESET correctly to enable',

    // --- Status Badges ---
    'Lunas': 'Paid',
    'Belum Lunas': 'Unpaid',
    'Terlambat': 'Overdue',
    'Selesai': 'Completed',
    'Menunggu': 'Pending',
    'Diproses': 'Processing',
    'Aktif': 'Active',
    'Nonaktif': 'Inactive',
    'Terkirim': 'Dispatched',
    'Diterima': 'Received',
    'Diserahkan': 'Handed Over',
    'Lulus QC': 'QC Passed',
    'Gagal QC': 'QC Failed',
    'Menunggu QC': 'Awaiting QC',
    'Draft': 'Draft',
    'Simpan': 'Saved',

    // --- Toast / System Messages ---
    'Pemberitahuan berhasil diproses.': 'Notification processed successfully.',
    'Menyinkronkan ke Spreadsheet...': 'Syncing to Spreadsheet...',
    'Menyimpan catatan dan mengunggah foto ke Drive...': 'Saving record and uploading photo to Drive...',
    'Bahasa berhasil diubah ke Bahasa Inggris.': 'Language successfully changed to English.',
    'Bahasa berhasil diubah ke Bahasa Indonesia.': 'Language successfully changed to Bahasa Indonesia.',
    'Data berhasil disimpan!': 'Data saved successfully!',
    'Data berhasil dihapus!': 'Data deleted successfully!',
    'Data berhasil diperbarui!': 'Data updated successfully!',
    'Transaksi berhasil diselesaikan!': 'Transaction completed successfully!',
    'Gagal menyimpan data': 'Failed to save data',
    'Apakah Anda yakin ingin melanjutkan tindakan ini?': 'Are you sure you want to proceed with this action?',
    'Apakah Anda yakin ingin menghapus data ini?': 'Are you sure you want to delete this record?'
  };

  // Pre-compiled regex patterns for dynamic phrases
  var PATTERN_RULES = [
    { regex: /^Sisa\s+(\d+.*)$/i, replace: 'Left: $1' },
    { regex: /^(\d+)\s+Nota$/i, replace: '$1 Receipts' },
    { regex: /^(\d+)\s+Klien$/i, replace: '$1 Clients' },
    { regex: /^(\d+)\s+sachet$/i, replace: '$1 sachets' },
    { regex: /^(\d+)\s+hari lagi$/i, replace: '$1 days left' },
    { regex: /^(\d+)\s+hari terlambat$/i, replace: '$1 days overdue' },
    { regex: /^Daya Tumbuh:\s*(\d+)%/i, replace: 'Germination Rate: $1%' },
    { regex: /^Memuat\s+(.*?)\.\.\.$/i, replace: 'Loading $1...' },
    { regex: /^Cari\s+(.*?)\.\.\.$/i, replace: 'Search $1...' },
    { regex: /^Ketik\s+(.*?)\.\.\.$/i, replace: 'Type $1...' },
    { regex: /^Semua persediaan stok dalam batas aman\.$/i, replace: 'All stock inventory levels are within safe limits.' },
    { regex: /^Tidak ada stok mendekati kadaluarsa\.$/i, replace: 'No stock items near expiration.' }
  ];

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
    var attrs = ['placeholder', 'title', 'aria-label'];
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
        }
      }
      if (hasMeaningfulChange) {
        scheduleBatchTranslate();
      }
    });

    domObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
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
        ? 'Language switched to English (UK/US)'
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
