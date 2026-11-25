// ==============================================================================
// MODAL KATALOG PUBLIK & STANDEE QR CODE UNTUK KASIR / ADMIN
// ==============================================================================
function getCatalogPublicUrl() {
  const loc = window.location;
  let url = loc.origin + loc.pathname;
  if (url.endsWith('index.html')) {
    url = url.replace(/index\.html$/, 'katalog.html');
  } else if (url.endsWith('/')) {
    url += 'katalog.html';
  } else {
    url = url.substring(0, url.lastIndexOf('/') + 1) + 'katalog.html';
  }
  return url;
}

function openPublicCatalogManager() {
  const catalogUrl = getCatalogPublicUrl();
  const s = window.SETTINGS || {};
  const storeName = s.store_name || 'Katalog Resmi Toko';
  const storePhone = s.store_phone || '';
  const storeTagline = s.store_tagline || 'Pusat Benih Tanaman Lokal & Produk Berkualitas';
  const qrImgUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=' + encodeURIComponent(catalogUrl);

  const bodyHtml =
    '<div style="display:flex;flex-direction:column;gap:18px;">' +
    '  <!-- Kartu Tautan Cepat -->' +
    '  <div style="background:rgba(22,30,46,0.7);border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);padding:14px;">' +
    '    <div style="font-size:12.5px;font-weight:700;color:var(--text-main);margin-bottom:6px;display:flex;align-items:center;gap:6px;">' +
    '      <i class="fas fa-link" style="color:var(--primary);"></i> Tautan Publik Katalog Pelanggan:' +
    '    </div>' +
    '    <div style="display:flex;gap:8px;align-items:center;">' +
    '      <input type="text" id="public-catalog-url-input" value="' + escapeHtml(catalogUrl) + '" readonly style="flex:1;padding:8px 12px;font-size:12.5px;background:rgba(15,23,42,0.9);border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius-xs);color:#22D3EE;font-family:monospace;" onclick="this.select()">' +
    '      <button type="button" class="btn btn-primary btn-sm" onclick="copyCatalogPublicUrl()" style="white-space:nowrap;display:inline-flex;align-items:center;gap:6px;">' +
    '        <i class="fas fa-copy"></i> Salin' +
    '      </button>' +
    '      <a href="' + escapeHtml(catalogUrl) + '" target="_blank" class="btn btn-secondary btn-sm" style="white-space:nowrap;display:inline-flex;align-items:center;gap:6px;text-decoration:none;">' +
    '        <i class="fas fa-external-link-alt"></i> Buka' +
    '      </a>' +
    '    </div>' +
    '    <div style="font-size:11px;color:var(--text-secondary);margin-top:6px;">' +
    '      💡 <em>Bagikan tautan ini ke profil bio media sosial, status WhatsApp, atau chat calon pelanggan.</em>' +
    '    </div>' +
    '  </div>' +

    '  <!-- Preview Standee QR Code Meja Kasir -->' +
    '  <div style="border:1.5px dashed rgba(6,182,212,0.4);border-radius:var(--radius-md);padding:20px;text-align:center;background:rgba(22,30,46,0.8);box-shadow:0 4px 20px rgba(0,0,0,0.4);">' +
    '    <div style="display:inline-block;padding:4px 12px;background:#EFF6FF;color:#2563EB;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">' +
    '      Standee Meja Kasir / Etalase Toko' +
    '    </div>' +
    '    <h3 style="font-size:18px;font-weight:900;color:#F8FAFC;margin-bottom:2px;">' + escapeHtml(storeName) + '</h3>' +
    '    <p style="font-size:11.5px;color:#94A3B8;margin-bottom:14px;max-width:340px;margin-left:auto;margin-right:auto;">' + escapeHtml(storeTagline) + '</p>' +
    '    <div style="display:inline-block;padding:12px;background:#ffffff;border:2px solid #0F172A;border-radius:16px;box-shadow:0 8px 20px rgba(0,0,0,0.08);margin-bottom:14px;">' +
    '      <img src="' + qrImgUrl + '" alt="QR Code Katalog" style="width:190px;height:190px;display:block;" onerror="this.alt=\'Gagal memuat QR Code\'">' +
    '    </div>' +
    '    <div style="font-size:13px;font-weight:800;color:#F8FAFC;margin-bottom:4px;">' +
    '      📱 SCAN UNTUK LIHAT KATALOG &amp; PESAN' +
    '    </div>' +
    '    <div style="font-size:11.5px;color:#94A3B8;">' +
    '      Arahkan kamera ponsel Anda untuk memesan langsung via WhatsApp' +
    '    </div>' +
    (storePhone ? '<div style="font-size:11px;font-weight:700;color:#2563EB;margin-top:6px;"><i class="fab fa-whatsapp"></i> WA: ' + escapeHtml(storePhone) + '</div>' : '') +
    '  </div>' +
    '</div>';

  const footerHtml =
    '<div style="display:flex;justify-content:space-between;align-items:center;width:100%;gap:10px;">' +
    '  <button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>' +
    '  <button type="button" class="btn btn-primary" onclick="printCatalogStandee()" style="display:inline-flex;align-items:center;gap:6px;font-weight:700;">' +
    '    <i class="fas fa-print"></i> Cetak Standee Meja Kasir' +
    '  </button>' +
    '</div>';

  openModal('🌐 Katalog Publik &amp; Standee QR Code', bodyHtml, footerHtml, true);
}

