// ========================= PENGATURAN TOKO, ROLES, PENGGUNA & INTEGRASI =========================
let CURRENT_ROLES_PERMISSIONS = null;
let CURRENT_SELECTED_ROLE_TAB = 'Admin';
let CURRENT_USERS_LIST = [];
let CURRENT_SETTINGS_SUBTAB = 'profile';

function renderPengaturan(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  const cached = getCachedData('settings');
  if (!forceRefresh && isCacheValid('settings') && cached) {
    drawPengaturanUI(cached);
    return;
  }

  const currentSettings = cached || APP_SETTINGS || {};
  drawPengaturanUI(currentSettings);

  api('getSettings', TOKEN).then(function (settings) {
    setCachedData('settings', settings || {});
    APP_SETTINGS = settings || {};
    syncSessionTimeoutFromSettings(APP_SETTINGS);
    drawPengaturanUI(settings || {});
  }).catch(function (err) {
    if (!cached) {
      showToast('Gagal memuat pengaturan: ' + (err.message || err), true);
    }
  });
}

function switchSettingTab(tabName) {
  if (tabName === 'pricing') {
    tabName = 'batch';
  }

  // Menyembunyikan semua div dengan class .setting-pane
  document.querySelectorAll('.setting-pane').forEach(function (pane) {
    pane.style.display = 'none';
  });

  // Menghapus class active dari semua .settings-tab-btn
  document.querySelectorAll('.settings-tab-btn').forEach(function (btn) {
    btn.classList.remove('active');
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
  });

  // Menampilkan document.getElementById('pane-' + tabName)
  const targetPane = document.getElementById('pane-' + tabName);
  if (targetPane) {
    targetPane.style.display = 'block';
  }

  // Menambahkan class active pada tombol yang diklik (menggunakan event.currentTarget atau querySelector)
  let activeBtn = null;
  if (typeof event !== 'undefined' && event && event.currentTarget && event.currentTarget.classList && event.currentTarget.classList.contains('settings-tab-btn')) {
    activeBtn = event.currentTarget;
  }
  if (!activeBtn) {
    activeBtn = document.querySelector('.settings-tab-btn[data-tab="' + tabName + '"]') || document.getElementById('tab-set-btn-' + tabName);
  }
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.classList.add('btn-primary');
    activeBtn.classList.remove('btn-secondary');
  }

  CURRENT_SETTINGS_SUBTAB = tabName;

  if (tabName === 'roles') {
    loadRolePermissionsUI();
  } else if (tabName === 'users') {
    loadUsersManagementUI();
  } else if (tabName === 'notif' && typeof refreshNotifSettingsPaneUI === 'function') {
    refreshNotifSettingsPaneUI();
  }

  if (targetPane && window.i18n && typeof window.i18n.translateDOM === 'function') {
    window.i18n.translateDOM(targetPane);
  }
}

function switchSettingsSubtab(subtab) {
  switchSettingTab(subtab);
}
window.switchSettingTab = switchSettingTab;
window.switchSettingsSubtab = switchSettingsSubtab;

function getDefaultRolesPermissions() {
  const defaultAll = { can_view: true, can_edit: true, can_delete: true };
  const viewOnly = { can_view: true, can_edit: false, can_delete: false };
  const modules = ['dashboard', 'pos', 'produk', 'stok', 'produksi', 'qc', 'pembelian', 'konsinyasi', 'piutang', 'expenses', 'crm', 'purnajual', 'faktur', 'laporan', 'pengaturan'];
  const perms = {
    'Admin': {},
    'Kasir': {},
    'QC': {},
    'Koordinator': {}
  };
  modules.forEach(function (m) {
    perms['Admin'][m] = Object.assign({}, defaultAll);
    perms['Koordinator'][m] = Object.assign({}, viewOnly);
    perms['QC'][m] = (['dashboard', 'qc', 'stok', 'produksi'].indexOf(m) !== -1) ? Object.assign({}, defaultAll) : Object.assign({}, viewOnly);
    perms['Kasir'][m] = (['dashboard', 'pos', 'produk', 'faktur', 'crm', 'purnajual'].indexOf(m) !== -1) ? Object.assign({}, defaultAll) : Object.assign({}, viewOnly);
    perms['Finance'] = perms['Finance'] || {};
    perms['Finance'][m] = (['dashboard', 'laporan', 'piutang', 'expenses', 'faktur', 'pembelian', 'konsinyasi', 'pengaturan'].indexOf(m) !== -1) ? Object.assign({}, defaultAll) : Object.assign({}, viewOnly);
  });
  return perms;
}

function getDefaultUsersFallback() {
  return [
    { id: 'admin', username: 'admin', name: 'Administrator Utama', full_name: 'Administrator Utama', role: 'Admin', created_at: '2024-01-01 08:00' },
    { id: 'kasir', username: 'kasir', name: 'Staf Kasir Toko', full_name: 'Staf Kasir Toko', role: 'Kasir', created_at: '2024-01-15 09:30' },
    { id: 'finance', username: 'finance', name: 'Staf Bagian Keuangan', full_name: 'Staf Bagian Keuangan', role: 'Finance', created_at: '2024-03-15 08:30' },
    { id: 'qc_staff', username: 'qc_staff', name: 'Operator Quality Control', full_name: 'Operator Quality Control', role: 'QC', created_at: '2024-02-10 11:15' },
    { id: 'koordinator', username: 'koordinator', name: 'Koordinator Lapangan & Evaluasi', full_name: 'Koordinator Lapangan & Evaluasi', role: 'Koordinator', created_at: '2024-03-01 14:00' }
  ];
}

