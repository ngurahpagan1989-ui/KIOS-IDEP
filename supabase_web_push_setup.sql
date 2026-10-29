-- ==============================================================================
-- KIOS IDEP - SETUP DATABASE UNTUK NOTIFIKASI HP & BACKGROUND WEB PUSH (VAPID)
-- ==============================================================================
-- Cara Pakai:
-- Salin seluruh isi file ini ke menu [SQL Editor] di Dashboard Supabase Anda,
-- lalu klik tombol [Run]. Aman dijalankan berulang kali (Idempotent).
-- ==============================================================================

-- 1. Tabel Penyimpanan Langganan Perangkat Web Push (Android, iOS 16.4+, Desktop)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_id text DEFAULT '',
  username text DEFAULT '',
  role text DEFAULT '',
  device_label text DEFAULT '',
  categories jsonb DEFAULT '["security","sales","stock","qc","finance","aftersales"]'::jsonb,
  preferences jsonb DEFAULT '{"security":true,"sales":true,"stock":true,"qc":true,"finance":true,"aftersales":true}'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active
  ON public.push_subscriptions (active);

-- 2. Tabel Riwayat Notifikasi Tim Lintas Perangkat (Sinkronisasi Lonceng Notifikasi)
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id text PRIMARY KEY,
  category text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  route text DEFAULT '#dashboard',
  urgent boolean DEFAULT false,
  actor_name text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_created_at
  ON public.app_notifications (created_at DESC);

-- 3. Row Level Security (RLS) agar aplikasi PWA Kios IDEP dapat mendaftarkan perangkat
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow client upsert push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Allow client upsert push_subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow client read insert app_notifications" ON public.app_notifications;
CREATE POLICY "Allow client read insert app_notifications"
  ON public.app_notifications
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Aktifkan Supabase Realtime pada tabel notifikasi & operasional utama
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['app_notifications', 'transactions', 'stock_batches', 'seed_qc_logs', 'after_sales_claims']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

-- 5. Simpan VAPID Public Key default ke tabel settings (jika belum ada)
INSERT INTO public.settings (key, value, updated_at)
VALUES (
  'vapid_public_key',
  'BLzhkf4qxdi1rwnsNMJoReFfNtgOdxwuvcGpdRoDQGZ6GZ88JyRkMJ5FAcrINdyKTjoHZmRmwfp8BhmbXiGhF9w',
  now()
)
ON CONFLICT (key) DO NOTHING;