function copyCatalogPublicUrl() {
  const input = document.getElementById('public-catalog-url-input');
  if (!input) return;
  const url = input.value;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function () {
      showToast('Tautan katalog publik berhasil disalin ke clipboard! 📋');
    }).catch(function () {
      fallbackCopyCatalogText(input);
    });
  } else {
    fallbackCopyCatalogText(input);
  }
}

function fallbackCopyCatalogText(input) {
  input.select();
  input.setSelectionRange(0, 99999);
  try {
    document.execCommand('copy');
    showToast('Tautan katalog publik berhasil disalin! 📋');
  } catch (e) {
    showToast('Gagal menyalin otomatis, silakan salin manual.', true);
  }
}

function printCatalogStandee() {
  const catalogUrl = getCatalogPublicUrl();
  const s = window.SETTINGS || {};
  const storeName = s.store_name || 'Katalog Resmi Toko';
  const storePhone = s.store_phone || '';
  const storeAddress = s.store_address || '';
  const storeTagline = s.store_tagline || 'Pusat Benih Tanaman Lokal & Produk Berkualitas';
  const qrImgUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=450x450&margin=15&data=' + encodeURIComponent(catalogUrl);

  const printWin = window.open('', '_blank', 'width=700,height=900');
  if (!printWin) {
    alert('Pop-up terblokir oleh browser. Izinkan pop-up untuk mencetak standee.');
    return;
  }

  const printHtml = '<!DOCTYPE html>' +
    '<html lang="id">' +
    '<head>' +
    '  <meta charset="utf-8">' +
    '  <title>Standee QR Code - ' + escapeHtml(storeName) + '</title>' +
    '  <link rel="preconnect" href="https://fonts.googleapis.com">' +
    '  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700;800;900&display=swap" rel="stylesheet">' +
    '  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">' +
    '  <style>' +
    '    @page { size: A5 portrait; margin: 10mm; }' +
    '    * { box-sizing: border-box; margin: 0; padding: 0; }' +
    '    body {' +
    '      font-family: "Figtree", sans-serif;' +
    '      background: #FFFFFF;' +
    '      color: #0F172A;' +
    '      display: flex;' +
    '      align-items: center;' +
    '      justify-content: center;' +
    '      min-height: 100vh;' +
    '      padding: 20px;' +
    '      -webkit-print-color-adjust: exact !important;' +
    '      print-color-adjust: exact !important;' +
    '    }' +
    '    .standee-frame {' +
    '      width: 100%;' +
    '      max-width: 460px;' +
    '      border: 4px solid #0F172A;' +
    '      border-radius: 24px;' +
    '      padding: 36px 28px;' +
    '      text-align: center;' +
    '      background: #FFFFFF;' +
    '      box-shadow: 0 4px 20px rgba(0,0,0,0.06);' +
    '    }' +
    '    .badge-pill {' +
    '      display: inline-block;' +
    '      background: #2563EB;' +
    '      color: #FFFFFF;' +
    '      padding: 6px 18px;' +
    '      border-radius: 999px;' +
    '      font-size: 13px;' +
    '      font-weight: 800;' +
    '      letter-spacing: 0.5px;' +
    '      text-transform: uppercase;' +
    '      margin-bottom: 16px;' +
    '    }' +
    '    h1 { font-size: 26px; font-weight: 900; color: #0F172A; line-height: 1.2; margin-bottom: 6px; }' +
    '    .tagline { font-size: 13px; color: #475569; margin-bottom: 22px; }' +
    '    .qr-wrap {' +
    '      display: inline-block;' +
    '      padding: 16px;' +
    '      background: #FFFFFF;' +
    '      border: 3px solid #2563EB;' +
    '      border-radius: 20px;' +
    '      box-shadow: 0 10px 25px rgba(37, 99, 235, 0.12);' +
    '      margin-bottom: 22px;' +
    '    }' +
    '    .qr-wrap img { width: 250px; height: 250px; display: block; }' +
    '    .instruction-box {' +
    '      background: #EFF6FF;' +
    '      border: 1.5px solid #BFDBFE;' +
    '      border-radius: 14px;' +
    '      padding: 12px 16px;' +
    '      margin-bottom: 18px;' +
    '    }' +
    '    .instruction-title { font-size: 14px; font-weight: 800; color: #1E40AF; margin-bottom: 4px; }' +
    '    .instruction-desc { font-size: 12px; color: #334155; line-height: 1.4; }' +
    '    .footer-info { font-size: 11.5px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 14px; }' +
    '    @media print { body { padding: 0; } }' +
    '  </style>' +
    '</head>' +
    '<body>' +
    '  <div class="standee-frame">' +
    '    <div class="badge-pill">KATALOG RESMI TOKO</div>' +
    '    <h1>' + escapeHtml(storeName) + '</h1>' +
    '    <div class="tagline">' + escapeHtml(storeTagline) + '</div>' +
    '    <div class="qr-wrap"><img src="' + qrImgUrl + '" alt="QR Code Katalog"></div>' +
    '    <div class="instruction-box">' +
    '      <div class="instruction-title">📱 SCAN DENGAN KAMERA HP</div>' +
    '      <div class="instruction-desc">Arahkan kamera ponsel Anda ke QR Code untuk melihat katalog lengkap &amp; memesan via WhatsApp</div>' +
    '    </div>' +
    '    <div class="footer-info">' +
    (storeAddress ? '<div><i class="fas fa-map-marker-alt"></i> ' + escapeHtml(storeAddress) + '</div>' : '') +
    (storePhone ? '<div style="margin-top:4px;font-weight:700;color:#2563EB;"><i class="fab fa-whatsapp"></i> Hubungi WA: ' + escapeHtml(storePhone) + '</div>' : '') +
    '    </div>' +
    '  </div>' +
    '  <script>' +
    '    window.onload = function() { setTimeout(function() { window.print(); }, 400); };' +
    '  <\/script>' +
    '</body>' +
    '</html>';

  printWin.document.write(printHtml);
  printWin.document.close();
}

