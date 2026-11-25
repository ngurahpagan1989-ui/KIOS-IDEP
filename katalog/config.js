/**
 * ==============================================================================
 * KATALOG PUBLIK & PEMESANAN WHATSAPP
 * Terisolasi Penuh dari Modul Admin (Zero-Leak)
 * ==============================================================================
 */

// 1. KREDENSIAL SUPABASE (HANYA ANON KEY PUBLIK)
const SUPABASE_URL = 'https://xozysfvlhcyjytukisul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvenlzZnZsaGN5anl0dWtpc3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NDg3MzYsImV4cCI6MjEwNTUyNDczNn0.SNlrOxV3jx3H3pYxu9BAMi1zxsW-cmvty_FZL0-RsdQ';

let supabaseClient = null;

// 2. STATE APLIKASI KATALOG
let allProducts = [];
let filteredProducts = [];
let categories = ['Semua'];
let filterOnlyReady = false;
let activeCategory = 'Semua';
let searchQuery = '';
let cart = [];

let storeConfig = {
  name: 'Kebun Benih Lestari',
  phone: '081945468237',
  address: '',
  tagline: 'Pusat Benih Alami, Lokal & Berkelanjutan'
};

const DEFAULT_PROMO_CONFIG = {
  announcement_enabled: true,
  announcement_text: '🌱 Panen Benih Lokal Baru Tiba! • Pesan Online Mudah & Cepat • Gratis Konsultasi Menanam via WhatsApp Toko',
  banner_enabled: true,
  banners: [
    {
      image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d69109853?auto=format&fit=crop&w=1200&q=80',
      badge: 'KOLEKSI SPESIAL',
      title: 'Benih Sayuran & Buah Lokal Pusaka',
      desc: '100% Organik, Alami, dan Non-GMO dari Kebun Pelestarian Terpercaya',
      btn_text: 'Jelajahi Benih',
      category: 'Sayuran'
    },
    {
      image_url: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1200&q=80',
      badge: 'PAKET BERKEBUN',
      title: 'Mulai Kebun Pangan di Halaman Rumah',
      desc: 'Varietas unggul mudah tumbuh & tahan hama dengan daya kecambah teruji',
      btn_text: 'Pilih Benih',
      category: 'Semua'
    },
    {
      image_url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=1200&q=80',
      badge: 'WARISAN NUSANTARA',
      title: 'Konservasi Benih Tanaman Tradisional',
      desc: 'Rawat keberagaman pangan nusantara dengan menanam benih lokal lestari',
      btn_text: 'Lihat Koleksi',
      category: 'Semua'
    }
  ],
  featured_enabled: true,
  featured_title: 'Pilihan Pekan Ini & Paling Laris'
};

let activePromoConfig = JSON.parse(JSON.stringify(DEFAULT_PROMO_CONFIG));
let currentSlideIndex = 0;
let totalSlides = 0;
let sliderAutoTimer = null;

