-- ==============================================================================
-- SEED DATA ALUR KERJA OPERASIONAL KIOS IDEP (SUPABASE SQL EDITOR)
-- ==============================================================================
-- File: seed_dummy_alur_kerja.sql
-- Deskripsi: Script SQL murni untuk menyimulasikan alur kerja operasional lengkap:
--   1. Pembelian Stok / Pengadaan (Procurement) dari Petani/Supplier
--   2. Pengemasan Mandiri (Repacking / Production) dari Curah ke Kemasan Sachet
--   3. Transaksi Penjualan Kasir POS (Transactions & Detail Items)
--
-- Relasi Data:
--   - Menggunakan ID Produk yang terdaftar di seed_dummy_kios_idep.sql:
--     * Benih Bayam Hijau Kemasan: a1000000-0000-4000-8000-000000000001
--     * Benih Bayam Hijau Curah:   a1000000-0000-4000-8000-000000000002
--     * Benih Bayam Merah Kemasan: a1000000-0000-4000-8000-000000000003
--     * Benih Bayam Merah Curah:   a1000000-0000-4000-8000-000000000004
--     * Benih Tomat Buah Kemasan:  a1000000-0000-4000-8000-000000000033
--     * Benih Tomat Buah Curah:    a1000000-0000-4000-8000-000000000034
--     * Buku Panduan Permakultur:  b1000000-0000-4000-8000-000000000001
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- SKENARIO 1: PEMBELIAN STOK (PROCUREMENT) DARI SUPPLIER / PETANI
-- ==============================================================================
-- 1.1 Header Pembelian (Tabel: purchases)
INSERT INTO purchases (
    id,
    invoice_no,
    supplier_name,
    farmer_name,
    total,
    notes,
    created_at,
    updated_at
) VALUES
-- Pembelian 1: Benih Bayam Hijau Curah (2.000 gram @ Rp 250) dari Subak Tabanan (Status: SELESAI)
(
    'd1000000-0000-4000-8000-000000000001',
    'PO-2026-0801',
    'Pak Ketut Sujana (Subak Tabanan)',
    'Pak Ketut Sujana',
    500000.00,
    'Pengadaan bahan baku Benih Bayam Hijau Curah panen Subak Tabanan (Status: SELESAI)',
    '2026-08-01 09:00:00+08',
    '2026-08-01 09:00:00+08'
),
-- Pembelian 2: Benih Tomat Buah Curah (1.500 gram @ Rp 500) dari Petani Payangan (Status: SELESAI)
(
    'd1000000-0000-4000-8000-000000000002',
    'PO-2026-0815',
    'Pak Made Suardana (Mitra IDEP Payangan)',
    'Pak Made Suardana',
    750000.00,
    'Pengadaan Benih Tomat Buah Curah bersertifikasi organik Payangan (Status: SELESAI)',
    '2026-08-15 10:30:00+08',
    '2026-08-15 10:30:00+08'
),
-- Pembelian 3: Buku Panduan Permakultur (50 pcs @ Rp 50.000) dari Percetakan Mitra (Status: PAID)
(
    'd1000000-0000-4000-8000-000000000003',
    'PO-2026-0901',
    'Percetakan Bali Lestari',
    'Yayasan IDEP Selaras Alam',
    2500000.00,
    'Pengadaan cetak ulang Buku Panduan Permakultur Hidup Lestari edisi revisi (Status: PAID)',
    '2026-09-01 11:15:00+08',
    '2026-09-01 11:15:00+08'
)
ON CONFLICT (id) DO UPDATE SET
    invoice_no = EXCLUDED.invoice_no,
    supplier_name = EXCLUDED.supplier_name,
    farmer_name = EXCLUDED.farmer_name,
    total = EXCLUDED.total,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- 1.2 Detail Item Pembelian (Tabel: purchase_items)
INSERT INTO purchase_items (
    id,
    purchase_id,
    product_id,
    batch_no,
    qty,
    buy_price,
    additional_cost,
    cost_per_unit,
    production_date,
    expiry_date
) VALUES
-- Item 1: Benih Bayam Hijau (Curah) - 2.000 gr @ Rp 250
(
    'd1100000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'BATCH-0826-BYMH',
    2000.00,
    250.00,
    0.00,
    250.00,
    '2026-07-25',
    '2028-07-25'
),
-- Item 2: Benih Tomat Buah (Curah) - 1.500 gr @ Rp 500
(
    'd1100000-0000-4000-8000-000000000002',
    'd1000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000034',
    'BATCH-0826-TMBH',
    1500.00,
    500.00,
    0.00,
    500.00,
    '2026-08-10',
    '2028-08-10'
),
-- Item 3: Buku Panduan Permakultur Hidup Lestari - 50 pcs @ Rp 50.000
(
    'd1100000-0000-4000-8000-000000000003',
    'd1000000-0000-4000-8000-000000000003',
    'b1000000-0000-4000-8000-000000000001',
    'BATCH-0926-PANDUAN',
    50.00,
    50000.00,
    0.00,
    50000.00,
    '2026-08-25',
    '2028-12-31'
)
ON CONFLICT (id) DO UPDATE SET
    qty = EXCLUDED.qty,
    buy_price = EXCLUDED.buy_price,
    cost_per_unit = EXCLUDED.cost_per_unit;