window.openPublicCatalogManager = openPublicCatalogManager;
window.copyCatalogPublicUrl = copyCatalogPublicUrl;
window.printCatalogStandee = printCatalogStandee;

function handleProductPhotoUpload(input, targetInputId, previewBoxId) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  if (!file.type.startsWith('image/')) {
    showToast('Harap pilih file gambar (JPG, PNG, atau WebP).', true);
    return;
  }

  showToast('Memproses dan mengompres foto produk...');
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const maxDim = 600;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

      const targetInput = document.getElementById(targetInputId);
      if (targetInput) targetInput.value = compressedDataUrl;

      const previewBox = document.getElementById(previewBoxId);
      if (previewBox) {
        previewBox.innerHTML = '<img src="' + compressedDataUrl + '" alt="Foto Produk" style="width:100%;height:100%;object-fit:cover;">';
      }
      showToast('Foto produk berhasil dipilih! Klik "Simpan Produk" untuk menyimpan.');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clearProductPhoto(targetInputId, fileInputId, previewBoxId) {
  const targetInput = document.getElementById(targetInputId);
  if (targetInput) targetInput.value = '';
  const fileInput = document.getElementById(fileInputId);
  if (fileInput) fileInput.value = '';
  const previewBox = document.getElementById(previewBoxId);
  if (previewBox) {
    previewBox.innerHTML = '<span style="font-size:10px;color:var(--text-muted);text-align:center;"><i class="fas fa-image" style="font-size:22px;display:block;margin-bottom:2px;color:#CBD5E1;"></i>Belum Ada</span>';
  }
}

