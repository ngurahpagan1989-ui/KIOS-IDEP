const fs = require('fs');

console.log('=== UPDATING TO SUPPORT & GUIDE BUTTONS (OPSI 3) ===');

// 1. UPDATE index.html
let html = fs.readFileSync('index.html', 'utf8');

const oldActionsBlock = `            <!-- Social / Quick Alternative Buttons (Google & Apple) -->
            <div class="glassy-alt-actions">
              <button type="button" class="glassy-alt-btn" onclick="handleSocialLogin('google')">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                <span>Google</span>
              </button>
              <button type="button" class="glassy-alt-btn" onclick="handleSocialLogin('apple')">
                <i class="fab fa-apple" style="font-size:18px;color:#FFFFFF;"></i>
                <span>Apple</span>
              </button>
            </div>`;

const oldActionsBlock2 = `            <!-- Social Buttons -->
            <div class="glassy-alt-actions">
              <button type="button" class="glassy-alt-btn" onclick="handleSocialLogin('google')">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                <span>Google</span>
              </button>
              <button type="button" class="glassy-alt-btn" onclick="handleSocialLogin('apple')">
                <i class="fab fa-apple" style="font-size:18px;color:#FFFFFF;"></i>
                <span>Apple</span>
              </button>
            </div>`;

const newActionsBlock = `            <!-- Support / Help Buttons (WhatsApp & Panduan Kasir) -->
            <div class="glassy-alt-actions">
              <button type="button" class="glassy-alt-btn glassy-btn-wa" onclick="handleLoginWhatsAppSupport()" title="Hubungi Admin via WhatsApp">
                <i class="fab fa-whatsapp" style="font-size:18px;color:#25D366;"></i>
                <span>Bantuan WA</span>
              </button>
              <button type="button" class="glassy-alt-btn glassy-btn-guide" onclick="openLoginGuideModal()" title="Buka Panduan Singkat Kasir">
                <i class="fas fa-book-open" style="font-size:16px;color:#38BDF8;"></i>
                <span>Panduan Kasir</span>
              </button>
            </div>`;

// Replace Divider text
html = html.replace(/<span>OR CONTINUE WITH<\/span>/g, '<span>BANTUAN &amp; DUKUNGAN KASIR</span>');

if (html.includes(oldActionsBlock)) {
  html = html.replace(oldActionsBlock, newActionsBlock);
  console.log('Replaced Sign In social buttons in index.html');
} else {
  console.log('Warning: oldActionsBlock 1 not matched exactly');
}

if (html.includes(oldActionsBlock2)) {
  html = html.replace(oldActionsBlock2, newActionsBlock);
  console.log('Replaced Sign Up social buttons in index.html');
} else {
  console.log('Warning: oldActionsBlock 2 not matched exactly');
}

// Update Footer Links to include Mode PIN shortcut and bilingual clarity
html = html.replace(
  `<span>Don't have an account?</span>\n              <a href="#" class="glassy-link-cyan" onclick="switchGlassyView('register'); return false;">Sign Up</a>`,
  `<span>Belum punya akun?</span> <a href="#" class="glassy-link-cyan" onclick="switchGlassyView('register'); return false;">Daftar Akun</a> &bull; <a href="#" class="glassy-link-cyan" onclick="switchGlassyView('pin'); return false;">Mode PIN 🔢</a>`
);

html = html.replace(
  `<span>Already have an account?</span>\n              <a href="#" class="glassy-link-cyan" onclick="switchGlassyView('login'); return false;">Sign In</a>`,
  `<span>Sudah punya akun?</span> <a href="#" class="glassy-link-cyan" onclick="switchGlassyView('login'); return false;">Masuk ke Sistem</a>`
);

// Bump version in index.html
html = html.replace(/style\.css\?v=13\.0/g, 'style.css?v=13.1');
html = html.replace(/app\.js\?v=13\.0/g, 'app.js?v=13.1');

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated index.html to v=13.1');

// 2. UPDATE app.js (Add WhatsApp Support and Guide Modal handlers)
let app = fs.readFileSync('app.js', 'utf8');