-- ==============================================================================
-- SKENARIO 2: PENGEMASAN MANDIRI / REPACKING (CURAH MENJADI KEMASAN SIAP JUAL)
-- ==============================================================================
-- Riwayat Produksi Kemas Mandiri (Tabel: productions)
INSERT INTO productions (
    id,
    source_product_id,
    target_product_id,
    source_batch_id,
    gram_used,
    pcs_produced,
    gram_per_pack,
    hpp_per_piece,
    seed_cost,
    packaging_cost,
    created_at
) VALUES
-- Skema A: 500 gr Bayam Hijau Curah dikemas menjadi 50 pcs Bayam Hijau Kemasan (10 gr/pack)
-- PIC Staf: Agus (Operator QC & Kemas) | Yield: 50 pcs
(
    'e1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000002', -- Sumber: Benih Bayam Hijau (Curah)
    'a1000000-0000-4000-8000-000000000001', -- Target: Benih Bayam Hijau (Kemasan)
    'SB-BEN-BYMH-CURAH-01',                  -- Batch Asal
    500.00,                                 -- Gram Digunakan
    50.00,                                  -- Yield / Pcs Dihasilkan
    10.00,                                  -- Gram per Pack
    7000.00,                                -- HPP Final per Sachet (Rp 7.000)
    125000.00,                              -- Modal Benih: 500 gr * Rp 250 = Rp 125.000
    225000.00,                              -- Biaya Kemasan Foil + Label: 50 * Rp 4.500 = Rp 225.000
    '2026-08-20 13:30:00+08'
),
-- Skema B: 300 gr Tomat Buah Curah dikemas menjadi 30 pcs Tomat Buah Kemasan (10 gr/pack)
-- PIC Staf: Agus (Operator QC & Kemas) | Yield: 30 pcs
(
    'e1000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000034', -- Sumber: Benih Tomat Buah (Curah)
    'a1000000-0000-4000-8000-000000000033', -- Target: Benih Tomat Buah (Kemasan)
    'SB-BEN-TMBH-CURAH-01',                  -- Batch Asal
    300.00,                                 -- Gram Digunakan
    30.00,                                  -- Yield / Pcs Dihasilkan
    10.00,                                  -- Gram per Pack
    8500.00,                                -- HPP Final per Sachet (Rp 8.500)
    150000.00,                              -- Modal Benih: 300 gr * Rp 500 = Rp 150.000
    105000.00,                              -- Biaya Kemasan Foil + Label: 30 * Rp 3.500 = Rp 105.000
    '2026-08-25 14:00:00+08'
),
-- Skema C: 200 gr Bayam Merah Curah dikemas menjadi 20 pcs Bayam Merah Kemasan (10 gr/pack)
-- PIC Staf: Ni Luh Putu (Staf Produksi Kios) | Yield: 20 pcs
(
    'e1000000-0000-4000-8000-000000000003',
    'a1000000-0000-4000-8000-000000000004', -- Sumber: Benih Bayam Merah (Curah)
    'a1000000-0000-4000-8000-000000000003', -- Target: Benih Bayam Merah (Kemasan)
    'SB-BEN-BYMM-CURAH-01',                  -- Batch Asal
    200.00,                                 -- Gram Digunakan
    20.00,                                  -- Yield / Pcs Dihasilkan
    10.00,                                  -- Gram per Pack
    7000.00,                                -- HPP Final per Sachet (Rp 7.000)
    50000.00,                               -- Modal Benih: 200 gr * Rp 250 = Rp 50.000
    90000.00,                               -- Biaya Kemasan: 20 * Rp 4.500 = Rp 90.000
    '2026-09-02 10:15:00+08'
)
ON CONFLICT (id) DO UPDATE SET
    gram_used = EXCLUDED.gram_used,
    pcs_produced = EXCLUDED.pcs_produced,
    hpp_per_piece = EXCLUDED.hpp_per_piece,
    seed_cost = EXCLUDED.seed_cost,
    packaging_cost = EXCLUDED.packaging_cost;