function buildCatalogPromoSettingsHTML(settings) {
  let promoConf = {
    announcement_enabled: true,
    announcement_text: '🌱 Panen Benih Lokal Baru Tiba! • Pesan Online Mudah & Cepat • Gratis Konsultasi Menanam via WhatsApp Kebun Benih',
    banner_enabled: true,
    banners: [
      {
        image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d69109853?auto=format&fit=crop&w=1200&q=80',
        badge: 'KOLEKSI SPESIAL',
        title: 'Benih Sayuran & Buah Lokal Pusaka',
        desc: '100% Organik, Alami, dan Non-GMO dari Kebun Pelestarian',
        category: 'Sayuran'
      },
      {
        image_url: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1200&q=80',
        badge: 'PAKET BERKEBUN',
        title: 'Mulai Kebun Pangan di Halaman Rumah',
        desc: 'Varietas unggul mudah tumbuh & tahan hama dengan daya kecambah teruji',
        category: 'Semua'
      },
      {
        image_url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=1200&q=80',
        badge: 'WARISAN NUSANTARA',
        title: 'Konservasi Benih Tanaman Tradisional',
        desc: 'Rawat keberagaman pangan nusantara dengan menanam benih lokal lestari',
        category: 'Semua'
      }
    ],
    featured_enabled: true,
    featured_title: 'Pilihan Pekan Ini & Paling Laris'
  };

  if (settings && settings['catalog_promo_config']) {
    try {
      const parsed = JSON.parse(settings['catalog_promo_config']);
      promoConf = Object.assign({}, promoConf, parsed);
      if (Array.isArray(parsed.banners)) promoConf.banners = parsed.banners;
    } catch (e) {
      console.warn('Parse promo config err:', e);
    }
  }

  const banners = promoConf.banners || [];
  while (banners.length < 3) {
    banners.push({ image_url: '', badge: '', title: '', desc: '', category: 'Semua' });
  }

  let bannersHtml = '';
  banners.slice(0, 3).forEach(function (b, idx) {
    bannersHtml +=
      '<div style="background:rgba(22,30,46,0.7);border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);padding:14px;margin-bottom:12px;">' +
      '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
      '    <strong style="font-size:13px;color:var(--text-main);display:flex;align-items:center;gap:8px;">' +
      '      <span style="background:linear-gradient(135deg, var(--primary), var(--accent));color:#fff;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 0 10px rgba(6,182,212,0.4);">' + (idx + 1) + '</span> ' +
      '      Slide Banner #' + (idx + 1) +
      '    </strong>' +
      '    <span style="font-size:11px;font-weight:600;color:var(--primary);background:rgba(6,182,212,0.12);padding:2px 8px;border-radius:12px;border:1px solid rgba(6,182,212,0.25);">' + (idx === 0 ? '⭐ Utama / Slide Awal' : '🔄 Slide Bergantian') + '</span>' +
      '  </div>' +
      '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">' +
      '    <div>' +
      '      <label style="font-size:11px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">URL Gambar Banner</label>' +
      '      <input type="text" id="set-banner-img-' + idx + '" value="' + escapeHtml(b.image_url || '') + '" placeholder="https://..." style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:4px;font-size:12px;background:rgba(15,23,42,0.85);color:var(--text-main);">' +
      '    </div>' +
      '    <div>' +
      '      <label style="font-size:11px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Teks Badge / Label Kecil</label>' +
      '      <input type="text" id="set-banner-badge-' + idx + '" value="' + escapeHtml(b.badge || '') + '" placeholder="Contoh: KOLEKSI SPESIAL" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:4px;font-size:12px;background:rgba(15,23,42,0.85);color:var(--text-main);">' +
      '    </div>' +
      '  </div>' +
      '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">' +
      '    <div>' +
      '      <label style="font-size:11px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Judul Utama Banner</label>' +
      '      <input type="text" id="set-banner-title-' + idx + '" value="' + escapeHtml(b.title || '') + '" placeholder="Contoh: Benih Sayuran Lokal" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:4px;font-size:12px;background:rgba(15,23,42,0.85);color:var(--text-main);">' +
      '    </div>' +
      '    <div>' +
      '      <label style="font-size:11px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Kategori Target Klik</label>' +
      '      <input type="text" id="set-banner-cat-' + idx + '" value="' + escapeHtml(b.category || 'Semua') + '" placeholder="Contoh: Sayuran atau Semua" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:4px;font-size:12px;background:rgba(15,23,42,0.85);color:var(--text-main);">' +
      '    </div>' +
      '  </div>' +
      '  <div>' +
      '    <label style="font-size:11px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Deskripsi Singkat Banner</label>' +
      '    <input type="text" id="set-banner-desc-' + idx + '" value="' + escapeHtml(b.desc || '') + '" placeholder="Contoh: 100% Organik & Non-GMO" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:4px;font-size:12px;background:rgba(15,23,42,0.85);color:var(--text-main);">' +
      '  </div>' +
      '</div>';
  });

  return (
    '<div class="card" style="margin-top:20px;border-top:3px solid var(--primary);background:rgba(17,24,39,0.85);border:1px solid rgba(255,255,255,0.08);color:var(--text-main);box-shadow:0 4px 20px rgba(0,0,0,0.35);border-radius:var(--radius-md);padding:20px;">' +
    '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">' +
    '    <div>' +
    '      <h3 style="margin-bottom:4px;display:flex;align-items:center;gap:8px;"><i class="fas fa-bullhorn" style="color:var(--primary);"></i> Manajemen Media Promosi &amp; Banner Katalog</h3>' +
    '      <p style="font-size:12px;color:var(--text-secondary);margin:0;">Atur pita pengumuman berjalan, carousel banner promo, dan daftar produk unggulan di katalog online:</p>' +
    '    </div>' +
    '    <span class="badge" style="background:rgba(6,182,212,0.15);color:#22D3EE;border:1px solid rgba(6,182,212,0.3);font-weight:700;padding:6px 12px;border-radius:20px;font-size:12px;"><i class="fas fa-bolt" style="margin-right:4px;"></i> Tampilan Realtime</span>' +
    '  </div>' +

    '  <!-- 1. Pita Pengumuman Berjalan -->' +
    '  <div style="background:rgba(22,30,46,0.65);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-sm);padding:14px;margin-bottom:18px;">' +
    '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
    '      <label style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;color:var(--text-main);cursor:pointer;margin:0;">' +
    '        <input type="checkbox" id="set-promo-ann-enable" ' + (promoConf.announcement_enabled ? 'checked' : '') + ' style="width:16px;height:16px;accent-color:var(--primary);">' +
    '        <span>Tampilkan Pita Pengumuman Berjalan (Announcement Bar)</span>' +
    '      </label>' +
    '      <span style="font-size:11px;color:var(--text-muted);">Muncul di bagian paling atas katalog</span>' +
    '    </div>' +
    '    <div class="field-group" style="margin-bottom:0;">' +
    '      <label class="field-label" style="font-size:12px;">Teks Pesan Berjalan</label>' +
    '      <div class="input-wrapper">' +
    '        <input type="text" id="set-promo-ann-text" value="' + escapeHtml(promoConf.announcement_text || '') + '" placeholder="Contoh: 🌱 Panen Benih Baru Tiba! Diskon 10% Pembelian Grosir..." style="padding-left:14px;">' +
    '      </div>' +
    '    </div>' +
    '  </div>' +

    '  <!-- 2. Hero Banner Slider (3 Banner) -->' +
    '  <div style="background:rgba(22,30,46,0.65);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-sm);padding:14px;margin-bottom:18px;">' +
    '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
    '      <label style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;color:var(--text-main);cursor:pointer;margin:0;">' +
    '        <input type="checkbox" id="set-promo-banner-enable" ' + (promoConf.banner_enabled ? 'checked' : '') + ' style="width:16px;height:16px;accent-color:var(--primary);">' +
    '        <span>Tampilkan Hero Banner Promo Slider (Carousel)</span>' +
    '      </label>' +
    '      <span style="font-size:11px;color:var(--text-muted);">Maks. 3 Slide Banner</span>' +
    '    </div>' +
    bannersHtml +
    '  </div>' +

    '  <!-- 3. Produk Pilihan / Paling Laris -->' +
    '  <div style="background:rgba(22,30,46,0.65);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-sm);padding:14px;margin-bottom:18px;">' +
    '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
    '      <label style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;color:var(--text-main);cursor:pointer;margin:0;">' +
    '        <input type="checkbox" id="set-promo-feat-enable" ' + (promoConf.featured_enabled ? 'checked' : '') + ' style="width:16px;height:16px;accent-color:var(--primary);">' +
    '        <span>Tampilkan Bagian Produk Pilihan / Paling Laris</span>' +
    '      </label>' +
    '    </div>' +
    '    <div class="field-group" style="margin-bottom:0;">' +
    '      <label class="field-label" style="font-size:12px;">Judul Bagian</label>' +
    '      <div class="input-wrapper">' +
    '        <input type="text" id="set-promo-feat-title" value="' + escapeHtml(promoConf.featured_title || 'Pilihan Pekan Ini & Paling Laris') + '" style="padding-left:14px;">' +
    '      </div>' +
    '    </div>' +
    '  </div>' +

    '  <div style="display:flex;justify-content:flex-end;gap:10px;">' +
    '    <button type="button" class="btn btn-primary" onclick="saveCatalogPromoSettings()"><i class="fas fa-save" style="margin-right:6px;"></i> Simpan Pengaturan Media Promosi</button>' +
    '  </div>' +
    '</div>'
  );
}

