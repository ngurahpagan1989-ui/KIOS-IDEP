-- ============================================================================
-- KIOS IDEP - MIGRASI KOLOM BIAYA TAMBAHAN, ADMIN QRIS & PEMBAYARAN TUNAI
-- Jalankan script ini di Supabase Dashboard -> SQL Editor (aman dijalankan ulang)
-- ============================================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT 0;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS fee_note text DEFAULT '';

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS qris_fee numeric DEFAULT 0;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS cash_received numeric DEFAULT 0;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS change_amount numeric DEFAULT 0;

COMMENT ON COLUMN public.transactions.shipping_cost IS 'Ongkos kirim atau biaya tambahan di luar subtotal produk';
COMMENT ON COLUMN public.transactions.fee_note IS 'Keterangan singkat biaya tambahan / ongkir (opsional)';
COMMENT ON COLUMN public.transactions.qris_fee IS 'Biaya admin/MDR QRIS transaksi (baik ditanggung pelanggan maupun toko)';
COMMENT ON COLUMN public.transactions.cash_received IS 'Nominal uang tunai diterima dari pelanggan saat checkout lunas';
COMMENT ON COLUMN public.transactions.change_amount IS 'Nominal uang kembalian kepada pelanggan untuk transaksi tunai lunas';

-- Paksa PostgREST memuat ulang schema cache agar kolom baru langsung terbaca
NOTIFY pgrst, 'reload schema';