-- ==============================================================================
-- SKENARIO 3: TRANSAKSI PENJUALAN (KASIR POS)
-- ==============================================================================
-- 3.1 Header Transaksi (Tabel: transactions)
INSERT INTO transactions (
    id,
    invoice_no,
    customer_id,
    customer_name,
    source,
    subtotal,
    tax,
    total,
    payment_method,
    payment_type,
    status,
    created_at
) VALUES
-- Transaksi 1: Pembelian Bayam Hijau Kemasan (3 pcs) + Buku Panduan (1 pcs) - Pembayaran Tunai (Cash)
(
    'f1000000-0000-4000-8000-000000000001',
    'INV-202609-0001',
    NULL,
    'I Made Wardana (Petani Komunitas Ubud)',
    'POS',
    130000.00,
    0.00,
    130000.00,
    'CASH',
    'cash',
    'COMPLETED',
    '2026-09-25 10:15:00+08'
),
-- Transaksi 2: Pembelian Bayam Hijau Kemasan (5 pcs) + Buku Panduan (2 pcs) + Tomat Buah Kemasan (2 pcs) - Transfer Bank
(
    'f1000000-0000-4000-8000-000000000002',
    'INV-202609-0002',
    NULL,
    'Komunitas Kebun Kota Denpasar',
    'POS',
    281000.00,
    0.00,
    281000.00,
    'TRANSFER',
    'transfer',
    'COMPLETED',
    '2026-09-26 14:30:00+08'
),
-- Transaksi 3: Pembelian Bayam Hijau Kemasan (2 pcs) + Buku Panduan (1 pcs) - Pembayaran Tunai (Cash)
(
    'f1000000-0000-4000-8000-000000000003',
    'INV-202609-0003',
    NULL,
    'Pelanggan Umum (Walk-in)',
    'POS',
    115000.00,
    0.00,
    115000.00,
    'CASH',
    'cash',
    'COMPLETED',
    '2026-09-27 16:45:00+08'
)
ON CONFLICT (id) DO UPDATE SET
    invoice_no = EXCLUDED.invoice_no,
    customer_name = EXCLUDED.customer_name,
    subtotal = EXCLUDED.subtotal,
    total = EXCLUDED.total,
    payment_method = EXCLUDED.payment_method,
    status = EXCLUDED.status;

-- 3.2 Detail Item Transaksi (Tabel: transaction_items)
INSERT INTO transaction_items (
    id,
    transaction_id,
    product_id,
    batch_id,
    qty,
    price,
    cost,
    subtotal
) VALUES
-- Rincian Transaksi 1:
-- 3 pcs Benih Bayam Hijau (Kemasan) @ Rp 15.000 (Modal Rp 7.000)
(
    'f1100000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'SB-BEN-BYMH-JADI-01',
    3.00,
    15000.00,
    21000.00,
    45000.00
),
-- 1 pcs Buku Panduan Permakultur Hidup Lestari @ Rp 85.000 (Modal Rp 50.000)
(
    'f1100000-0000-4000-8000-000000000002',
    'f1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    'SB-BUK-PANDUAN-01',
    1.00,
    85000.00,
    50000.00,
    85000.00
),

-- Rincian Transaksi 2:
-- 5 pcs Benih Bayam Hijau (Kemasan) @ Rp 15.000 (Modal Rp 7.000)
(
    'f1100000-0000-4000-8000-000000000003',
    'f1000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000001',
    'SB-BEN-BYMH-JADI-01',
    5.00,
    15000.00,
    35000.00,
    75000.00
),
-- 2 pcs Buku Panduan Permakultur Hidup Lestari @ Rp 85.000 (Modal Rp 50.000)
(
    'f1100000-0000-4000-8000-000000000004',
    'f1000000-0000-4000-8000-000000000002',
    'b1000000-0000-4000-8000-000000000001',
    'SB-BUK-PANDUAN-01',
    2.00,
    85000.00,
    100000.00,
    170000.00
),
-- 2 pcs Benih Tomat Buah (Kemasan) @ Rp 18.000 (Modal Rp 8.500)
(
    'f1100000-0000-4000-8000-000000000005',
    'f1000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000033',
    'SB-BEN-TMBH-JADI-01',
    2.00,
    18000.00,
    17000.00,
    36000.00
),

-- Rincian Transaksi 3:
-- 2 pcs Benih Bayam Hijau (Kemasan) @ Rp 15.000 (Modal Rp 7.000)
(
    'f1100000-0000-4000-8000-000000000006',
    'f1000000-0000-4000-8000-000000000003',
    'a1000000-0000-4000-8000-000000000001',
    'SB-BEN-BYMH-JADI-01',
    2.00,
    15000.00,
    14000.00,
    30000.00
),
-- 1 pcs Buku Panduan Permakultur Hidup Lestari @ Rp 85.000 (Modal Rp 50.000)
(
    'f1100000-0000-4000-8000-000000000007',
    'f1000000-0000-4000-8000-000000000003',
    'b1000000-0000-4000-8000-000000000001',
    'SB-BUK-PANDUAN-01',
    1.00,
    85000.00,
    50000.00,
    85000.00
)
ON CONFLICT (id) DO UPDATE SET
    qty = EXCLUDED.qty,
    price = EXCLUDED.price,
    cost = EXCLUDED.cost,
    subtotal = EXCLUDED.subtotal;

COMMIT;

-- ==============================================================================
-- QUERY VERIFIKASI ALUR KERJA OPERASIONAL
-- ==============================================================================
-- 1. Cek riwayat pembelian stok masuk:
-- SELECT id, invoice_no, supplier_name, total, notes FROM purchases ORDER BY created_at DESC;
--
-- 2. Cek log pengemasan mandiri (curah -> kemasan):
-- SELECT id, gram_used, pcs_produced, hpp_per_piece, created_at FROM productions ORDER BY created_at DESC;
--
-- 3. Cek nota dan omzet transaksi kasir:
-- SELECT id, invoice_no, customer_name, total, payment_method, status, created_at FROM transactions ORDER BY created_at DESC;
