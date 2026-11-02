-- ==============================================================================
-- KIOS IDEP - SETUP DATABASE UNTUK CUT-OFF & TUTUP BUKU PERIODE AKUNTANSI
-- ==============================================================================
-- Cara Pakai:
-- Salin seluruh isi file ini ke menu [SQL Editor] di Dashboard Supabase Anda,
-- lalu klik tombol [Run]. Aman dijalankan berulang kali (Idempotent).
-- ==============================================================================

-- 1. Tabel Utama Rekapitulasi & Snapshot Tutup Buku Periode
CREATE TABLE IF NOT EXISTS public.accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name text NOT NULL,                    -- Contoh: 'Tutup Buku Periode Oktober 2026'
  start_date date NOT NULL,                     -- Tanggal awal periode (contoh: 2026-10-01)
  cut_off_date timestamptz NOT NULL,            -- Tanggal & waktu cut-off pembekuan (contoh: 2026-10-31 23:59:59+08)
  closed_at timestamptz DEFAULT now(),          -- Waktu eksekusi tutup buku
  closed_by text DEFAULT 'Admin IDEP',          -- Nama/identitas admin yang mengeksekusi
  status text DEFAULT 'CLOSED',                 -- 'CLOSED', 'REOPENED'
  total_revenue numeric DEFAULT 0,              -- Total omzet penjualan (POS Kasir + Konsinyasi)
  total_cogs numeric DEFAULT 0,                 -- Total HPP modal FIFO barang terjual
  gross_profit numeric DEFAULT 0,               -- Laba kotor (Omzet - HPP)
  gross_margin_pct numeric DEFAULT 0,           -- Persentase margin laba
  total_inventory_valuation numeric DEFAULT 0,  -- Total valuasi aset persediaan akhir saat cut-off
  total_items_count integer DEFAULT 0,          -- Jumlah varietas/SKU aktif saat cut-off
  summary jsonb DEFAULT '{}'::jsonb,            -- Ringkasan metrik detail (kanal, outlet, dll.)
  inventory_snapshot jsonb DEFAULT '[]'::jsonb, -- Snapshot saldo awal stok per produk & batch fisik
  notes text DEFAULT '',                        -- Catatan resmi penutupan buku / memo audit
  created_at timestamptz DEFAULT now()
);

-- 2. Indeks untuk Query Cepat Berdasarkan Tanggal Cut-Off
CREATE INDEX IF NOT EXISTS idx_accounting_periods_cutoff 
  ON public.accounting_periods (cut_off_date DESC);

CREATE INDEX IF NOT EXISTS idx_accounting_periods_status 
  ON public.accounting_periods (status);

-- 3. Kebijakan Keamanan Row Level Security (RLS)
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to accounting_periods" ON public.accounting_periods;
CREATE POLICY "Allow all access to accounting_periods" 
  ON public.accounting_periods 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- 4. Beri Izin Akses untuk Role Anon dan Authenticated
GRANT ALL ON TABLE public.accounting_periods TO anon, authenticated, service_role;

-- 5. Kolom Tanda Tangan & Pengesahan Bagian Keuangan (Finance) pada Faktur / Transaksi
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS finance_signature text,
  ADD COLUMN IF NOT EXISTS finance_signer_name text,
  ADD COLUMN IF NOT EXISTS finance_signed_at timestamptz;


