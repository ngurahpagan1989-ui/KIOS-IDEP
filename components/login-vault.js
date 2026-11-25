// Komponen UI: Vault Lock System, Glassy Login Form V3, Mode PIN & Bantuan Kasir

// ========================= VAULT LOCK SYSTEM v4.2 (WEB AUDIO API & 3D MOTION) =========================
const VaultAudio = {
  ctx: null,
  enabled: true,
  init: function () {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  playClick: function () {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) { }
  },
  playWheelRatchet: function () {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) { }
  },
  playSuccess: function () {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Arpeggio nada akses brankas terbuka (C5 - E5 - G5 - C6)
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach(function (freq, i) {
        const osc = VaultAudio.ctx.createOscillator();
        const gain = VaultAudio.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.45);
        osc.connect(gain);
        gain.connect(VaultAudio.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.45);
      });
    } catch (e) { }
  },
  playError: function () {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [180, 175].forEach(function (freq) {
        const osc = VaultAudio.ctx.createOscillator();
        const gain = VaultAudio.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(VaultAudio.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      });
    } catch (e) { }
  }
};
window.VaultAudio = VaultAudio;

let vaultActiveInputId = 'login-password';
window.setVaultActiveInput = function (id) {
  vaultActiveInputId = id;
};

window.handleVaultKey = function (char) {
  VaultAudio.playClick();
  spinCamWheel(25);
  const inputEl = document.getElementById(vaultActiveInputId) || document.getElementById('login-password');
  if (inputEl) {
    inputEl.value += char;
    inputEl.focus();
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  }
};