function saveCatalogPromoSettings() {
  const annEnabled = document.getElementById('set-promo-ann-enable') ? document.getElementById('set-promo-ann-enable').checked : true;
  const annText = document.getElementById('set-promo-ann-text') ? document.getElementById('set-promo-ann-text').value.trim() : '';
  const bannerEnabled = document.getElementById('set-promo-banner-enable') ? document.getElementById('set-promo-banner-enable').checked : true;
  const featEnabled = document.getElementById('set-promo-feat-enable') ? document.getElementById('set-promo-feat-enable').checked : true;
  const featTitle = document.getElementById('set-promo-feat-title') ? document.getElementById('set-promo-feat-title').value.trim() : 'Pilihan Pekan Ini & Paling Laris';

  const banners = [];
  for (let i = 0; i < 3; i++) {
    const imgEl = document.getElementById('set-banner-img-' + i);
    const badgeEl = document.getElementById('set-banner-badge-' + i);
    const titleEl = document.getElementById('set-banner-title-' + i);
    const descEl = document.getElementById('set-banner-desc-' + i);
    const catEl = document.getElementById('set-banner-cat-' + i);

    const imgVal = imgEl ? imgEl.value.trim() : '';
    const titleVal = titleEl ? titleEl.value.trim() : '';
    if (imgVal || titleVal) {
      banners.push({
        image_url: imgVal || 'https://images.unsplash.com/photo-1592417817098-8f3d69109853?auto=format&fit=crop&w=1200&q=80',
        badge: badgeEl ? badgeEl.value.trim() : '',
        title: titleVal,
        desc: descEl ? descEl.value.trim() : '',
        btn_text: 'Lihat Produk',
        category: catEl ? catEl.value.trim() : 'Semua'
      });
    }
  }

  const promoConfig = {
    announcement_enabled: annEnabled,
    announcement_text: annText,
    banner_enabled: bannerEnabled,
    banners: banners.length > 0 ? banners : undefined,
    featured_enabled: featEnabled,
    featured_title: featTitle
  };

  const payload = {
    catalog_promo_config: JSON.stringify(promoConfig)
  };

  showToast('Menyimpan konfigurasi media promosi katalog...');
  api('saveSettings', TOKEN, payload).then(function () {
    invalidateCache('settings');
    if (APP_SETTINGS) {
      APP_SETTINGS.catalog_promo_config = payload.catalog_promo_config;
    }
    showToast('Media promosi katalog berhasil diperbarui! ✅');
  }).catch(function (err) {
    showToast('Gagal menyimpan media promosi: ' + (err.message || err), true);
  });
}