function drawPengaturanUI(settings) {
  const content = document.getElementById('content');
  if (!content) return;

  const currentLogo = settings['store_logo'] || '';
  const currentLogoLight = settings['store_logo_light'] || '';
  const currentStamp = settings['store_stamp'] || '';
  const isUserAdmin = isAdmin();
  const activeTab = (CURRENT_SETTINGS_SUBTAB === 'pricing') ? 'batch' : (CURRENT_SETTINGS_SUBTAB || 'profile');
  const currentTimeoutMin = String(
    settings['session_timeout_minutes'] !== undefined && settings['session_timeout_minutes'] !== ''
      ? settings['session_timeout_minutes']
      : getSessionTimeoutMinutes()
  );

  content.innerHTML =
    '<div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">' +
    '<div>' +
    '<h1 class="page-title">Pengaturan Sistem</h1>' +
    '<p class="page-subtitle">Konfigurasi profil toko, tarif pajak, format batch &amp; preset multi-tier, hak akses peran, akun pengguna, dan notifikasi langsung ke HP.</p>' +
    '</div>' +
    '<div class="page-actions">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openModuleGuide(\'pengaturan\')" title="Buka Panduan Konfigurasi Sistem"><i class="fas fa-book-open" style="margin-right:5px;"></i>📖 Panduan Pengaturan</button>' +
    '</div>' +
    '</div>' +

    '<!-- SUB-NAVIGASI TAB PENGATURAN -->' +
    '<div class="settings-tabs-wrapper nav-tabs" style="display:flex;gap:8px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:12px;flex-wrap:wrap;">' +
    '<button type="button" id="tab-set-btn-profile" class="settings-tab-btn btn btn-sm ' + (activeTab === 'profile' ? 'btn-primary active' : 'btn-secondary') + '" data-tab="profile" onclick="switchSettingTab(\'profile\')">🏪 Profil Toko &amp; Pajak</button>' +
    '<button type="button" id="tab-set-btn-batch" class="settings-tab-btn btn btn-sm ' + (activeTab === 'batch' ? 'btn-primary active' : 'btn-secondary') + '" data-tab="batch" onclick="switchSettingTab(\'batch\')">🏷️ Format Batch &amp; Multi-Tier</button>' +
    '<button type="button" id="tab-set-btn-roles" class="settings-tab-btn btn btn-sm ' + (activeTab === 'roles' ? 'btn-primary active' : 'btn-secondary') + '" data-tab="roles" onclick="switchSettingTab(\'roles\')">🔐 Hak Akses &amp; Peran</button>' +
    '<button type="button" id="tab-set-btn-users" class="settings-tab-btn btn btn-sm ' + (activeTab === 'users' ? 'btn-primary active' : 'btn-secondary') + '" data-tab="users" onclick="switchSettingTab(\'users\')">👥 Akun Pengguna</button>' +
    '<button type="button" id="tab-set-btn-notif" class="settings-tab-btn btn btn-sm ' + (activeTab === 'notif' ? 'btn-primary active' : 'btn-secondary') + '" data-tab="notif" onclick="switchSettingTab(\'notif\')">📲 Notifikasi HP</button>' +
    '<button type="button" id="tab-set-btn-telegram" class="settings-tab-btn btn btn-sm ' + (activeTab === 'telegram' ? 'btn-primary active' : 'btn-secondary') + '" data-tab="telegram" onclick="switchSettingTab(\'telegram\')">🤖 Bot Telegram</button>' +
    '<button type="button" id="tab-set-btn-katalog" class="settings-tab-btn btn btn-sm ' + (activeTab === 'katalog' ? 'btn-primary active' : 'btn-secondary') + '" data-tab="katalog" onclick="switchSettingTab(\'katalog\')">🌐 Katalog Online</button>' +
    '</div>' +

    '<div id="pane-profile" class="setting-pane" style="display:' + (activeTab === 'profile' ? 'block' : 'none') + ';">' +
    '<div class="settings-cards-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;">' +
    '<div class="card">' +
    '<h3 style="margin-bottom:16px;">Profil Toko &amp; Pajak</h3>' +
    '<div class="field-group">' +
    '<label class="field-label">Logo Utama (Full Color / Layar Login &amp; Struk)</label>' +
    '<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:6px;">' +
    '<div class="logo-preview-box" id="setting-logo-preview" style="background:#fff;border:1px solid var(--border);width:80px;height:80px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-xs);overflow:hidden;">' +
    (currentLogo ? '<img src="' + escapeHtml(currentLogo) + '" alt="Logo Terpasang" style="max-width:100%;max-height:100%;object-fit:contain;">' : '<span style="font-size:10px;color:var(--text-muted);text-align:center;">Belum Ada</span>') +
    '</div>' +
    '<div style="flex:1;min-width:180px;">' +
    '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">' +
    '<label class="btn btn-secondary btn-sm" style="cursor:pointer;">📁 Upload<input type="file" id="set-logo-file" accept="image/*" style="display:none;" onchange="handleLogoFileUpload(this, \'set-store-logo\', \'setting-logo-preview\')"></label>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="clearLogoSetting(\'set-store-logo\', \'set-logo-file\', \'setting-logo-preview\')">Hapus</button>' +
    '</div>' +
    '<div class="input-wrapper"><input type="text" id="set-store-logo" placeholder="Atau paste link URL logo warna..." value="' + escapeHtml(currentLogo) + '" oninput="updateLogoPreview(this.value, \'setting-logo-preview\')" style="padding-left:14px;font-size:12px;"></div>' +
    '<small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Digunakan untuk layar login, faktur minimalis, dan struk kasir.</small>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label">Logo Sekunder (Putih/Monokrom / Sidebar &amp; Faktur Formal)</label>' +
    '<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:6px;">' +
    '<div class="logo-preview-box" id="setting-logo-light-preview" style="background:var(--primary);border:1px solid var(--border);width:80px;height:80px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-xs);overflow:hidden;">' +
    (currentLogoLight ? '<img src="' + escapeHtml(currentLogoLight) + '" alt="Logo Terpasang" style="max-width:100%;max-height:100%;object-fit:contain;">' : '<span style="font-size:10px;color:#fff;text-align:center;opacity:0.8;">Belum Ada</span>') +
    '</div>' +
    '<div style="flex:1;min-width:180px;">' +
    '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">' +
    '<label class="btn btn-secondary btn-sm" style="cursor:pointer;">📁 Upload<input type="file" id="set-logo-light-file" accept="image/*" style="display:none;" onchange="handleLogoFileUpload(this, \'set-store-logo-light\', \'setting-logo-light-preview\')"></label>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="clearLogoSetting(\'set-store-logo-light\', \'set-logo-light-file\', \'setting-logo-light-preview\')">Hapus</button>' +
    '</div>' +
    '<div class="input-wrapper"><input type="text" id="set-store-logo-light" placeholder="Atau paste link URL logo putih/transparan..." value="' + escapeHtml(currentLogoLight) + '" oninput="updateLogoPreview(this.value, \'setting-logo-light-preview\')" style="padding-left:14px;font-size:12px;"></div>' +
    '<small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Digunakan untuk menu samping (sidebar hijau tua) dan kop faktur formal.</small>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label">Cap / Stempel Resmi Toko (Stempel Digital Faktur Formal)</label>' +
    '<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:6px;">' +
    '<div class="logo-preview-box" id="setting-stamp-preview" style="background:#fff;border:1px dashed var(--border);width:80px;height:80px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-xs);overflow:hidden;padding:4px;">' +
    (currentStamp ? '<img src="' + escapeHtml(currentStamp) + '" alt="Cap Toko" style="max-width:100%;max-height:100%;object-fit:contain;transform:rotate(-10deg);">' : '<span style="font-size:10px;color:var(--text-muted);text-align:center;">Stempel Digital Resmi</span>') +
    '</div>' +
    '<div style="flex:1;min-width:180px;">' +
    '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">' +
    '<label class="btn btn-secondary btn-sm" style="cursor:pointer;">📁 Upload Cap (PNG Transparan)<input type="file" id="set-stamp-file" accept="image/*" style="display:none;" onchange="handleLogoFileUpload(this, \'set-store-stamp\', \'setting-stamp-preview\')"></label>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="clearLogoSetting(\'set-store-stamp\', \'set-stamp-file\', \'setting-stamp-preview\')">Gunakan Default</button>' +
    '</div>' +
    '<div class="input-wrapper"><input type="text" id="set-store-stamp" placeholder="Atau paste link URL cap stempel..." value="' + escapeHtml(currentStamp) + '" oninput="updateLogoPreview(this.value, \'setting-stamp-preview\')" style="padding-left:14px;font-size:12px;"></div>' +
    '<small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Gunakan file PNG dengan background transparan. Jika dikosongkan, faktur otomatis memakai Stempel Resmi Digital Manajemen Keuangan.</small>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="field-group"><label class="field-label">Nama Toko / Kios</label><div class="input-wrapper"><input type="text" id="set-store-name" value="' + escapeHtml(settings['store_name'] || '') + '" style="padding-left:14px;"></div></div>' +
    '<div class="field-group"><label class="field-label">Alamat Lengkap</label><div class="input-wrapper"><input type="text" id="set-store-address" value="' + escapeHtml(settings['store_address'] || '') + '" style="padding-left:14px;"></div></div>' +
    '<div class="field-group"><label class="field-label">Kontak WhatsApp</label><div class="input-wrapper"><input type="text" id="set-store-phone" value="' + escapeHtml(settings['store_phone'] || '') + '" style="padding-left:14px;"></div></div>' +
    '<div class="field-group"><label class="field-label">Email Resmi Toko</label><div class="input-wrapper"><input type="email" id="set-store-email" placeholder="Contoh: toko@domain.com" value="' + escapeHtml(settings['store_email'] || '') + '" style="padding-left:14px;"></div><small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Tampil pada kop faktur penjualan, kuitansi kasir, dan surat jalan.</small></div>' +
    '<div class="field-group" style="padding:12px 14px;background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-xs);margin-bottom:12px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">' +
    '<label class="field-label" style="margin:0;">Rekening Bank Kios</label>' +
    '<button type="button" id="btn-unlock-bank-settings" class="btn btn-secondary btn-sm" onclick="unlockBankSettings()" style="white-space:nowrap;">🔒 Buka Kunci Rekening</button>' +
    '</div>' +
    '<div class="field-group" style="margin-bottom:10px;"><label class="field-label">Nama Bank</label><div class="input-wrapper"><input type="text" id="set-bank-name" value="' + escapeHtml(settings['bank_name'] || 'BNI') + '" disabled="true" style="padding-left:14px;opacity:0.7;cursor:not-allowed;"></div></div>' +
    '<div class="field-group" style="margin-bottom:10px;"><label class="field-label">Nomor Rekening</label><div class="input-wrapper"><input type="text" id="set-bank-account" value="' + escapeHtml(settings['bank_account'] || '0178 849 203') + '" disabled="true" style="padding-left:14px;opacity:0.7;cursor:not-allowed;"></div></div>' +
    '<div class="field-group" style="margin-bottom:0;"><label class="field-label">Atas Nama</label><div class="input-wrapper"><input type="text" id="set-bank-account-name" value="' + escapeHtml(settings['bank_account_name'] || 'Rekening Toko') + '" disabled="true" style="padding-left:14px;opacity:0.7;cursor:not-allowed;"></div></div>' +
    '</div>' +
    '<div class="field-group"><label class="field-label">Tarif Pajak (PPN %)</label><div class="input-wrapper"><input type="number" id="set-tax-rate" value="' + escapeHtml(settings['tax_rate'] !== undefined ? settings['tax_rate'] : '0') + '" min="0" max="100" step="0.1" style="padding-left:14px;"></div><small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Persentase pajak yang dikenakan pada transaksi (misal: 0 untuk bebas pajak atau 11 untuk PPN 11%).</small></div>' +
    '<div class="field-group"><label class="field-label">Target Omzet Harian (Rp)</label><div class="input-wrapper"><input type="number" id="set-daily-target" value="' + escapeHtml(settings['daily_target'] || '5000000') + '" min="0" step="100000" style="padding-left:14px;"></div><small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Target penjualan harian yang menjadi acuan persentase lingkaran (KPI Gauge) di Dashboard.</small></div>' +
    '<div class="field-group"><label class="field-label">Catatan Kaki Faktur</label><div class="input-wrapper"><input type="text" id="set-invoice-footer" value="' + escapeHtml(settings['invoice_footer'] || 'Terima kasih atas kunjungan Anda!') + '" style="padding-left:14px;"></div></div>' +
    '<button type="button" class="btn btn-primary" onclick="saveStoreSettings()">Simpan Profil Toko &amp; Pajak</button>' +
    '</div>' +
    '<div class="card" style="margin-top:16px;">' +
    '<h3 style="margin-bottom:6px;">🌐 Bahasa Antarmuka (Language Settings)</h3>' +
    '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">Pilih bahasa tampilan untuk menu, kasir, formulir, struk belanja, dan laporan:</p>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
    '<button type="button" class="btn ' + (window.i18n && window.i18n.getLanguage() === 'id' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" onclick="window.i18n && window.i18n.setLanguage(\'id\')">🇮🇩 Bahasa Indonesia (Standar)</button>' +
    '<button type="button" class="btn ' + (window.i18n && window.i18n.getLanguage() === 'en' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" onclick="window.i18n && window.i18n.setLanguage(\'en\')">🇬🇧 English (International)</button>' +
    '</div>' +
    '</div>' +
    '<div class="card" style="margin-top:16px;">' +
    '<h3 style="margin-bottom:6px;">⏱️ Keamanan Sesi &amp; Auto-Logout</h3>' +
    '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">Akhiri sesi login secara otomatis apabila tidak ada aktivitas di aplikasi untuk melindungi keamanan kasir dan data stok:</p>' +
    '<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">' +
    '<div class="field-group" style="margin-bottom:0;flex:1;min-width:220px;">' +
    '<label class="field-label" for="set-session-timeout">Batas Waktu Tanpa Aktivitas (Idle Timeout)</label>' +
    '<div class="input-wrapper">' +
    '<select id="set-session-timeout" style="padding-left:14px;width:100%;">' +
    '<option value="15"' + (currentTimeoutMin === '15' ? ' selected' : '') + '>15 Menit (Keamanan Ketat)</option>' +
    '<option value="30"' + (currentTimeoutMin === '30' ? ' selected' : '') + '>30 Menit (Standar Rekomendasi)</option>' +
    '<option value="60"' + (currentTimeoutMin === '60' ? ' selected' : '') + '>60 Menit (1 Jam)</option>' +
    '<option value="120"' + (currentTimeoutMin === '120' ? ' selected' : '') + '>120 Menit (2 Jam)</option>' +
    '<option value="0"' + (currentTimeoutMin === '0' ? ' selected' : '') + '>Nonaktif (Tidak Auto-Logout)</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '<button type="button" class="btn btn-primary btn-sm" onclick="saveSessionTimeoutSettings()" style="height:40px;padding:0 18px;">💾 Simpan Durasi Sesi</button>' +
    '</div>' +
    '<small style="color:var(--text-muted);font-size:11px;margin-top:8px;display:block;">Sistem akan menampilkan peringatan hitung mundur 60 detik sebelum mengeluarkan akun secara otomatis.</small>' +
    '</div>' +
    '</div>' +
    '</div>' +

    '<div id="pane-batch" class="setting-pane" style="display:' + (activeTab === 'batch' ? 'block' : 'none') + ';">' +
    '<div class="card" style="margin-bottom:16px;">' +
    '<h3 style="margin-bottom:6px;">Format Kode Batch FIFO</h3>' +
    '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;">Template otomatis untuk menghasilkan kode lot/batch benih saat pembelian atau produksi.</p>' +
    '<div class="field-group"><label class="field-label">Template Format Kode Batch</label><div class="input-wrapper"><input type="text" id="set-batch-format" value="' + escapeHtml(settings['batch_format_template'] || settings['batch_format'] || 'BATCH-{CODE}-{YYMM}-{SEQ}') + '" style="padding-left:14px;font-family:\'JetBrains Mono\',monospace;"></div><small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Format standar: <code>BATCH-{CODE}-{YYMM}-{SEQ}</code>. Token dinamis: <code>{CODE}</code> (singkatan varietas, misal BYM/KGL), <code>{YYMM}</code> (tahun-bulan kadaluarsa), <code>{SEQ}</code> (urutan 001). Contoh: <code>BATCH-BYM-2611-001</code>.</small></div>' +
    '</div>' +
    '<div class="card">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">' +
    '<div><h3 style="margin-bottom:4px;">Preset Tingkat Harga (Multi-Tier)</h3><p style="font-size:12px;color:var(--text-secondary);margin:0;">Standarisasi tingkatan harga jual produk dan penomoran batch.</p></div>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="addPriceTierPresetRow()">+ Tambah Preset Tier Baru</button>' +
    '</div>' +
    '<div class="table-container" style="overflow-x:auto;"><table style="width:100%;margin-bottom:0;"><thead><tr><th style="width:45%;padding:10px 14px;">Nama Tingkat Harga (Tier)</th><th style="width:40%;padding:10px 14px;">Nominal Bawaan / Default (Rp)</th><th style="width:15%;text-align:center;padding:10px 14px;">Aksi</th></tr></thead><tbody id="price-tier-presets-body"></tbody></table></div>' +
    '<div style="margin-top:16px;display:flex;justify-content:flex-end;"><button type="button" class="btn btn-primary" onclick="saveStoreSettings()">💾 Simpan Format Batch &amp; Multi-Tier</button></div>' +
    '</div>' +
    '</div>' +

    '<div id="pane-roles" class="setting-pane" style="display:' + (activeTab === 'roles' ? 'block' : 'none') + ';">' +
    '<div class="card" id="role-matrix-container" style="border-radius: var(--radius-md); padding: 20px;"></div>' +
    '</div>' +

    '<div id="pane-users" class="setting-pane" style="display:' + (activeTab === 'users' ? 'block' : 'none') + ';">' +
    '<div class="card" id="users-management-container" style="border-radius: var(--radius-md); padding: 20px;"></div>' +
    '</div>' +

    '<div id="pane-notif" class="setting-pane" style="display:' + (activeTab === 'notif' ? 'block' : 'none') + ';">' +
    (typeof buildNotifSettingsPaneHTML === 'function' ? buildNotifSettingsPaneHTML(settings) : '') +
    '</div>' +

    '<!-- PANE KATALOG ONLINE -->' +
    '<div id="pane-katalog" class="setting-pane" style="display:' + (activeTab === 'katalog' ? 'block' : 'none') + ';">' +
    '<div class="settings-cards-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;">' +
    '  <div class="card">' +
    '    <h3 style="margin-bottom:14px;display:flex;align-items:center;gap:8px;"><i class="fas fa-sliders-h" style="color:var(--primary);"></i> Konfigurasi Katalog Online</h3>' +
    '    <p style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;">Atur informasi yang akan dibaca oleh pelanggan umum pada halaman katalog publik:</p>' +
    '    <div class="field-group"><label class="field-label">Nama / Judul Toko di Katalog</label><div class="input-wrapper"><input type="text" id="set-cat-title" value="' + escapeHtml(settings['catalog_title'] || settings['store_name'] || '') + '" placeholder="Contoh: Kios Pertanian Lestari" style="padding-left:14px;"></div></div>' +
    '    <div class="field-group"><label class="field-label">Tagline / Slogan Toko</label><div class="input-wrapper"><input type="text" id="set-cat-tagline" value="' + escapeHtml(settings['store_tagline'] || '') + '" placeholder="Contoh: Pusat Benih Tanaman Lokal &amp; Edukasi Permakultur" style="padding-left:14px;"></div></div>' +
    '    <div class="field-group"><label class="field-label">Nomor WhatsApp Pemesanan</label><div class="input-wrapper"><input type="tel" id="set-cat-phone" value="' + escapeHtml(settings['store_phone'] || '') + '" placeholder="Contoh: 081945468237" style="padding-left:14px;"></div><small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Pesan otomatis dari tombol WhatsApp Checkout pelanggan akan dikirim ke nomor ini.</small></div>' +
    '    <div class="field-group"><label class="field-label">Email Toko / Layanan Pelanggan</label><div class="input-wrapper"><input type="email" id="set-cat-email" value="' + escapeHtml(settings['store_email'] || '') + '" placeholder="Contoh: toko@domain.com" style="padding-left:14px;"></div></div>' +
    '    <div class="field-group"><label class="field-label">Alamat Toko (Untuk Pengambilan Mandiri)</label><div class="input-wrapper"><input type="text" id="set-cat-address" value="' + escapeHtml(settings['store_address'] || '') + '" placeholder="Contoh: Jln. Plawa No. 10, Denpasar" style="padding-left:14px;"></div></div>' +
    '    <div class="field-group"><label class="field-label">Catatan Operasional / Pengiriman</label><div class="input-wrapper"><textarea id="set-cat-notes" class="form-textarea" placeholder="Contoh: Jam operasional toko fisik 08.00 - 17.00. Pengiriman ekspedisi dilakukan setiap sore." style="width:100%;min-height:70px;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-xs);font-size:12.5px;">' + escapeHtml(settings['catalog_notes'] || '') + '</textarea></div></div>' +
    '  <small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Dapatkan API Key gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#2563EB;font-weight:700;text-decoration:none;">Google AI Studio &nearr;</a> untuk generate foto produk pribadi tanpa batas dan tanpa antrean publik.</small>' +
    '</div>' +
    '    <button type="button" class="btn btn-primary" onclick="saveCatalogSettings()" style="margin-top:6px;"><i class="fas fa-save" style="margin-right:6px;"></i> Simpan Pengaturan Katalog</button>' +
    '  </div>' +

    '  <div class="card">' +
    '    <h3 style="margin-bottom:14px;display:flex;align-items:center;gap:8px;"><i class="fas fa-qrcode" style="color:var(--primary);"></i> Standee Meja &amp; Tautan Cepat</h3>' +
    '    <p style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;">Bagikan katalog atau cetak QR Code untuk dipajang di kasir/etalase toko:</p>' +
    '    <div style="background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:14px;">' +
    '      <div style="font-size:12px;font-weight:700;color:var(--text-main);margin-bottom:6px;">Tautan Langsung:</div>' +
    '      <div style="display:flex;gap:8px;align-items:center;">' +
    '        <input type="text" id="set-cat-url-preview" value="' + escapeHtml(getCatalogPublicUrl()) + '" readonly style="flex:1;padding:8px 10px;font-size:12px;background:rgba(15,23,42,0.9);color:var(--text-main);border:1px solid var(--border);border-radius:4px;font-family:monospace;" onclick="this.select()">' +
    '        <button type="button" class="btn btn-primary btn-sm" onclick="copyCatalogPublicUrl()"><i class="fas fa-copy"></i> Salin</button>' +
    '        <a href="' + escapeHtml(getCatalogPublicUrl()) + '" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none;"><i class="fas fa-external-link-alt"></i> Buka</a>' +
    '      </div>' +
    '    </div>' +
    '    <div style="text-align:center;padding:16px;border:1.5px dashed var(--border);border-radius:var(--radius-sm);background:var(--surface-muted);margin-bottom:14px;">' +
    '      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=' + encodeURIComponent(getCatalogPublicUrl()) + '" alt="QR Code" style="width:140px;height:140px;display:inline-block;border:1px solid #E2E8F0;border-radius:8px;padding:6px;background:#fff;">' +
    '      <div style="font-size:12px;font-weight:700;color:var(--text-main);margin-top:8px;">Standee Akrilik Meja Kasir</div>' +
    '      <div style="font-size:11px;color:var(--text-secondary);">Siap cetak dalam format A5/A6 untuk dipajang di toko</div>' +
    '    </div>' +
    '    <button type="button" class="btn btn-primary" onclick="printCatalogStandee()" style="width:100%;font-weight:700;"><i class="fas fa-print" style="margin-right:6px;"></i> Cetak Standee Meja Kasir</button>' +
    '  </div>' +
    '</div>' +
    (typeof buildCatalogPromoSettingsHTML === 'function' ? buildCatalogPromoSettingsHTML(settings) : '') +
    '</div>' +

    '<div id="pane-telegram" class="setting-pane" style="display:' + (activeTab === 'telegram' ? 'block' : 'none') + ';">' +
    '<div class="card" style="border-radius: var(--radius-md); padding: 20px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">' +
    '<div>' +
    '<h3 style="margin:0 0 4px 0;color:var(--text-main);font-size:18px;font-weight:700;">🤖 Integrasi Bot Telegram</h3>' +
    '<p class="text-muted" style="margin:0;font-size:13px;color:#6B7280;">Hubungkan sistem dengan Bot Telegram untuk notifikasi otomatis instan ke pengelola.</p>' +
    '</div>' +
    '<div id="telegram-status-badge">' +
    '<span style="background: rgba(16,185,129,0.15); color: #34D399; border: 1px solid rgba(16,185,129,0.3); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">🟢 Aktif Terhubung</span>' +
    '</div>' +
    '</div>' +
    '<div class="field-group" style="margin-bottom:16px;">' +
    '<label class="field-label" style="display:block;font-weight:600;margin-bottom:6px;font-size:13px;color:var(--text-main);">Telegram Bot Token</label>' +
    '<input type="text" id="set-tg-token" class="input-field" value="' + escapeHtml(settings['telegram_bot_token'] || '') + '" placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-family:monospace; font-size:13px; box-sizing:border-box; background:var(--surface); color:var(--text-main);">' +
    '<small style="color:var(--text-secondary);font-size:12px;margin-top:4px;display:block;">Dapatkan token dari @BotFather di aplikasi Telegram saat membuat bot baru.</small>' +
    '</div>' +
    '<div class="field-group" style="margin-bottom:16px;">' +
    '<label class="field-label" style="display:block;font-weight:600;margin-bottom:6px;font-size:13px;color:var(--text-main);">Telegram Chat ID / Group ID</label>' +
    '<input type="text" id="set-tg-chat-id" class="input-field" value="' + escapeHtml(settings['telegram_chat_id'] || '') + '" placeholder="Contoh: -1001234567890 atau 12345678" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color:var(--text-main); font-family:monospace; font-size:13px; box-sizing:border-box;">' +
    '<small style="color:var(--text-secondary);font-size:12px;margin-top:4px;display:block;">ID obrolan pribadi atau ID grup tempat notifikasi akan dikirimkan (gunakan bot @userinfobot atau sejenis).</small>' +
    '</div>' +
    '<div style="background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3); padding: 16px; border-radius: 8px; margin-top: 20px;">' +
    '<h4 style="margin:0 0 12px 0;color:#FBBF24;font-size:14px;font-weight:700;">Pilihan Notifikasi Otomatis (Push Alerts)</h4>' +
    '<div style="display:flex;flex-direction:column;gap:10px;">' +
    '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;color:var(--text-main);">' +
    '<input type="checkbox" id="set-tg-notif-void" ' + (settings['telegram_notif_void'] === 'false' ? '' : 'checked') + ' style="width:16px;height:16px;accent-color:var(--primary);">' +
    '<span><strong>Alert Void Transaksi:</strong> Beritahu administrator seketika saat ada pembatalan / void nota transaksi kasir.</span>' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;color:var(--text-main);">' +
    '<input type="checkbox" id="set-tg-notif-dht" ' + (settings['telegram_notif_dht'] === 'false' ? '' : 'checked') + ' style="width:16px;height:16px;accent-color:var(--primary);">' +
    '<span><strong>Pengingat Oven DHT:</strong> Peringatan jatuh tempo proses pengeringan / oven benih DHT.</span>' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;color:var(--text-main);">' +
    '<input type="checkbox" id="set-tg-notif-qc" ' + (settings['telegram_notif_qc'] === 'false' ? '' : 'checked') + ' style="width:16px;height:16px;accent-color:var(--primary);">' +
    '<span><strong>Karantina QC:</strong> Peringatan saat ada lot benih atau bahan baku yang berstatus karantina / afkir QC.</span>' +
    '</label>' +
    '</div>' +
    '</div>' +
    '<div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;">' +
    '<button type="button" id="btn-save-tg" class="btn btn-primary" onclick="saveTelegramSettings()">Simpan Pengaturan Telegram</button>' +
    '<button type="button" id="btn-test-tg" class="btn btn-secondary" onclick="testTelegramConnectionUI()">🔔 Uji Kirim Notifikasi</button>' +
    '</div>' +
    '</div>' +
    '</div>' +

    (isUserAdmin
      ? '<div id="panel-set-danger" style="display:' + (activeTab === 'danger' ? 'block' : 'none') + ';">' +
      '<div class="card card-danger-zone">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">' +
      '<div>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
      '<span style="font-size:20px;">🚨</span>' +
      '<h3 style="margin:0;color:#b91c1c;">Zona Bahaya / Pembersihan Data Uji Coba</h3>' +
      '</div>' +
      '<p style="font-size:12.5px;color:#7f1d1d;margin:6px 0 0 0;line-height:1.4;">Gunakan fitur ini untuk menghapus seluruh riwayat transaksi simulasi. Data master produk dan pengaturan tidak akan terhapus.</p>' +
      '</div>' +
      '<button type="button" class="btn btn-danger" onclick="openResetDataModal()" style="white-space:nowrap;display:inline-flex;align-items:center;gap:6px;">🗑️ Buka Panel Reset Data</button>' +
      '</div>' +
      '</div>' +
      '</div>'
      : '');

  // Inisialisasi baris preset tingkat harga
  let currentPresets = [];
  try {
    if (typeof settings['price_tiers_preset'] === 'string' && settings['price_tiers_preset'].trim()) {
      currentPresets = JSON.parse(settings['price_tiers_preset']);
    } else if (Array.isArray(settings['price_tiers_preset'])) {
      currentPresets = settings['price_tiers_preset'];
    }
  } catch (e) {
    currentPresets = [];
  }
  if (!Array.isArray(currentPresets) || currentPresets.length === 0) {
    currentPresets = getDefaultPriceTierPresets();
  }

  const tbody = document.getElementById('price-tier-presets-body');
  if (tbody) {
    tbody.innerHTML = '';
    currentPresets.forEach(function (p) {
      addPriceTierPresetRow(p.name, p.price, p.default);
    });
  }

  if (settings && settings['role_permissions']) {
    try {
      const parsedPerms = typeof settings['role_permissions'] === 'string'
        ? JSON.parse(settings['role_permissions'])
        : settings['role_permissions'];
      const resolvedPerms = (parsedPerms && parsedPerms.permissions && typeof parsedPerms.permissions === 'object')
        ? parsedPerms.permissions
        : parsedPerms;
      if (resolvedPerms && typeof resolvedPerms === 'object' && !Array.isArray(resolvedPerms)) {
        CURRENT_ROLES_PERMISSIONS = resolvedPerms;
        AVAILABLE_ROLES = Object.keys(resolvedPerms);
        setSafeSession('ekasir_available_roles', JSON.stringify(AVAILABLE_ROLES));
      }
    } catch (e) { }
  }
  if (!CURRENT_ROLES_PERMISSIONS) {
    CURRENT_ROLES_PERMISSIONS = getDefaultRolesPermissions();
  }
  renderRoleMatrixUI();
  loadRolePermissionsUI();
  loadUsersManagementUI();

  if (window.i18n && typeof window.i18n.translateDOM === 'function') {
    window.i18n.translateDOM(content);
  }
}

function addPriceTierPresetRow(name, price, isDefault) {
  const tbody = document.getElementById('price-tier-presets-body');
  if (!tbody) return;
  const isReg = (name || '').toLowerCase() === 'reguler';
  const tr = document.createElement('tr');
  tr.className = 'preset-tier-row';
  tr.innerHTML =
    '<td style="padding:8px 12px;">' +
    '<div style="display:flex;align-items:center;gap:8px;">' +
    '<input type="text" class="field-input preset-tier-name" value="' + escapeHtml(name || '') + '" placeholder="Misal: Reguler / Outlet / Grosir" style="width:100%;font-weight:600;padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    (isReg ? '<span class="badge badge-success" style="font-size:10px;white-space:nowrap;">Default POS</span>' : '') +
    '</div>' +
    '</td>' +
    '<td style="padding:8px 12px;">' +
    '<div class="input-wrapper" style="position:relative;">' +
    '<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--text-muted);font-weight:600;">Rp</span>' +
    '<input type="number" class="field-input preset-tier-price" value="' + (price !== undefined && price !== null && price !== '' ? Number(price) : '') + '" placeholder="0" min="0" step="100" style="width:100%;padding-left:32px;font-family:\'JetBrains Mono\',monospace;font-weight:700;padding-top:6px;padding-bottom:6px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '</div>' +
    '</td>' +
    '<td style="text-align:center;padding:8px 12px;">' +
    (isReg
      ? '<span style="font-size:11px;color:var(--text-muted);font-style:italic;">Tier Utama</span>'
      : '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--danger);padding:4px 8px;" onclick="this.closest(\'tr\').remove()" title="Hapus Tier">🗑️ Hapus</button>') +
    '</td>';
  tbody.appendChild(tr);
}

// ========================= MATRIKS HAK AKSES (ROLES & PERMISSIONS) =========================
function loadRolePermissionsUI() {
  const container = document.getElementById('role-matrix-container');
  if (!container) return;
  if (!CURRENT_ROLES_PERMISSIONS) {
    CURRENT_ROLES_PERMISSIONS = getDefaultRolesPermissions();
  }
  renderRoleMatrixUI();

  api('getRolePermissions', TOKEN).then(function (res) {
    if (res && res.permissions && typeof res.permissions === 'object') {
      CURRENT_ROLES_PERMISSIONS = res.permissions;
      AVAILABLE_ROLES = Array.isArray(res.roles) && res.roles.length > 0 ? res.roles : Object.keys(res.permissions);
      setSafeSession('ekasir_available_roles', JSON.stringify(AVAILABLE_ROLES));
      if (APP_SETTINGS && typeof APP_SETTINGS === 'object') {
        APP_SETTINGS['role_permissions'] = JSON.stringify(CURRENT_ROLES_PERMISSIONS);
      }
      renderRoleMatrixUI();
    } else if (res && typeof res === 'object' && !res.error) {
      CURRENT_ROLES_PERMISSIONS = res;
      AVAILABLE_ROLES = Object.keys(res);
      setSafeSession('ekasir_available_roles', JSON.stringify(AVAILABLE_ROLES));
      renderRoleMatrixUI();
    }
  }).catch(function (err) {
    console.warn('Gagal memuat hak akses dari server, menggunakan matriks lokal:', err);
  });
}

function renderRoleMatrixUI() {
  const container = document.getElementById('role-matrix-container');
  if (!container) return;
  if (!CURRENT_ROLES_PERMISSIONS) {
    CURRENT_ROLES_PERMISSIONS = getDefaultRolesPermissions();
  }

  const preferredOrder = ['Admin', 'Kasir', 'Finance', 'QC', 'Koordinator'];
  const existingKeys = Object.keys(CURRENT_ROLES_PERMISSIONS);
  const roles = [];
  preferredOrder.forEach(function (k) {
    if (existingKeys.indexOf(k) !== -1) roles.push(k);
  });
  existingKeys.forEach(function (k) {
    if (roles.indexOf(k) === -1) roles.push(k);
  });

  if (!CURRENT_ROLES_PERMISSIONS[CURRENT_SELECTED_ROLE_TAB]) {
    CURRENT_SELECTED_ROLE_TAB = roles[0] || 'Admin';
  }

  const roleName = CURRENT_SELECTED_ROLE_TAB;
  const perms = CURRENT_ROLES_PERMISSIONS[roleName] || {};

  const moduleNames = {
    'dashboard': 'Dashboard Ringkasan',
    'pos': 'Kasir (POS)',
    'produk': 'Katalog Produk',
    'stok': 'Stok & Batch FIFO',
    'produksi': 'Kemas Mandiri (Produksi)',
    'qc': 'Quality Control (QC)',
    'pembelian': 'Pembelian Stok',
    'konsinyasi': 'Konsinyasi Mitra',
    'piutang': 'Piutang & Tempo',
    'expenses': 'Biaya & Pengeluaran',
    'crm': 'Pelanggan (CRM)',
    'purnajual': 'Purna Jual & Kepuasan',
    'faktur': 'Riwayat Transaksi & Faktur',
    'laporan': 'Laporan & Valuasi Stok',
    'pengaturan': 'Pengaturan Sistem'
  };

  const headerHtml =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">' +
    '<div>' +
    '<h3 style="margin:0 0 4px 0;color:var(--text-main);font-size:18px;font-weight:700;">Konfigurasi Hak Akses &amp; Peran</h3>' +
    '<p style="margin:0;font-size:13px;color:var(--text-secondary);">Kelola hak otorisasi matriks modul per jabatan pengguna sistem.</p>' +
    '</div>' +
    '</div>';

  let roleTabsHtml = '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">';
  roles.forEach(function (r) {
    const isActive = r === roleName;
    const btnStyle = isActive
      ? 'background:#5C3A21;color:#ffffff;border:1px solid #5C3A21;border-radius:6px;padding:8px 16px;font-weight:600;font-size:13px;cursor:pointer;'
      : 'background:#ffffff;color:#5C3A21;border:1px solid #D1C7BD;border-radius:6px;padding:8px 16px;font-weight:500;font-size:13px;cursor:pointer;';
    const labelText = (r === 'Koordinator') ? 'Koordinator (View-Only)' : r;
    roleTabsHtml += '<button type="button" class="btn" style="' + btnStyle + '" onclick="selectRoleTab(\'' + escapeHtml(r) + '\')">' +
      escapeHtml(labelText) +
      '</button>';
  });
  roleTabsHtml += '<button type="button" class="btn" onclick="openRoleModal()" style="background:transparent;color:#5C3A21;border:1px dashed #5C3A21;border-radius:6px;padding:8px 16px;font-weight:600;font-size:13px;cursor:pointer;">+ Tambah Peran Baru</button>';
  roleTabsHtml += '</div>';

  let roleDesc = '';
  if (roleName === 'Admin') {
    roleDesc = '<div style="color:#22D3EE;background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.3);border-radius:6px;padding:12px 16px;font-size:13px;margin-bottom:18px;line-height:1.5;">💡 <strong>Administrator:</strong> <span>Memiliki akses penuh (Lihat, Input/Ubah, Hapus) pada seluruh modul sistem demi integritas dan kelancaran operasional.</span></div>';
  } else if (roleName === 'Koordinator') {
    roleDesc = '<div style="color:#22D3EE;background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.3);border-radius:6px;padding:12px 16px;font-size:13px;margin-bottom:18px;line-height:1.5;">👁️ <strong>Koordinator Program:</strong> <span>Memiliki hak akses baca/pantau (View-Only) ke seluruh modul, tanpa izin memodifikasi atau menghapus data.</span></div>';
  } else if (roleName === 'Kasir') {
    roleDesc = '<div style="color:#22D3EE;background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.3);border-radius:6px;padding:12px 16px;font-size:13px;margin-bottom:18px;line-height:1.5;">🛒 <strong>Staf Kasir:</strong> <span>Atur centang izin akses operasional kasir, katalog produk, pelanggan, dan faktur transaksi.</span></div>';
  } else if (roleName === 'QC') {
    roleDesc = '<div style="color:#22D3EE;background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.3);border-radius:6px;padding:12px 16px;font-size:13px;margin-bottom:18px;line-height:1.5;">🔬 <strong>Quality Control (QC):</strong> <span>Atur centang izin akses pengujian mutu benih, stok batch FIFO, dan kemas mandiri.</span></div>';
  } else {
    roleDesc = '<div style="color:#22D3EE;background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.3);border-radius:6px;padding:12px 16px;font-size:13px;margin-bottom:18px;line-height:1.5;">🔐 <span>Atur centang izin akses per modul untuk peran</span> <strong>' + escapeHtml(roleName) + '</strong>.</div>';
  }

  let tableHtml =
    '<div class="table-responsive" style="overflow-x:auto;">' +
    '<table class="data-table" style="width:100%;border-collapse:collapse;margin-bottom:0;">' +
    '<thead>' +
    '<tr>' +
    '<th style="width:50px;text-align:center;padding:12px 14px;">NO</th>' +
    '<th style="text-align:left;padding:12px 14px;">MODUL SISTEM</th>' +
    '<th style="width:130px;text-align:center;padding:12px 14px;">[LIHAT]</th>' +
    '<th style="width:140px;text-align:center;padding:12px 14px;">[INPUT/UBAH]</th>' +
    '<th style="width:140px;text-align:center;padding:12px 14px;">[HAPUS/BATAL]</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody id="roles-matrix-body">';

  const modules = Object.keys(moduleNames);
  modules.forEach(function (mKey, idx) {
    const mod = perms[mKey] || { can_view: false, can_edit: false, can_delete: false };
    const isAdminRole = roleName === 'Admin';
    const isKoordinator = roleName === 'Koordinator';

    const viewChecked = isAdminRole || isKoordinator || !!mod.can_view;
    const editChecked = isAdminRole ? true : (isKoordinator ? false : !!mod.can_edit);
    const delChecked = isAdminRole ? true : (isKoordinator ? false : !!mod.can_delete);

    const viewDisabled = isAdminRole || isKoordinator;
    const editDisabled = isAdminRole || isKoordinator;
    const delDisabled = isAdminRole || isKoordinator;
    const chkStyle = 'width:16px;height:16px;accent-color:#5C3A21;' + (viewDisabled ? 'cursor:not-allowed;opacity:0.85;' : 'cursor:pointer;');

    tableHtml +=
      '<tr style="border-bottom:1px solid var(--border);">' +
      '<td style="text-align:center;color:#888;font-size:13px;padding:10px 14px;">' + (idx + 1) + '</td>' +
      '<td style="padding:10px 14px;"><strong>' + escapeHtml(moduleNames[mKey]) + '</strong> <code style="font-size:11px;color:#888;">(' + escapeHtml(mKey) + ')</code></td>' +
      '<td style="text-align:center;padding:10px 14px;">' +
      '<input type="checkbox" style="' + chkStyle + '" ' +
      (viewChecked ? 'checked ' : '') +
      (viewDisabled ? 'disabled ' : '') +
      'onchange="updateRoleMatrixPerm(\'' + escapeHtml(roleName) + '\', \'' + escapeHtml(mKey) + '\', \'can_view\', this.checked)">' +
      '</td>' +
      '<td style="text-align:center;padding:10px 14px;">' +
      '<input type="checkbox" style="' + chkStyle + '" ' +
      (editChecked ? 'checked ' : '') +
      (editDisabled ? 'disabled ' : '') +
      'onchange="updateRoleMatrixPerm(\'' + escapeHtml(roleName) + '\', \'' + escapeHtml(mKey) + '\', \'can_edit\', this.checked)">' +
      '</td>' +
      '<td style="text-align:center;padding:10px 14px;">' +
      '<input type="checkbox" style="' + chkStyle + '" ' +
      (delChecked ? 'checked ' : '') +
      (delDisabled ? 'disabled ' : '') +
      'onchange="updateRoleMatrixPerm(\'' + escapeHtml(roleName) + '\', \'' + escapeHtml(mKey) + '\', \'can_delete\', this.checked)">' +
      '</td>' +
      '</tr>';
  });

  tableHtml +=
    '</tbody>' +
    '</table>' +
    '</div>';

  const isBuiltInRole = ['Admin', 'Koordinator', 'QC', 'Kasir'].indexOf(roleName) !== -1;
  const actionButtons =
    '<div style="margin-top:18px;display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;">' +
    (!isBuiltInRole
      ? '<button type="button" class="btn btn-danger" onclick="deleteCustomRole(\'' + escapeHtml(roleName) + '\')" style="background:#FEE2E2;color:#DC2626;border:1px solid #FCA5A5;">🗑️ Hapus Peran</button>'
      : '') +
    '<button type="button" class="btn btn-primary" onclick="saveRoleMatrixSettings()">💾 Simpan Matriks Hak Akses</button>' +
    '</div>';

  container.innerHTML = headerHtml + roleTabsHtml + roleDesc + tableHtml + actionButtons;

  if (window.i18n && typeof window.i18n.translateDOM === 'function') {
    window.i18n.translateDOM(container);
  }
}

function selectRoleTab(roleName) {
  CURRENT_SELECTED_ROLE_TAB = roleName;
  renderRoleMatrixUI();
}
window.selectRoleTab = selectRoleTab;

function updateRoleMatrixPerm(roleName, moduleKey, action, checked) {
  if (!CURRENT_ROLES_PERMISSIONS || !CURRENT_ROLES_PERMISSIONS[roleName]) return;
  if (!CURRENT_ROLES_PERMISSIONS[roleName][moduleKey]) {
    CURRENT_ROLES_PERMISSIONS[roleName][moduleKey] = { can_view: false, can_edit: false, can_delete: false };
  }
  CURRENT_ROLES_PERMISSIONS[roleName][moduleKey][action] = checked;

  // Jika can_edit atau can_delete dicentang, otomatis can_view dicentang
  if ((action === 'can_edit' || action === 'can_delete') && checked) {
    CURRENT_ROLES_PERMISSIONS[roleName][moduleKey]['can_view'] = true;
    renderRoleMatrixUI();
  }
}
window.updateRoleMatrixPerm = updateRoleMatrixPerm;

function saveRoleMatrixSettings() {
  if (!CURRENT_ROLES_PERMISSIONS) return;
  const btn = typeof event !== 'undefined' && event && event.target;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Menyimpan...'; }

  api('saveRolePermissions', TOKEN, CURRENT_ROLES_PERMISSIONS).then(function () {
    AVAILABLE_ROLES = Object.keys(CURRENT_ROLES_PERMISSIONS);
    setSafeSession('ekasir_available_roles', JSON.stringify(AVAILABLE_ROLES));
    if (APP_SETTINGS && typeof APP_SETTINGS === 'object') {
      APP_SETTINGS['role_permissions'] = JSON.stringify(CURRENT_ROLES_PERMISSIONS);
    }
    invalidateCache('settings');
    showToast('Matriks hak akses berhasil disimpan!');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💾 Simpan Matriks Hak Akses';
      if (window.i18n && typeof window.i18n.translateDOM === 'function') window.i18n.translateDOM(btn);
    }
  }).catch(function (err) {
    showToast('Gagal menyimpan hak akses: ' + (err.message || err), true);
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💾 Simpan Matriks Hak Akses';
      if (window.i18n && typeof window.i18n.translateDOM === 'function') window.i18n.translateDOM(btn);
    }
  });
}
window.saveRoleMatrixSettings = saveRoleMatrixSettings;

function deleteCustomRole(roleName) {
  if (!roleName || ['Admin', 'Koordinator', 'QC', 'Kasir', 'Finance'].indexOf(roleName) !== -1) return;
  const doDelete = function () {
    if (CURRENT_ROLES_PERMISSIONS && CURRENT_ROLES_PERMISSIONS[roleName]) {
      delete CURRENT_ROLES_PERMISSIONS[roleName];
    }
    AVAILABLE_ROLES = Object.keys(CURRENT_ROLES_PERMISSIONS || {});
    setSafeSession('ekasir_available_roles', JSON.stringify(AVAILABLE_ROLES));
    if (APP_SETTINGS && typeof APP_SETTINGS === 'object') {
      APP_SETTINGS['role_permissions'] = JSON.stringify(CURRENT_ROLES_PERMISSIONS);
    }
    invalidateCache('settings');
    CURRENT_SELECTED_ROLE_TAB = 'Admin';
    renderRoleMatrixUI();
    api('saveRolePermissions', TOKEN, CURRENT_ROLES_PERMISSIONS).then(function () {
      showToast('Peran berhasil dihapus.');
    }).catch(function (err) {
      showToast('Gagal menghapus peran: ' + (err.message || err), true);
    });
  };
  if (typeof showConfirmDialog === 'function') {
    showConfirmDialog(
      'Hapus Peran',
      'Hapus peran "' + roleName + '"? Pengguna dengan peran ini perlu diatur ulang perannya.',
      doDelete,
      true
    );
    return;
  }
  if (confirm('Hapus peran "' + roleName + '"?')) doDelete();
}
window.deleteCustomRole = deleteCustomRole;

function openRoleModal() {
  const modal = document.getElementById('modal-role-entry');
  const input = document.getElementById('new-role-name');
  if (input) input.value = '';
  if (modal) {
    modal.style.display = 'flex';
    if (window.i18n && typeof window.i18n.translateDOM === 'function') {
      window.i18n.translateDOM(modal);
    }
  }
  document.body.classList.add('modal-open');
}

function closeRoleModal() {
  const modal = document.getElementById('modal-role-entry');
  if (modal) modal.style.display = 'none';
  syncModalOpenState();
}

function submitRoleForm(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('new-role-name');
  if (!input) return false;
  const newRole = input.value.trim();
  if (!newRole) {
    showToast('Nama peran wajib diisi.', true);
    return false;
  }

  if (!CURRENT_ROLES_PERMISSIONS) CURRENT_ROLES_PERMISSIONS = getDefaultRolesPermissions();
  const existingRole = Object.keys(CURRENT_ROLES_PERMISSIONS).find(function (r) {
    return r.toLowerCase() === newRole.toLowerCase();
  });
  if (existingRole) {
    showToast('Peran "' + existingRole + '" sudah ada.', true);
    return false;
  }

  const defaultPerms = {};
  const allRoutes = ['dashboard', 'pos', 'produk', 'stok', 'produksi', 'qc', 'pembelian', 'konsinyasi', 'piutang', 'expenses', 'crm', 'purnajual', 'faktur', 'laporan', 'pengaturan'];
  allRoutes.forEach(function (m) {
    defaultPerms[m] = { can_view: true, can_edit: false, can_delete: false };
  });

  CURRENT_ROLES_PERMISSIONS[newRole] = defaultPerms;
  AVAILABLE_ROLES = Object.keys(CURRENT_ROLES_PERMISSIONS);
  setSafeSession('ekasir_available_roles', JSON.stringify(AVAILABLE_ROLES));
  if (APP_SETTINGS && typeof APP_SETTINGS === 'object') {
    APP_SETTINGS['role_permissions'] = JSON.stringify(CURRENT_ROLES_PERMISSIONS);
  }
  invalidateCache('settings');

  closeRoleModal();
  selectRoleTab(newRole);

  api('saveRolePermissions', TOKEN, CURRENT_ROLES_PERMISSIONS).then(function () {
    showToast('Peran baru berhasil ditambahkan.');
  }).catch(function (err) {
    showToast('Gagal menyimpan hak akses: ' + (err.message || err), true);
  });
  return false;
}

// ========================= MANAJEMEN PENGGUNA (USERS) =========================
function loadUsersManagementUI() {
  const container = document.getElementById('users-management-container');
  if (!container) return;
  if (CURRENT_USERS_LIST && CURRENT_USERS_LIST.length > 0) {
    renderUsersListUI();
  } else {
    container.innerHTML = '<div class="empty-state">⏳ Memuat daftar pengguna...</div>';
    if (window.i18n && typeof window.i18n.translateDOM === 'function') {
      window.i18n.translateDOM(container);
    }
  }

  api('getUsers', TOKEN).then(function (users) {
    CURRENT_USERS_LIST = Array.isArray(users) ? users : [];
    renderUsersListUI();
  }).catch(function (err) {
    console.warn('Gagal memuat daftar pengguna dari server:', err);
    if (!CURRENT_USERS_LIST || CURRENT_USERS_LIST.length === 0) {
      CURRENT_USERS_LIST = getDefaultUsersFallback();
    }
    renderUsersListUI();
  });
}

function renderUsersListUI() {
  const container = document.getElementById('users-management-container');
  if (!container) return;

  const headerHtml =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">' +
    '<div>' +
    '<h3 style="margin:0 0 4px 0;color:var(--text-main);font-size:18px;font-weight:700;">Daftar Akun Pengguna</h3>' +
    '<p style="margin:0;font-size:13px;color:var(--text-secondary);">Kelola akun staf kasir, operator QC, koordinator, dan administrator.</p>' +
    '</div>' +
    '<button type="button" class="btn btn-primary" onclick="openUserModal()">+ Tambah Pengguna Baru</button>' +
    '</div>';

  if (!CURRENT_USERS_LIST || CURRENT_USERS_LIST.length === 0) {
    container.innerHTML = headerHtml + '<div class="empty-state">Belum ada akun pengguna.</div>';
    if (window.i18n && typeof window.i18n.translateDOM === 'function') {
      window.i18n.translateDOM(container);
    }
    return;
  }

  let tableHtml =
    '<div class="table-responsive" style="overflow-x:auto;">' +
    '<table class="data-table" style="width:100%;border-collapse:collapse;margin-bottom:0;">' +
    '<thead>' +
    '<tr>' +
    '<th style="width:50px;text-align:center;padding:12px 14px;">NO</th>' +
    '<th style="text-align:left;padding:12px 14px;">USERNAME</th>' +
    '<th style="text-align:left;padding:12px 14px;">NAMA LENGKAP</th>' +
    '<th style="text-align:left;padding:12px 14px;">PERAN / HAK AKSES</th>' +
    '<th style="text-align:left;padding:12px 14px;">DIBUAT PADA</th>' +
    '<th style="width:130px;text-align:center;padding:12px 14px;">AKSI</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody id="users-table-body">';

  CURRENT_USERS_LIST.forEach(function (u, idx) {
    const isMainAdmin = String(u.username || '').trim().toLowerCase() === 'admin';
    let roleBadge = '<span class="badge badge-info" style="background:#0288D1;color:#fff;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;">' + escapeHtml(u.role || 'Kasir') + '</span>';
    if (u.role === 'Admin') roleBadge = '<span class="badge badge-success" style="background:#2E7D32;color:#fff;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;">Admin</span>';
    else if (u.role === 'Koordinator') roleBadge = '<span class="badge" style="background:#E0E7FF;color:#3730A3;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;">Koordinator (View)</span>';
    else if (u.role === 'QC') roleBadge = '<span class="badge" style="background:#FEF3C7;color:#92400E;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;">QC</span>';

    const fullName = u.full_name || u.name || '-';
    const userIdOrName = u.id || u.username;

    tableHtml +=
      '<tr style="border-bottom:1px solid var(--border);">' +
      '<td style="text-align:center;color:#888;font-size:13px;padding:12px 14px;">' + (idx + 1) + '</td>' +
      '<td style="padding:12px 14px;"><strong data-no-i18n="true" translate="no" style="font-family:\'JetBrains Mono\',monospace;color:var(--text-main);">' + escapeHtml(u.username) + '</strong></td>' +
      '<td data-no-i18n="true" translate="no" style="padding:12px 14px;font-weight:500;">' + escapeHtml(fullName) + '</td>' +
      '<td style="padding:12px 14px;">' + roleBadge + '</td>' +
      '<td style="padding:12px 14px;font-size:12px;color:#6B7280;">' + (u.created_at ? formatDate(u.created_at) : '-') + '</td>' +
      '<td style="text-align:center;padding:12px 14px;">' +
      '<div style="display:flex;gap:6px;justify-content:center;align-items:center;">' +
      '<button type="button" class="btn btn-xs btn-secondary" onclick="openUserModal(\'' + escapeHtml(userIdOrName) + '\')" style="padding:4px 10px;font-size:12px;">✏️ Edit</button>' +
      (!isMainAdmin
        ? '<button type="button" class="btn btn-xs btn-danger" onclick="deleteUserAccount(\'' + escapeHtml(userIdOrName) + '\', \'' + escapeHtml(u.username) + '\')" style="padding:4px 8px;font-size:12px;color:#d32f2f;">🗑️</button>'
        : '') +
      '</div>' +
      '</td>' +
      '</tr>';
  });

  tableHtml += '</tbody></table></div>';
  container.innerHTML = headerHtml + tableHtml;

  if (window.i18n && typeof window.i18n.translateDOM === 'function') {
    window.i18n.translateDOM(container);
  }
}

function openUserModal(userId) {
  const modal = document.getElementById('modal-user-entry');
  const titleEl = document.getElementById('user-modal-title');
  const idEl = document.getElementById('user-id');
  const userEl = document.getElementById('user-username');
  const nameEl = document.getElementById('user-fullname');
  const roleSelect = document.getElementById('user-role-select');
  const passEl = document.getElementById('user-password');
  const passStar = document.getElementById('user-pass-required-star');
  const passHint = document.getElementById('user-pass-hint');
  if (!modal) return;

  // Gabungkan semua role yang tersedia (bawaan + kustom dari Matriks Hak Akses)
  const roleSet = [];
  const baseRoles = (AVAILABLE_ROLES && AVAILABLE_ROLES.length > 0) ? AVAILABLE_ROLES : ['Admin', 'Koordinator', 'QC', 'Kasir', 'Finance'];
  baseRoles.forEach(function (r) { if (r && roleSet.indexOf(r) === -1) roleSet.push(r); });
  if (CURRENT_ROLES_PERMISSIONS && typeof CURRENT_ROLES_PERMISSIONS === 'object') {
    Object.keys(CURRENT_ROLES_PERMISSIONS).forEach(function (r) {
      if (r && roleSet.indexOf(r) === -1) roleSet.push(r);
    });
  }

  let editingUser = null;
  if (userId) {
    editingUser = (CURRENT_USERS_LIST || []).filter(function (u) {
      return String(u.id) === String(userId) || String(u.username || '').toLowerCase() === String(userId).toLowerCase();
    })[0] || null;
    if (editingUser && editingUser.role && roleSet.indexOf(editingUser.role) === -1) {
      roleSet.push(editingUser.role);
    }
  }

  if (roleSelect) {
    let rolesOptions = '';
    roleSet.forEach(function (r) {
      rolesOptions += '<option value="' + escapeHtml(r) + '">' + escapeHtml(r) + (r === 'Koordinator' ? ' (View-Only)' : '') + '</option>';
    });
    roleSelect.innerHTML = rolesOptions;
  }

  if (editingUser) {
    const isMainAdmin = String(editingUser.username || '').trim().toLowerCase() === 'admin';
    if (titleEl) {
      titleEl.textContent = 'Edit Akun Pengguna';
      delete titleEl._origText;
      if (titleEl.firstChild) delete titleEl.firstChild._origText;
    }
    if (idEl) idEl.value = editingUser.id || editingUser.username || '';
    if (userEl) {
      userEl.value = editingUser.username || '';
      userEl.readOnly = true;
      userEl.style.backgroundColor = '#F3F4F6';
    }
    if (nameEl) nameEl.value = editingUser.full_name || editingUser.name || '';
    if (roleSelect) {
      roleSelect.value = isMainAdmin ? 'Admin' : (editingUser.role || 'Kasir');
      roleSelect.disabled = isMainAdmin;
    }
    if (passEl) { passEl.value = ''; passEl.required = false; }
    if (passStar) passStar.style.display = 'none';
    if (passHint) passHint.style.display = 'block';
  } else {
    if (titleEl) {
      titleEl.textContent = 'Tambah Akun Pengguna';
      delete titleEl._origText;
      if (titleEl.firstChild) delete titleEl.firstChild._origText;
    }
    if (idEl) idEl.value = '';
    if (userEl) {
      userEl.value = '';
      userEl.readOnly = false;
      userEl.style.backgroundColor = '';
    }
    if (nameEl) nameEl.value = '';
    if (roleSelect) {
      roleSelect.value = roleSet.indexOf('Kasir') !== -1 ? 'Kasir' : (roleSet[0] || 'Kasir');
      roleSelect.disabled = false;
    }
    if (passEl) { passEl.value = ''; passEl.required = true; }
    if (passStar) passStar.style.display = 'inline';
    if (passHint) passHint.style.display = 'none';
  }

  modal.style.display = 'flex';
  document.body.classList.add('modal-open');

  if (window.i18n && typeof window.i18n.translateDOM === 'function') {
    window.i18n.translateDOM(modal);
  }
}

function closeUserModal() {
  const modal = document.getElementById('modal-user-entry');
  if (modal) modal.style.display = 'none';
  syncModalOpenState();
}

function submitUserForm(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id = ((document.getElementById('user-id') || {}).value || '').trim();
  const username = ((document.getElementById('user-username') || {}).value || '').trim();
  const name = ((document.getElementById('user-fullname') || {}).value || '').trim();
  const roleSelectEl = document.getElementById('user-role-select');
  const role = (String(username).toLowerCase() === 'admin') ? 'Admin' : ((roleSelectEl && roleSelectEl.value) || 'Kasir');
  const password = (document.getElementById('user-password') || {}).value || '';

  if (!username) {
    showToast('Username wajib diisi.', true);
    return false;
  }
  if (username.length < 3 && String(username).toLowerCase() !== 'qc') {
    showToast('Username minimal 3 karakter.', true);
    return false;
  }
  if (!name) {
    showToast('Nama lengkap wajib diisi.', true);
    return false;
  }
  if (!id && !password) {
    showToast('Password wajib diisi untuk pengguna baru.', true);
    return false;
  }
  if (password && password.length < 6) {
    showToast('Password minimal 6 karakter.', true);
    return false;
  }

  if (!id && Array.isArray(CURRENT_USERS_LIST)) {
    const duplicate = CURRENT_USERS_LIST.some(function (u) {
      return String(u.username || '').trim().toLowerCase() === username.toLowerCase();
    });
    if (duplicate) {
      showToast('Username sudah digunakan oleh pengguna lain.', true);
      return false;
    }
  }

  const btn = document.getElementById('btn-save-user');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Menyimpan...'; }

  const payload = {
    id: id,
    username: username,
    name: name,
    full_name: name,
    role: role,
    password: password
  };

  api('saveUser', TOKEN, payload).then(function (res) {
    showToast('Pengguna berhasil disimpan!');
    closeUserModal();
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Simpan Pengguna';
      if (window.i18n && typeof window.i18n.translateDOM === 'function') window.i18n.translateDOM(btn);
    }
    if (res && res.user && Array.isArray(CURRENT_USERS_LIST)) {
      const savedUser = res.user;
      const idx = CURRENT_USERS_LIST.findIndex(function (u) {
        return String(u.id) === String(savedUser.id) || String(u.username || '').toLowerCase() === String(savedUser.username || '').toLowerCase();
      });
      if (idx !== -1) {
        CURRENT_USERS_LIST[idx] = savedUser;
      } else {
        CURRENT_USERS_LIST.push(savedUser);
      }
      renderUsersListUI();
    }
    loadUsersManagementUI();
  }).catch(function (err) {
    showToast('Gagal menyimpan pengguna: ' + (err.message || err), true);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Simpan Pengguna';
      if (window.i18n && typeof window.i18n.translateDOM === 'function') window.i18n.translateDOM(btn);
    }
  });

  return false;
}

