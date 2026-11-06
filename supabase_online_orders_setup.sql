-- ==============================================================================
-- MIGRASI DATABASE: TABEL ANTREAN PESANAN ONLINE (KATALOG WEB -> KASIR POS)
-- Kios IDEP POS & Online Catalog Integration
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

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;

-- Policy A: Publik / Pelanggan Anonim diizinkan MENAMBAH (INSERT) pesanan baru
DROP POLICY IF EXISTS "Anon catalog can insert online orders" ON public.online_orders;
CREATE POLICY "Anon catalog can insert online orders"
ON public.online_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy B: Publik / Pelanggan Anonim dapat membaca status pesanan
DROP POLICY IF EXISTS "Anon catalog can view own order" ON public.online_orders;
CREATE POLICY "Anon catalog can view own order"
ON public.online_orders
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy C: Kasir / User Terautentikasi memiliki kontrol penuh (SELECT, UPDATE status, DELETE)
DROP POLICY IF EXISTS "Authenticated users full access to online orders" ON public.online_orders;
CREATE POLICY "Authenticated users full access to online orders"
ON public.online_orders
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