function saveCatalogSettings() {
  const catTitle = document.getElementById('set-cat-title') ? document.getElementById('set-cat-title').value.trim() : '';
  const catTagline = document.getElementById('set-cat-tagline') ? document.getElementById('set-cat-tagline').value.trim() : '';
  const catPhone = document.getElementById('set-cat-phone') ? document.getElementById('set-cat-phone').value.trim() : '';
  const catAddress = document.getElementById('set-cat-address') ? document.getElementById('set-cat-address').value.trim() : '';
  const catEmail = document.getElementById('set-cat-email') ? document.getElementById('set-cat-email').value.trim() : '';
  const catNotes = document.getElementById('set-cat-notes') ? document.getElementById('set-cat-notes').value.trim() : '';

  const payload = {
    catalog_title: catTitle,
    store_name: catTitle || (APP_SETTINGS ? APP_SETTINGS.store_name : ''),
    store_tagline: catTagline,
    store_phone: catPhone,
    store_address: catAddress,
    store_email: catEmail || (APP_SETTINGS ? APP_SETTINGS.store_email : ''),
    catalog_notes: catNotes
  };

  showToast('Menyimpan konfigurasi katalog online...');
  api('saveSettings', TOKEN, payload).then(function () {
    invalidateCache('settings');
    Object.assign(APP_SETTINGS, payload);
    showToast('Pengaturan katalog online berhasil diperbarui! ✅');
  }).catch(function (err) {
    showToast('Gagal menyimpan: ' + (err.message || err), true);
  });
}

window.handleProductPhotoUpload = handleProductPhotoUpload;
window.clearProductPhoto = clearProductPhoto;
window.saveCatalogSettings = saveCatalogSettings;
window.saveCatalogPromoSettings = saveCatalogPromoSettings;