function executeDeleteUserAccount(userId, username) {
  if (String(username || userId || '').trim().toLowerCase() === 'admin') {
    showToast('Akun administrator utama tidak dapat dihapus.', true);
    return;
  }
  api('deleteUser', TOKEN, userId, username).then(function () {
    CURRENT_USERS_LIST = (CURRENT_USERS_LIST || []).filter(function (u) {
      return String(u.id) !== String(userId) &&
        String(u.username) !== String(userId) &&
        String(u.username) !== String(username);
    });
    renderUsersListUI();
    showToast('Akun pengguna berhasil dihapus.');
    loadUsersManagementUI();
  }).catch(function (err) {
    showToast('Gagal menghapus pengguna: ' + (err.message || err), true);
  });
}

function deleteUserAccount(userId, username) {
  const displayUser = username || userId || '';
  if (String(displayUser).trim().toLowerCase() === 'admin') {
    showToast('Akun administrator utama tidak dapat dihapus.', true);
    return;
  }
  if (typeof showConfirmDialog === 'function') {
    showConfirmDialog(
      'Hapus Akun Pengguna',
      'Apakah Anda yakin ingin menghapus akun pengguna "' + displayUser + '"?',
      function () {
        executeDeleteUserAccount(userId, displayUser);
      },
      true
    );
    return;
  }
  if (!confirm('Apakah Anda yakin ingin menghapus akun pengguna "' + displayUser + '"?')) return;
  executeDeleteUserAccount(userId, displayUser);
}

