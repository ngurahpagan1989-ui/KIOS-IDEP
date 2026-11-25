/**
 * ==============================================================================
 * POS & MANAJEMEN STOK - SUPABASE CLIENT ADAPTER & API BRIDGE
 * ==============================================================================
 * File ini menggantikan seluruh ketergantungan `google.script.run` dengan
 * Supabase SDK (@supabase/supabase-js v2):
 * 1. Koneksi Supabase Client & Konfigurasi Lingkungan
 * 2. Autentikasi Pengguna & Manajemen Sesi (Supabase Auth + profiles table)
 * 3. Supabase Storage: Pengunggahan foto baki semai QC & tanda tangan serah terima
 * 4. PostgREST & RPC Bridge: Implementasi lengkap seluruh fungsi backend
 *    (POS, Pengadaan, Produksi, QC DHT, Konsinyasi, Faktur, Laporan, CRM, Settings)
 * ==============================================================================
 */

// 1. KREDENSIAL KONEKSI SUPABASE
const SUPABASE_URL = 'https://xozysfvlhcyjytukisul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvenlzZnZsaGN5anl0dWtpc3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NDg3MzYsImV4cCI6MjEwNTUyNDczNn0.SNlrOxV3jx3H3pYxu9BAMi1zxsW-cmvty_FZL0-RsdQ';

const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY
};

try {
  const _createClientFn = window.supabase?.createClient || (typeof createClient === 'function' ? createClient : null);
  if (_createClientFn) {
    window.supabase = _createClientFn(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase Client siap digunakan.');
  } else {
    console.error('❌ Library Supabase CDN belum termuat di index.html.');
  }
} catch (err) {
  console.error('❌ Gagal inisialisasi Supabase Client:', err);
}

// Global state untuk sesi pengguna lokal
window.CURRENT_SESSION = null;
window.CURRENT_USER_PROFILE = null;