window.handleVaultClear = function () {
  VaultAudio.playClick();
  const inputEl = document.getElementById(vaultActiveInputId) || document.getElementById('login-password');
  if (inputEl) {
    inputEl.value = '';
    inputEl.focus();
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const errorEl = document.getElementById('login-error');
  if (errorEl) errorEl.style.display = 'none';
  const lcdStatus = document.getElementById('vault-lcd-status');
  if (lcdStatus) {
    lcdStatus.textContent = 'MASUKKAN KREDENSIAL';
    lcdStatus.className = 'vault-lcd-status';
  }
};

// ========================= GLASSY LOGIN FORM V3 HELPERS =========================
window.toggleGlassyView = function (mode) {
  const front = document.getElementById('glassy-face-front');
  const back = document.getElementById('glassy-face-back');
  const card = document.getElementById('vault-door-card');
  if (window.VaultAudio && typeof window.VaultAudio.playClick === 'function') {
    window.VaultAudio.playClick();
  }

  if (mode === 'pin') {
    if (front) front.style.display = 'none';
    if (back) back.style.display = 'block';
    setVaultActiveInput('login-password');
    const userEl = document.getElementById('login-username');
    if (userEl && !userEl.value.trim()) {
      userEl.value = 'admin';
    }
  } else {
    if (back) back.style.display = 'none';
    if (front) front.style.display = 'block';
    setVaultActiveInput('login-username');
  }
  updateGlassyPinDots();
  if (card) {
    card.classList.remove('vault-shake');
    void card.offsetWidth;
  }
};

window.handleGlassyKey = function (char) {
  if (typeof handleVaultKey === 'function') {
    handleVaultKey(char);
  }
  updateGlassyPinDots();
};

window.handleGlassyClear = function () {
  if (typeof handleVaultClear === 'function') {
    handleVaultClear();
  }
  updateGlassyPinDots();
};

window.updateGlassyPinDots = function () {
  const passEl = document.getElementById('login-password');
  const len = (passEl && passEl.value) ? passEl.value.length : 0;
  const dots = document.querySelectorAll('#glassy-pin-dots .pin-dot');
  dots.forEach(function (dot, idx) {
    if (idx < len) {
      dot.classList.add('filled');
    } else {
      dot.classList.remove('filled');
    }
  });
};

window.submitGlassyPIN = function () {
  const userEl = document.getElementById('login-username');
  if (userEl && !userEl.value.trim()) {
    userEl.value = 'admin';
  }
  const submitBtn = document.getElementById('login-submit');
  if (submitBtn) {
    submitBtn.click();
  }
};

window.checkLiveServerPing = function () {
  if (typeof showToast === 'function') {
    showToast('🟢 Terhubung ke database cloud (Sistem Siap Digunakan)', false);
  }
};

let vaultWheelAngle = 0;
window.spinCamWheel = function (deg) {
  vaultWheelAngle += (deg || 60);
  const wheel = document.getElementById('vault-cam-wheel');
  if (wheel) {
    wheel.style.transform = 'rotate(' + vaultWheelAngle + 'deg)';
  }
};

window.spinCamWheelClick = function () {
  VaultAudio.playWheelRatchet();
  spinCamWheel(60);
};

window.toggleVaultSFX = function () {
  VaultAudio.enabled = !VaultAudio.enabled;
  try {
    localStorage.setItem('vault_sfx_enabled', VaultAudio.enabled ? '1' : '0');
  } catch (e) { }
  updateVaultSFXUI();
};

function updateVaultSFXUI() {
  const isEnabled = VaultAudio.enabled;
  const icon = document.getElementById('vault-sfx-icon');
  const txt = document.getElementById('vault-sfx-text');
  if (icon) icon.className = isEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
  if (txt) txt.textContent = isEnabled ? 'SFX ON' : 'SFX OFF';
}

window.setVaultTheme = function (theme) {
  const wrapper = document.querySelector('.vault-wrapper');
  if (wrapper) {
    wrapper.setAttribute('data-theme', theme);
  }
  const btnSteel = document.getElementById('btn-theme-steel');
  const btnCyber = document.getElementById('btn-theme-cyber');
  if (btnSteel && btnCyber) {
    if (theme === 'cyberpunk') {
      btnSteel.classList.remove('active');
      btnCyber.classList.add('active');
    } else {
      btnCyber.classList.remove('active');
      btnSteel.classList.add('active');
    }
  }
  try {
    localStorage.setItem('vault_theme', theme);
  } catch (e) { }
  VaultAudio.playClick();
};


// ========================= GLASSY FORM V3 FRAMER-MOTION REPRODUCTION =========================
window.switchGlassyView = function (targetView) {
  const card = document.getElementById('vault-door-card');
  const viewLogin = document.getElementById('glassy-view-login');
  const viewPin = document.getElementById('glassy-view-pin');

  if (!card || !viewLogin || !viewPin) return;

  if (window.VaultAudio && typeof window.VaultAudio.playClick === 'function') {
    window.VaultAudio.playClick();
  }

  // 1. Identify active view
  let activeView = null;
  if (viewLogin.style.display !== 'none' && viewLogin.classList.contains('active-view')) activeView = viewLogin;
  else if (viewPin.style.display !== 'none' && viewPin.classList.contains('active-view')) activeView = viewPin;
  else activeView = viewLogin;

  let nextView = targetView === 'pin' ? viewPin : viewLogin;
  if (activeView === nextView) return;

  // 2. Lock current card height to start smooth morph
  const currentHeight = card.offsetHeight;
  card.style.height = currentHeight + 'px';
  card.style.overflow = 'hidden';

  // 3. TRIGGER 3D FOLD-CLOSE ("Gerakan Menutup" - edge-on folding)
  card.classList.remove('is-opening');
  card.classList.add('is-closing');
  activeView.classList.remove('animate-in');
  activeView.classList.add('animate-out');

  // 4. Halfway (220ms), card is rotated -90deg (completely shut/edge-on):
  setTimeout(function () {
    activeView.style.display = 'none';
    activeView.classList.remove('active-view', 'animate-out');

    // Measure target natural height while edge-on
    nextView.style.visibility = 'hidden';
    nextView.style.display = 'block';
    nextView.style.position = 'relative';

    card.style.height = 'auto';
    const targetHeight = card.offsetHeight;
    card.style.height = currentHeight + 'px';
    void card.offsetHeight; // force browser reflow

    // Animate height to new target
    card.style.height = targetHeight + 'px';

    // Show next view & TRIGGER 3D SPRING-OPEN ("Gerakan Membuka Kembali")
    nextView.style.visibility = 'visible';
    nextView.classList.add('active-view', 'animate-in');

    card.classList.remove('is-closing');
    card.classList.add('is-opening');

    if (window.VaultAudio && typeof window.VaultAudio.playClank === 'function') {
      window.VaultAudio.playClank();
    }

    if (targetView === 'pin') {
      setVaultActiveInput('login-password');
      updateGlassyPinDots();
    } else {
      setVaultActiveInput('login-username');
      const userInp = document.getElementById('login-username');
      if (userInp) userInp.focus();
    }

    // 5. When opening animation completes, release fixed height & cleanup classes
    setTimeout(function () {
      card.style.height = 'auto';
      card.style.overflow = 'visible';
      card.classList.remove('is-opening');
      nextView.classList.remove('animate-in');
    }, 420);
  }, 220);
};

// Aliases for compatibility
window.toggleGlassyView = function (mode) {
  window.switchGlassyView(mode);
};

window.handleSocialLogin = function (provider) {
  if (window.VaultAudio && typeof window.VaultAudio.playClick === 'function') {
    window.VaultAudio.playClick();
  }
  if (typeof showToast === 'function') {
    showToast('Autentikasi ' + (provider === 'google' ? 'Google Workspace' : 'Apple ID') + ' sedang disiapkan untuk domain POS.', false);
  }
};

window.handleRegisterSubmit = function (e) {
  if (e && e.preventDefault) e.preventDefault();
  const name = (document.getElementById('reg-fullname') || {}).value || '';
  const email = (document.getElementById('reg-email') || {}).value || '';
  const pass = (document.getElementById('reg-password') || {}).value || '';
  const passConf = (document.getElementById('reg-password-confirm') || {}).value || '';

  if (pass !== passConf) {
    if (typeof showToast === 'function') {
      showToast('Konfirmasi kata sandi tidak cocok. Silakan periksa kembali.', true);
    }
    return false;
  }

  if (window.VaultAudio && typeof window.VaultAudio.playSuccess === 'function') {
    window.VaultAudio.playSuccess();
  }

  if (typeof showToast === 'function') {
    showToast('Akun ' + (name || email) + ' siap digunakan! Beralih ke layar masuk...', false);
  }

  const loginUserEl = document.getElementById('login-username');
  const loginPassEl = document.getElementById('login-password');
  if (loginUserEl) loginUserEl.value = email || name;
  if (loginPassEl) loginPassEl.value = pass;

  setTimeout(function () {
    window.switchGlassyView('login');
  }, 700);

  return false;
};

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
  } catch (e) { }

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
    const inputPhone = prompt('Nomor WhatsApp Admin belum dikonfigurasi di Pengaturan Toko.\nSilakan masukkan nomor WhatsApp tujuan (contoh: 08123456789):');
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


