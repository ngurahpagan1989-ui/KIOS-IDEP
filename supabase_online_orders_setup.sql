-- ==============================================================================
-- MIGRASI DATABASE: TABEL ANTREAN PESANAN ONLINE (KATALOG WEB -> KASIR POS)
-- Kios IDEP POS & Online Catalog Integration
-- ==============================================================================
-- Cara Pakai:
-- Salin seluruh isi file ini ke menu [SQL Editor] di Dashboard Supabase Anda,
-- lalu klik tombol [Run]. Aman dijalankan berulang kali (Idempotent).
-- ==============================================================================

-- 1. Buat Tabel online_orders
CREATE TABLE IF NOT EXISTS public.online_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    delivery_method VARCHAR(50) DEFAULT 'Ambil di Toko',
    customer_address TEXT,
    notes TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'cancelled'
    source VARCHAR(50) NOT NULL DEFAULT 'KATALOG_ONLINE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Index untuk performa query antrean kasir
CREATE INDEX IF NOT EXISTS idx_online_orders_status ON public.online_orders (status);
CREATE INDEX IF NOT EXISTS idx_online_orders_created_at ON public.online_orders (created_at DESC);

-- 2. Aktifkan Row Level Security (RLS) & Kebijakan Hak Akses Lengkap
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;

-- Bersihkan policy lama jika ada
DROP POLICY IF EXISTS "Anon catalog can insert online orders" ON public.online_orders;
DROP POLICY IF EXISTS "Anon catalog can view own order" ON public.online_orders;
DROP POLICY IF EXISTS "Authenticated users full access to online orders" ON public.online_orders;
DROP POLICY IF EXISTS "Allow all access to online_orders" ON public.online_orders;

-- Kebijakan Akses Menyeluruh (Katalog & Kasir POS): SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Allow all access to online_orders"
ON public.online_orders
FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 3. Beri Izin Hak Akses (GRANT) ke Role Anon, Authenticated, dan Service Role
GRANT ALL ON TABLE public.online_orders TO anon, authenticated, service_role;

-- 4. Fungsi Khusus (RPC SECURITY DEFINER) untuk update status pesanan online
-- Fungsi ini menjamin status selalu sukses diperbarui tanpa hambatan izin sesi
CREATE OR REPLACE FUNCTION public.update_online_order_status(
    p_order_id UUID,
    p_status VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.online_orders
    SET status = p_status, updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'id', p_order_id, 'status', p_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_online_order_status(UUID, VARCHAR) TO anon, authenticated, service_role;

-- 5. Sinkronisasi Otomatis: Tandai pesanan yang sudah dibuatkan transaksi di kasir sebagai 'completed'
UPDATE public.online_orders
SET status = 'completed', updated_at = now()
WHERE order_no = 'KT-261107-438';