function deleteUserUI(userId, username) {
  if (!username && CURRENT_USERS_LIST) {
    const u = CURRENT_USERS_LIST.find(function (x) { return String(x.id) === String(userId) || String(x.username) === String(userId); });
    if (u) username = u.username;
  }
  deleteUserAccount(userId, username || 'ini');
}
window.deleteUserAccount = deleteUserAccount;
window.deleteUserUI = deleteUserUI;


function applyBankInputsUnlock(label) {
  const bankInputs = ['set-bank-name', 'set-bank-account', 'set-bank-account-name'];
  bankInputs.forEach(function (fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
      field.disabled = false;
      field.style.opacity = '1';
      field.style.cursor = 'text';
    }
  });

  const btn = document.getElementById('btn-unlock-bank-settings');
  if (btn) {
    btn.textContent = label || '🔓 Rekening Terbuka (Finance)';
    btn.disabled = true;
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-success');
  }
}

function promptFinanceSupervisorAuth(title, description, onSuccess) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '2200';
  overlay.innerHTML =
    '<div class="modal-backdrop"></div>' +
    '<div class="modal-dialog modal-dialog-sm" style="max-width:420px;">' +
    '<div class="modal-header" style="background:#FEF3C7;border-bottom:1px solid #FDE68A;">' +
    '<h3 class="modal-title" style="color:#92400E;display:flex;align-items:center;gap:8px;font-size:16px;">' +
    '<span>🔐</span> ' + escapeHtml(title || 'Otorisasi Khusus Finance') + '</h3>' +
    '<button type="button" class="modal-close-btn" id="fin-auth-close">&times;</button>' +
    '</div>' +
    '<div class="modal-body" style="padding:16px 20px;">' +
    '<p style="margin:0 0 14px;color:var(--text-secondary);font-size:12.5px;line-height:1.45;">' +
    escapeHtml(description || 'Wewenang ini dibatasi khusus untuk Bagian Keuangan (Role Finance). Masukkan kredensial akun Finance untuk otorisasi.') +
    '</p>' +
    '<div class="field-group" style="margin-bottom:12px;">' +
    '<label class="field-label" style="font-size:12px;font-weight:600;">Username Petugas Finance</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="fin-auth-username" placeholder="Username akun Finance" style="padding-left:14px;font-size:13px;" autocomplete="off">' +
    '</div>' +
    '</div>' +
    '<div class="field-group" style="margin-bottom:8px;">' +
    '<label class="field-label" style="font-size:12px;font-weight:600;">Password Petugas Finance</label>' +
    '<div class="input-wrapper">' +
    '<input type="password" id="fin-auth-password" placeholder="Password akun Finance" style="padding-left:14px;font-size:13px;" autocomplete="off">' +
    '</div>' +
    '</div>' +
    '<small style="color:var(--text-muted);font-size:11px;display:block;">*Hanya akun dengan peran <strong>Finance</strong> yang dapat mengesahkan otorisasi ini.</small>' +
    '</div>' +
    '<div class="modal-footer" style="padding:12px 20px;background:var(--surface-muted);">' +
    '<button type="button" class="btn btn-secondary" id="fin-auth-cancel">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="fin-auth-confirm" style="background:#B45309;border-color:#B45309;">Verifikasi Otorisasi</button>' +
    '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');

  const close = function () {
    overlay.remove();
    document.body.classList.remove('modal-open');
  };

  const uInput = overlay.querySelector('#fin-auth-username');
  const pInput = overlay.querySelector('#fin-auth-password');
  overlay.querySelector('#fin-auth-close').onclick = close;
  overlay.querySelector('#fin-auth-cancel').onclick = close;

  const handleVerify = function () {
    const u = (uInput ? uInput.value : '').trim();
    const p = (pInput ? pInput.value : '').trim();
    if (!u || !p) {
      showToast('Username dan password Finance wajib diisi.', true);
      return;
    }

    showToast('Memverifikasi wewenang Finance...');
    api('loginUser', u, p).then(function (res) {
      if (res && res.success && res.user) {
        const userRole = String(res.user.role || '').toLowerCase();
        const isRoleFinance = userRole.indexOf('finance') !== -1 || userRole.indexOf('keuangan') !== -1;
        if (!isRoleFinance) {
          showToast('Akses ditolak: Akun "' + u + '" tidak berwenang (bukan role Finance)!', true);
          return;
        }
        close();
        showToast('Otorisasi Finance disetujui untuk ' + (res.user.name || res.user.username) + '.');
        if (typeof onSuccess === 'function') onSuccess(res.user);
      } else {
        showToast('Username atau password salah, otorisasi ditolak!', true);
      }
    }).catch(function (err) {
      showToast('Gagal memverifikasi: ' + (err.message || 'Kredensial salah'), true);
    });
  };

  overlay.querySelector('#fin-auth-confirm').onclick = handleVerify;
  if (uInput) {
    uInput.focus();
    uInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && pInput) pInput.focus();
    });
  }
  if (pInput) {
    pInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleVerify();
    });
  }
}