const supportFunctions = `
// ==================== BANTUAN & PANDUAN KASIR (LOGIN SCREEN) ====================
window.handleLoginWhatsAppSupport = function () {
  if (window.VaultAudio && typeof window.VaultAudio.playClick === 'function') {
    window.VaultAudio.playClick();
  }

  let phone = '';
  try {
    const raw = localStorage.getItem('ekasir_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.store_phone) phone = String(parsed.store_phone).trim();
    }
  } catch (e) {}

  if (!phone && typeof APP_SETTINGS !== 'undefined' && APP_SETTINGS && APP_SETTINGS.store_phone) {
    phone = String(APP_SETTINGS.store_phone).trim();
  }

  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('62') && cleanPhone.length > 8) {
    cleanPhone = '62' + cleanPhone;
  }

  const msg = encodeURIComponent('Halo Admin/Owner, saya staf kasir butuh bantuan terkait akses masuk / kendala kredensial akun di aplikasi Kasir.');

  if (cleanPhone && cleanPhone.length >= 10) {
    window.open('https://wa.me/' + cleanPhone + '?text=' + msg, '_blank');
  } else {
    const inputPhone = prompt('Nomor WhatsApp Admin belum dikonfigurasi di Pengaturan Toko.\\nSilakan masukkan nomor WhatsApp tujuan (contoh: 08123456789):');
    if (inputPhone) {
      let c = inputPhone.replace(/[^0-9]/g, '');
      if (c.startsWith('0')) c = '62' + c.slice(1);
      window.open('https://wa.me/' + c + '?text=' + msg, '_blank');
    }
  }
};

window.openLoginGuideModal = function () {
  if (window.VaultAudio && typeof window.VaultAudio.playClick === 'function') {
    window.VaultAudio.playClick();
  }

  let existing = document.getElementById('login-guide-modal-overlay');
  if (existing) {
    existing.style.display = 'flex';
    return;
  }

  const modalHtml = 
    '<div id="login-guide-modal-overlay" class="login-guide-modal-overlay" onclick="if(event.target===this) closeLoginGuideModal()">' +
    '  <div class="login-guide-modal-card">' +
    '    <div class="login-guide-modal-header">' +
    '      <h3 class="login-guide-modal-title">' +
    '        <i class="fas fa-book-open" style="color:#38BDF8;"></i>' +
    '        <span>Panduan Singkat Kasir &amp; Akses Masuk</span>' +
    '      </h3>' +
    '      <button type="button" class="login-guide-modal-close" onclick="closeLoginGuideModal()" title="Tutup">✕</button>' +
    '    </div>' +
    '    <div class="login-guide-modal-body">' +
    '      <div class="login-guide-item">' +
    '        <div class="login-guide-item-title">' +
    '          <i class="fas fa-key"></i> Kredensial &amp; Masuk Sistem' +
    '        </div>' +
    '        <div>Gunakan <strong>Username / Email</strong> dan <strong>Password</strong> yang telah didaftarkan oleh Administrator Toko. Anda juga dapat menggunakan <strong>Mode PIN Kasir</strong> untuk login cepat melalui layar sentuh tanpa mengetik panjang.</div>' +
    '      </div>' +

    '      <div class="login-guide-item">' +
    '        <div class="login-guide-item-title">' +
    '          <i class="fas fa-wifi"></i> Dukungan Offline-First (Tanpa Internet)' +
    '        </div>' +
    '        <div>Aplikasi kasir ini tetap dapat digunakan melayani transaksi penjualan saat internet toko sedang mati (offline). Semua struk transaksi otomatis tersimpan di penyimpanan lokal dan akan sinkron ke cloud saat koneksi internet pulih.</div>' +
    '      </div>' +

    '      <div class="login-guide-item">' +
    '        <div class="login-guide-item-title">' +
    '          <i class="fas fa-keyboard"></i> Pintasan Keyboard Kasir (Shortcuts)' +
    '        </div>' +
    '        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;font-size:12px;">' +
    '          <div><kbd style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;color:#22D3EE;">F2</kbd> : Cari Produk</div>' +
    '          <div><kbd style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;color:#22D3EE;">F4</kbd> : Bayar / Checkout</div>' +
    '          <div><kbd style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;color:#22D3EE;">F8</kbd> : Tahan (Hold) Nota</div>' +
    '          <div><kbd style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;color:#22D3EE;">ESC</kbd> : Tutup Jendela</div>' +
    '        </div>' +
    '      </div>' +

    '      <div class="login-guide-item" style="margin-bottom:0;">' +
    '        <div class="login-guide-item-title">' +
    '          <i class="fab fa-whatsapp" style="color:#25D366;"></i> Lupa Password / Bantuan Teknis' +
    '        </div>' +
    '        <div>Jika mengalami kendala akun terkunci atau lupa kata sandi, silakan klik tombol <strong>Bantuan WA</strong> untuk langsung menghubungi Admin / Pemilik Toko.</div>' +
    '      </div>' +
    '    </div>' +
    '    <div class="login-guide-modal-footer">' +
    '      <button type="button" class="btn btn-secondary btn-sm" onclick="handleLoginWhatsAppSupport()">' +
    '        <i class="fab fa-whatsapp" style="color:#25D366;margin-right:6px;"></i> Chat Admin' +
    '      </button>' +
    '      <button type="button" class="btn btn-primary btn-sm" onclick="closeLoginGuideModal()" style="min-width:100px;">' +
    '        Mengerti &amp; Tutup' +
    '      </button>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closeLoginGuideModal = function () {
  if (window.VaultAudio && typeof window.VaultAudio.playClick === 'function') {
    window.VaultAudio.playClick();
  }
  const el = document.getElementById('login-guide-modal-overlay');
  if (el) {
    el.style.display = 'none';
  }
};
`;