function unlockBankSettings() {
  const currentUserName = (CURRENT_USER && CURRENT_USER.username) || USER_NAME || '';
  if (!currentUserName) {
    showToast('Sesi pengguna tidak valid untuk membuka kunci rekening.', true);
    return;
  }

  // Jika user saat ini BUKAN Finance, mintakan otorisasi supervisor Finance
  if (!isCurrentUserFinance()) {
    promptFinanceSupervisorAuth(
      'Buka Kunci Rekening Toko',
      'Pengaturan rekening bank penerima toko dilindungi dan hanya dapat diubah oleh Bagian Keuangan (Role Finance). Silakan minta staf Finance untuk mengesahkan.',
      function (finUser) {
        applyBankInputsUnlock('🔓 Rekening Terbuka (Finance: ' + (finUser.name || finUser.username) + ')');
        showToast('Kunci rekening terbuka oleh Finance (' + (finUser.name || finUser.username) + ').');
      }
    );
    return;
  }

  // Jika user saat ini ADALAH Finance, konfirmasi password akun Finance saat ini
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '2100';
  overlay.innerHTML =
    '<div class="modal-backdrop"></div>' +
    '<div class="modal-dialog modal-dialog-sm" style="max-width:420px;">' +
    '<div class="modal-header">' +
    '<h3 class="modal-title">Konfirmasi Keamanan Finance</h3>' +
    '<button type="button" class="modal-close-btn" id="bank-lock-close">&times;</button>' +
    '</div>' +
    '<div class="modal-body">' +
    '<p style="margin:0 0 12px;color:var(--text-secondary);font-size:13px;">Masukkan password akun Finance Anda (' + escapeHtml(currentUserName) + ') untuk membuka kunci rekening bank.</p>' +
    '<div class="input-wrapper">' +
    '<input type="password" id="bank-lock-password" placeholder="Password akun Finance" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '<div class="modal-footer">' +
    '<button type="button" class="btn btn-secondary" id="bank-lock-cancel">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="bank-lock-confirm">Buka Kunci</button>' +
    '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');

  const close = function () {
    overlay.remove();
    document.body.classList.remove('modal-open');
  };

  const input = overlay.querySelector('#bank-lock-password');
  overlay.querySelector('#bank-lock-close').onclick = close;
  overlay.querySelector('#bank-lock-cancel').onclick = close;
  overlay.querySelector('#bank-lock-confirm').onclick = function () {
    const inputPassword = (input ? input.value : '').trim();
    if (!inputPassword) {
      showToast('Password wajib diisi.', true);
      return;
    }

    api('loginUser', currentUserName, inputPassword).then(function (res) {
      const isValid = res && res.success;
      if (isValid) {
        applyBankInputsUnlock('🔓 Rekening Terbuka (Role: Finance)');
        close();
        showToast('Kunci terbuka, silakan ubah data rekening.');
      } else {
        close();
        showToast('Password salah, akses ditolak!', true);
      }
    }).catch(function () {
      close();
      showToast('Password salah, akses ditolak!', true);
    });
  };

  if (input) {
    input.focus();
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        overlay.querySelector('#bank-lock-confirm').click();
      }
    });
  }
}

function sendTelegramSecurityAlert(message) {
  if (!APP_SETTINGS) return;

  const token = APP_SETTINGS['telegram_bot_token'];
  const chatId = APP_SETTINGS['telegram_chat_id'];
  if (!token || !chatId) return;

  const url = 'https://api.telegram.org/bot' + token + '/sendMessage';
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message
    })
  }).catch(function () { });
}

function saveStoreSettingsUI() {
  saveStoreSettings();
}

function saveStoreSettings() {
  const storeLogo = (document.getElementById('set-store-logo') ? document.getElementById('set-store-logo').value.trim() : '');
  const storeEmail = (document.getElementById('set-store-email') ? document.getElementById('set-store-email').value.trim() : (document.getElementById('set-cat-email') ? document.getElementById('set-cat-email').value.trim() : ''));
  const storeLogoLight = (document.getElementById('set-store-logo-light') ? document.getElementById('set-store-logo-light').value.trim() : '');
  const storeStamp = (document.getElementById('set-store-stamp') ? document.getElementById('set-store-stamp').value.trim() : '');
  const batchFormat = (document.getElementById('set-batch-format') ? document.getElementById('set-batch-format').value.trim() : '') || 'BATCH-{FARMER}-{YYMM}-{RAND4}-{SEQ}';
  const taxRateInput = document.getElementById('set-tax-rate');
  const taxRate = taxRateInput ? taxRateInput.value.trim() : (APP_SETTINGS.tax_rate || '0');

  const newBankName = (document.getElementById('set-bank-name') ? document.getElementById('set-bank-name').value.trim() : '') || 'BNI';
  const newBankAccount = (document.getElementById('set-bank-account') ? document.getElementById('set-bank-account').value.trim() : '') || '0178 849 203';
  const newBankAccountName = (document.getElementById('set-bank-account-name') ? document.getElementById('set-bank-account-name').value.trim() : '') || 'Rekening Toko';

  const previousBankSettings = APP_SETTINGS || {};
  const previousBankName = String(previousBankSettings.bank_name || 'BNI');
  const previousBankAccount = String(previousBankSettings.bank_account || '0178 849 203');
  const previousBankAccountName = String(previousBankSettings.bank_account_name || 'Rekening Toko');
  const hasBankChanged = (
    previousBankName !== newBankName ||
    previousBankAccount !== newBankAccount ||
    previousBankAccountName !== newBankAccountName
  );

  // Kumpulkan preset tier harga
  const presetRows = document.querySelectorAll('#price-tier-presets-body .preset-tier-row');
  const presets = [];
  presetRows.forEach(function (row) {
    const tName = (row.querySelector('.preset-tier-name').value || '').trim();
    const tPrice = Number(row.querySelector('.preset-tier-price').value || 0);
    if (tName) {
      presets.push({
        name: tName,
        price: tPrice,
        default: tName.toLowerCase() === 'reguler'
      });
    }
  });

  const presetJson = presets.length > 0
    ? JSON.stringify(presets)
    : JSON.stringify(FALLBACK_PRICE_TIER_PRESETS);

  const payload = {
    store_logo: storeLogo,
    store_logo_light: storeLogoLight,
    store_stamp: storeStamp,
    store_name: document.getElementById('set-store-name') ? document.getElementById('set-store-name').value.trim() : '',
    store_address: document.getElementById('set-store-address') ? document.getElementById('set-store-address').value.trim() : '',
    store_phone: document.getElementById('set-store-phone') ? document.getElementById('set-store-phone').value.trim() : '',
    store_email: storeEmail,
    bank_name: newBankName,
    bank_account: newBankAccount,
    bank_account_name: newBankAccountName,
    tax_rate: taxRate,
    daily_target: document.getElementById('set-daily-target') ? document.getElementById('set-daily-target').value.trim() : (APP_SETTINGS && APP_SETTINGS.daily_target ? APP_SETTINGS.daily_target : '5000000'),
    invoice_footer: document.getElementById('set-invoice-footer') ? document.getElementById('set-invoice-footer').value.trim() : '',
    batch_format_template: batchFormat,
    batch_format: batchFormat,
    price_tiers_preset: presetJson,
    session_timeout_minutes: document.getElementById('set-session-timeout')
      ? String(document.getElementById('set-session-timeout').value)
      : String(getSessionTimeoutMinutes())
  };

  if (hasBankChanged) {
    const userName = (CURRENT_USER && CURRENT_USER.name) || (CURRENT_USER && CURRENT_USER.username) || USER_NAME || 'Pemilik Toko';
    sendTelegramSecurityAlert(
      '🚨 *PERINGATAN KEAMANAN:*\n' +
      'Data Rekening Bank Toko baru saja diubah oleh *' + userName + '*.\n\n' +
      '*Data Rekening Baru:*\n' +
      'Bank: ' + newBankName + '\n' +
      'No. Rek: ' + newBankAccount + '\n' +
      'a.n: ' + newBankAccountName
    );
    if (typeof window.emitOperationalNotification === 'function') {
      window.emitOperationalNotification({
        title: '🚨 Perubahan Rekening Bank Kios!',
        body: 'Rekening diubah oleh ' + userName + ' menjadi ' + newBankName + ' ' + newBankAccount + ' a.n. ' + newBankAccountName + '.',
        category: 'security',
        route: '#pengaturan',
        urgent: true
      });
    }
  }

  api('saveSettings', TOKEN, payload).then(function () {
    invalidateCache('settings');
    if (!APP_SETTINGS) APP_SETTINGS = {};
    Object.assign(APP_SETTINGS, payload);
    APP_SETTINGS['price_tiers_preset'] = presetJson;
    syncSessionTimeoutFromSettings(APP_SETTINGS);
    PRICE_TIERS_LIST = presets.map(function (p) { return p.name; });
    applyBrandLogo();
    checkIdleSessionStatus();
    showToast('Pengaturan profil toko & preset tingkat harga berhasil disimpan.');
  }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
}

function saveSessionTimeoutSettings() {
  if (!userCanEdit('pengaturan')) {
    showToast('Akses ditolak: Akun Anda berada dalam Mode Pantau (View-Only) dan tidak diizinkan mengubah data.', true);
    return;
  }
  const selectEl = document.getElementById('set-session-timeout');
  if (!selectEl) return;
  const val = String(selectEl.value || '30');
  api('saveSettings', TOKEN, { session_timeout_minutes: val }).then(function () {
    if (!APP_SETTINGS) APP_SETTINGS = {};
    APP_SETTINGS['session_timeout_minutes'] = val;
    const cached = getCachedData('settings');
    if (cached && typeof cached === 'object') {
      cached['session_timeout_minutes'] = val;
      setCachedData('settings', cached);
    } else {
      invalidateCache('settings');
    }
    syncSessionTimeoutFromSettings(APP_SETTINGS);
    recordUserActivity(true);
    checkIdleSessionStatus();
    if (val === '0') {
      showToast('Auto-logout sesi dinonaktifkan.');
    } else {
      showToast('Batas waktu sesi otomatis disimpan (' + val + ' menit).');
    }
  }).catch(function (err) {
    showToast('Gagal menyimpan durasi sesi: ' + (err.message || err), true);
  });
}
window.saveSessionTimeoutSettings = saveSessionTimeoutSettings;

// Alias untuk kompatibilitas nama fungsi modul
// filterFakturTable is defined as function in Faktur module below
const switchLaporanSubtab = switchReportSubtab;

function submitChangePassword() {
  const oldP = document.getElementById('set-old-pass').value;
  const newP = document.getElementById('set-new-pass').value;
  const confP = document.getElementById('set-confirm-pass').value;

  if (!oldP || !newP) { showToast('Lengkapi formulir password.', true); return; }
  if (newP !== confP) { showToast('Konfirmasi password tidak sesuai.', true); return; }
  if (newP.length < 6) { showToast('Password minimal 6 karakter.', true); return; }

  api('changePassword', TOKEN, oldP, newP).then(function (res) {
    if (res.success) {
      showToast('Password akun berhasil diganti.');
      document.getElementById('set-old-pass').value = '';
      document.getElementById('set-new-pass').value = '';
      document.getElementById('set-confirm-pass').value = '';
    } else {
      showToast(res.message || 'Gagal mengubah password.', true);
    }
  }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
}

// ============================================================================
// LOGIKA INTEGRASI BOT TELEGRAM
// ============================================================================

function toggleTgTokenVisibility() {
  const input = document.getElementById('set-tg-token');
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

function updateTelegramStatusBadge(token, chatId) {
  const badgeEl = document.getElementById('telegram-status-badge');
  if (!badgeEl) return;
  const isConfigured = Boolean((token || '').trim() && (chatId || '').trim());
  if (isConfigured) {
    badgeEl.innerHTML = '<span class="badge badge-success" style="padding:6px 12px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">🟢 Aktif Terhubung</span>';
  } else {
    badgeEl.innerHTML = '<span class="badge" style="background:var(--surface-muted);color:var(--text-secondary);border:1px solid var(--border);padding:6px 12px;font-size:12px;display:inline-flex;align-items:center;gap:6px;">⚪ Belum Dikonfigurasi</span>';
  }
}

function saveTelegramSettings() {
  const token = (document.getElementById('set-tg-token') ? document.getElementById('set-tg-token').value : '').trim();
  const chatId = (document.getElementById('set-tg-chat-id') ? document.getElementById('set-tg-chat-id').value : '').trim();
  const notifVoid = document.getElementById('set-tg-notif-void') ? document.getElementById('set-tg-notif-void').checked : true;
  const notifDht = document.getElementById('set-tg-notif-dht') ? document.getElementById('set-tg-notif-dht').checked : true;
  const notifQc = document.getElementById('set-tg-notif-qc') ? document.getElementById('set-tg-notif-qc').checked : true;

  const btn = document.getElementById('btn-save-tg');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Menyimpan...'; }

  const payload = {
    telegram_bot_token: token,
    telegram_chat_id: chatId,
    telegram_notif_void: String(notifVoid),
    telegram_notif_dht: String(notifDht),
    telegram_notif_qc: String(notifQc)
  };

  api('saveSettings', TOKEN, payload).then(function () {
    invalidateCache('settings');
    if (!APP_SETTINGS) APP_SETTINGS = {};
    Object.assign(APP_SETTINGS, payload);
    showToast('Pengaturan Bot Telegram berhasil disimpan.');
    if (btn) { btn.disabled = false; btn.textContent = '💾 Simpan Pengaturan Bot'; }
    updateTelegramStatusBadge(token, chatId);
  }).catch(function (err) {
    showToast('Gagal: ' + (err.message || err), true);
    if (btn) { btn.disabled = false; btn.textContent = '💾 Simpan Pengaturan Bot'; }
  });
}

function testTelegramConnectionUI() {
  const btn = document.getElementById('btn-test-tg');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Mengirim Pesan Tes...'; }

  api('testTelegramConnection', TOKEN).then(function (res) {
    showToast(res.message || 'Pesan tes berhasil dikirim ke Telegram!');
    if (btn) { btn.disabled = false; btn.textContent = '🔔 Uji Kirim Notifikasi'; }
  }).catch(function (err) {
    showToast('Gagal tes koneksi: ' + (err.message || err), true);
    if (btn) { btn.disabled = false; btn.textContent = '🔔 Uji Kirim Notifikasi'; }
  });
}

function setupTelegramWebhookUI() {
  const currentUrl = window.location.href.split('?')[0].split('#')[0];
  const webAppUrl = prompt('Masukkan URL Web App deployment Google Apps Script (harus berakhiran /exec):', currentUrl);
  if (!webAppUrl) return;

  const btn = document.getElementById('btn-webhook-tg');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Mendaftarkan Webhook...'; }

  api('setupTelegramWebhook', TOKEN, webAppUrl.trim()).then(function (res) {
    showToast(res.message || 'Webhook Telegram berhasil didaftarkan!');
    if (btn) { btn.disabled = false; btn.textContent = '🔗 Sinkronkan Webhook Bot'; }
  }).catch(function (err) {
    showToast('Gagal sinkronisasi webhook: ' + (err.message || err), true);
    if (btn) { btn.disabled = false; btn.textContent = '🔗 Sinkronkan Webhook Bot'; }
  });
}

// ==========================================================================
// MODUL RESET DATA UJI COBA (DANGER ZONE)
// ==========================================================================

/**
 * Buka modal panel reset data uji coba
 */
function openResetDataModal() {
  const modal = document.getElementById('modal-reset-data');
  if (!modal) return;

  // Reset checklist modul ke kondisi awal (tercentang semua)
  const cbPos = document.getElementById('reset-mod-pos');
  const cbConsign = document.getElementById('reset-mod-consign');
  const cbAftersales = document.getElementById('reset-mod-aftersales');
  if (cbPos) cbPos.checked = true;
  if (cbConsign) cbConsign.checked = true;
  if (cbAftersales) cbAftersales.checked = true;

  // Kosongkan input konfirmasi teks
  const input = document.getElementById('reset-confirmation-input');
  if (input) {
    input.value = '';
    input.disabled = false;
  }

  // Nonaktifkan tombol eksekusi sampai divalidasi
  const btn = document.getElementById('btn-execute-reset');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.55';
    btn.style.cursor = 'not-allowed';
    btn.innerHTML = '🗑️ Hapus Permanen Data Terpilih';
  }

  modal.style.display = 'flex';
  modal.classList.add('active');
  document.body.classList.add('modal-open');

  if (input) {
    setTimeout(function () { input.focus(); }, 100);
  }
}

/**
 * Tutup modal panel reset data
 */
function closeResetDataModal() {
  const modal = document.getElementById('modal-reset-data');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
  const anyOpenModal = document.querySelector('.modal-overlay[style*="display: flex"], .modal-overlay.active');
  if (!anyOpenModal) {
    document.body.classList.remove('modal-open');
  }
}

/**
 * Validasi input konfirmasi teks kata 'RESET' dan minimal 1 modul terpilih
 */
function validateResetConfirmInput() {
  const input = document.getElementById('reset-confirmation-input');
  const btn = document.getElementById('btn-execute-reset');
  if (!input || !btn) return;

  const text = (input.value || '').trim();
  const isTextMatch = (text === 'RESET');

  const cbPos = document.getElementById('reset-mod-pos');
  const cbConsign = document.getElementById('reset-mod-consign');
  const cbAftersales = document.getElementById('reset-mod-aftersales');

  const hasModuleSelected = (cbPos && cbPos.checked) ||
    (cbConsign && cbConsign.checked) ||
    (cbAftersales && cbAftersales.checked);

  if (isTextMatch && hasModuleSelected) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.55';
    btn.style.cursor = 'not-allowed';
  }
}

/**
 * Eksekusi penghapusan data uji coba ke backend
 */
function executeResetTestingData() {
  const input = document.getElementById('reset-confirmation-input');
  const text = input ? input.value.trim() : '';
  if (text !== 'RESET') {
    showToast('Ketik kata RESET dengan benar untuk konfirmasi!', true);
    return;
  }

  const selectedModules = [];
  const cbPos = document.getElementById('reset-mod-pos');
  const cbConsign = document.getElementById('reset-mod-consign');
  const cbAftersales = document.getElementById('reset-mod-aftersales');

  if (cbPos && cbPos.checked) selectedModules.push('pos');
  if (cbConsign && cbConsign.checked) selectedModules.push('consign');
  if (cbAftersales && cbAftersales.checked) selectedModules.push('aftersales');

  if (selectedModules.length === 0) {
    showToast('Pilih setidaknya satu modul yang ingin dikosongkan!', true);
    return;
  }

  const btn = document.getElementById('btn-execute-reset');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="sync-spinner" style="display:inline-block;width:14px;height:14px;border-width:2px;margin-right:6px;"></span> Membersihkan Data...';
  }
  if (input) input.disabled = true;

  showToast('Memproses pembersihan data uji coba...');

  api('resetTestingData', TOKEN, selectedModules).then(function (res) {
    closeResetDataModal();
    showToast(res.message || 'Data riwayat uji coba berhasil dikosongkan!');

    // 1. Bersihkan seluruh cache lokal terkait modul yang direset
    if (window.DATA_CACHE) {
      if (selectedModules.indexOf('pos') !== -1) {
        DATA_CACHE.transactions = null;
        DATA_CACHE.recentInvoices = null;
        DATA_CACHE.dashboard = null;
        DATA_CACHE.reports = null;
        DATA_CACHE.receivables = null;
      }
      if (selectedModules.indexOf('consign') !== -1) {
        DATA_CACHE.consignments = null;
        DATA_CACHE.transfers = null;
        DATA_CACHE.outlets = null;
        DATA_CACHE.consignmentAudits = null;
        window._currentOutletDetail = null;
      }
      if (selectedModules.indexOf('aftersales') !== -1) {
        DATA_CACHE.aftersales = null;
        DATA_CACHE.claims = null;
        DATA_CACHE.consultations = null;
      }
    }

    // 2. Reset cart kasir lokal jika modul kasir direset
    if (selectedModules.indexOf('pos') !== -1 && typeof resetCart === 'function') {
      resetCart();
    }

    // 3. Refresh tampilan lokal modul yang sedang aktif
    const currentHash = (window.location.hash || '').replace('#', '') || 'pengaturan';
    if (typeof handleRoute === 'function') {
      handleRoute(currentHash, true);
    }
  }).catch(function (err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🗑️ Hapus Permanen Data Terpilih';
    }
    if (input) input.disabled = false;
    showToast('Gagal mereset data: ' + (err.message || err), true);
  });
}

// Window bindings untuk modal pengaturan & testing data
window.openResetDataModal = openResetDataModal;
window.closeResetDataModal = closeResetDataModal;
window.validateResetConfirmInput = validateResetConfirmInput;
window.executeResetTestingData = executeResetTestingData;
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.submitUserForm = submitUserForm;
window.openRoleModal = openRoleModal;
window.closeRoleModal = closeRoleModal;
window.submitRoleForm = submitRoleForm;
window.promptFinanceSupervisorAuth = promptFinanceSupervisorAuth;