app += supportFunctions;
fs.writeFileSync('app.js', app, 'utf8');
console.log('Successfully appended support functions to app.js');

// 3. UPDATE style.css (Modal styles & button hovers)
let css = fs.readFileSync('style.css', 'utf8');

const supportCss = `
/* ==============================================================================
   PANDUAN KASIR & DUKUNGAN MODAL (LOGIN SCREEN)
   ============================================================================== */
.glassy-alt-btn.glassy-btn-wa:hover {
  border-color: rgba(37, 211, 102, 0.45) !important;
  box-shadow: 0 0 16px rgba(37, 211, 102, 0.25) !important;
  color: #4ADE80 !important;
}

.glassy-alt-btn.glassy-btn-guide:hover {
  border-color: rgba(56, 189, 248, 0.45) !important;
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.25) !important;
  color: #38BDF8 !important;
}

.login-guide-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(8, 13, 26, 0.78);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.2s ease forwards;
}

.login-guide-modal-card {
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(6, 182, 212, 0.35);
  border-radius: 18px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(6, 182, 212, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.login-guide-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(22, 30, 46, 0.8);
}

.login-guide-modal-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #F8FAFC;
  display: flex;
  align-items: center;
  gap: 10px;
}

.login-guide-modal-close {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94A3B8;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.login-guide-modal-close:hover {
  background: rgba(239, 68, 68, 0.25);
  color: #EF4444;
  border-color: rgba(239, 68, 68, 0.45);
}

.login-guide-modal-body {
  padding: 18px 20px;
  overflow-y: auto;
  color: #CBD5E1;
  font-size: 12.5px;
  line-height: 1.6;
}

.login-guide-item {
  background: rgba(30, 41, 59, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 10px;
}

.login-guide-item-title {
  font-weight: 700;
  color: #22D3EE;
  font-size: 13px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-guide-modal-footer {
  padding: 12px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(22, 30, 46, 0.6);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
`;

css += supportCss;
fs.writeFileSync('style.css', css, 'utf8');
console.log('Successfully appended support styles to style.css');

// 4. UPDATE sw.js (Bump to v13.1)
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/const CACHE_NAME = 'pos-app-v[^']+';/, "const CACHE_NAME = 'pos-app-v13.1';");
sw = sw.replace(/'\.\/style\.css\?v=[^']+'/, "'./style.css?v=13.1'");
sw = sw.replace(/'\.\/app\.js\?v=[^']+'/, "'./app.js?v=13.1'");
fs.writeFileSync('sw.js', sw, 'utf8');
console.log('Successfully patched sw.js to v=13.1');

