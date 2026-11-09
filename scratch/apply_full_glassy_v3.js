const fs = require('fs');

// ================= 1. UPDATE INDEX.HTML =================
let html = fs.readFileSync('index.html', 'utf8');

const targetStart = '  <!-- ===================== LOGIN SCREEN OVERLAY (GLASSY LOGIN FORM V3) ===================== -->';
const targetEnd = '  <!-- ===================== MAIN APPLICATION SHELL ===================== -->';

const startIndex = html.indexOf(targetStart);
const endIndex = html.indexOf(targetEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error('ERROR: Could not find target markers in index.html');
  process.exit(1);
}

const replacement = `  <!-- ===================== LOGIN SCREEN OVERLAY (GLASSY LOGIN FORM V3) ===================== -->
  <div id="login-screen" class="login-screen" aria-modal="true" role="dialog">
    <div class="login-backdrop"></div>
    <div class="glassy-ambient-wave" aria-hidden="true"></div>

    <div class="glassy-card-container">
      <!-- TOP MINIMAL UTILITY BAR -->
      <div class="glassy-top-bar">
        <div class="glassy-security-pill">
          <span class="glassy-live-dot pulse-cyan"></span>
          <span class="glassy-security-text">SECURE TERMINAL</span>
        </div>
        <div class="glassy-top-actions">
          <button type="button" id="vault-sfx-toggle" class="glassy-util-btn" title="Toggle Sound FX" onclick="toggleVaultSFX()">
            <i class="fas fa-volume-up" id="vault-sfx-icon"></i> <span id="vault-sfx-text">SFX ON</span>
          </button>
          <div class="glassy-lang-pills">
            <button type="button" class="glassy-lang-btn active" data-lang="id" onclick="window.i18n && window.i18n.setLanguage('id')">ID</button>
            <button type="button" class="glassy-lang-btn" data-lang="en" onclick="window.i18n && window.i18n.setLanguage('en')">EN</button>
          </div>
        </div>
      </div>

      <!-- MAIN GLASSY CARD WITH MORPHING HEIGHT & CORNER ACCENTS -->
      <div class="login-card glassy-card vault-door" id="vault-door-card">
        <!-- Isometric Cyan Folded Corner Badges (Matching Video Frame 00:01) -->
        <div class="glassy-corner-badge glassy-corner-tl" aria-hidden="true">
          <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 24C0 10.7452 10.7452 0 24 0H40C42.2091 0 43.4357 2.55393 42.0622 4.28258L4.28258 42.0622C2.55393 43.4357 0 42.2091 0 40V24Z" fill="url(#cyan-grad-tl)" />
            <path d="M1 24C1 11.2975 11.2975 1 24 1H38L2 38V24C2 24 1 24 1 24Z" stroke="#22D3EE" stroke-width="1.6" stroke-linecap="round" />
            <defs>
              <linearGradient id="cyan-grad-tl" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                <stop stop-color="#06B6D4" stop-opacity="0.95"/>
                <stop offset="0.6" stop-color="#0284C7" stop-opacity="0.75"/>
                <stop offset="1" stop-color="#3B82F6" stop-opacity="0.3"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div class="glassy-corner-badge glassy-corner-br" aria-hidden="true">
          <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 24C0 10.7452 10.7452 0 24 0H40C42.2091 0 43.4357 2.55393 42.0622 4.28258L4.28258 42.0622C2.55393 43.4357 0 42.2091 0 40V24Z" fill="url(#cyan-grad-br)" />
            <path d="M1 24C1 11.2975 11.2975 1 24 1H38L2 38V24C2 24 1 24 1 24Z" stroke="#22D3EE" stroke-width="1.6" stroke-linecap="round" />
            <defs>
              <linearGradient id="cyan-grad-br" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                <stop stop-color="#06B6D4" stop-opacity="0.95"/>
                <stop offset="0.6" stop-color="#0284C7" stop-opacity="0.75"/>
                <stop offset="1" stop-color="#3B82F6" stop-opacity="0.3"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <!-- VIEW 1: SIGN IN (Welcome Back) - Active View -->
        <div class="glassy-view active-view" id="glassy-view-login">
          <div class="glassy-card-header">
            <h2 class="glassy-title">Welcome Back</h2>
            <p class="glassy-subtitle">Enter your credentials to access your secure account</p>
          </div>

          <form id="login-form" novalidate onsubmit="return handleLogin(event);">
            <!-- Email / Username -->
            <div class="glassy-field-group">
              <label class="glassy-field-label" for="login-username">Email Address</label>
              <div class="glassy-input-wrap">
                <span class="glassy-input-icon"><i class="far fa-envelope"></i></span>
                <input type="text" id="login-username" name="username" placeholder="name@domain.com" required autocomplete="username" autofocus onfocus="setVaultActiveInput('login-username')" style="color-scheme:dark;">
              </div>
            </div>

            <!-- Password -->
            <div class="glassy-field-group">
              <div class="glassy-label-row">
                <label class="glassy-field-label" for="login-password">Password</label>
                <a href="#" class="glassy-text-link" onclick="switchGlassyView('pin'); return false;">Forgot password?</a>
              </div>
              <div class="glassy-input-wrap">
                <span class="glassy-input-icon"><i class="fas fa-lock"></i></span>
                <input type="password" id="login-password" name="password" placeholder="••••••••••••" required autocomplete="current-password" onfocus="setVaultActiveInput('login-password')" oninput="window.updateGlassyPinDots && window.updateGlassyPinDots()" style="color-scheme:dark;">
                <button type="button" id="toggle-password-visibility" class="glassy-pwd-toggle" title="Lihat password" aria-label="Lihat password">
                  <i class="far fa-eye" id="toggle-password-icon"></i>
                </button>
              </div>
            </div>

            <!-- Remember me & Status -->
            <div class="glassy-options-row">
              <label class="glassy-checkbox-label">
                <input type="checkbox" id="login-remember-me" checked>
                <span class="glassy-custom-check"></span>
                <span class="glassy-check-text">Remember me</span>
              </label>
              <span class="glassy-status-indicator" id="vault-lcd-status">
                <span class="glassy-pulse-dot"></span> Ready
              </span>
              <span id="vault-lcd-lock" style="display:none;">TERKUNCI</span>
            </div>

            <!-- Error Banner -->
            <div id="login-error" class="glassy-alert-banner alert-danger" style="display:none;" role="alert">
              <span class="alert-icon">&#9888;</span>
              <span id="login-error-text"></span>
            </div>

            <!-- Submit Button (Sign In ->) -->
            <button type="submit" class="glassy-btn-primary" id="login-submit">
              <span id="login-submit-text">Sign In</span>
              <i class="fas fa-arrow-right" style="font-size:14px;margin-left:6px;"></i>
              <span id="login-spinner" class="spinner-border spinner-border-sm" style="display:none;margin-left:8px;" role="status" aria-hidden="true">
                <i class="fas fa-circle-notch fa-spin"></i>
              </span>
            </button>

            <!-- Divider -->
            <div class="glassy-divider">
              <span>OR CONTINUE WITH</span>
            </div>

            <!-- Social / Quick Alternative Buttons (Google & Apple) -->
            <div class="glassy-alt-actions">
              <button type="button" class="glassy-alt-btn" onclick="handleSocialLogin('google')">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                <span>Google</span>
              </button>
              <button type="button" class="glassy-alt-btn" onclick="handleSocialLogin('apple')">
                <i class="fab fa-apple" style="font-size:18px;color:#FFFFFF;"></i>
                <span>Apple</span>
              </button>
            </div>

            <!-- Footer: Switch to Sign Up (Create Account) -->
            <div class="glassy-card-footer">
              <span>Don't have an account?</span>
              <a href="#" class="glassy-link-cyan" onclick="switchGlassyView('register'); return false;">Sign Up</a>
            </div>
          </form>
        </div>

        <!-- VIEW 2: SIGN UP (Create Account - EXACT MATCH VIDEO FRAME 00:02) -->
        <div class="glassy-view" id="glassy-view-register" style="display:none;">
          <div class="glassy-card-header">
            <h2 class="glassy-title">Create Account</h2>
            <p class="glassy-subtitle">Join us today to access your secure workspace</p>
          </div>

          <form id="register-form" novalidate onsubmit="return handleRegisterSubmit(event);">
            <!-- Full Name -->
            <div class="glassy-field-group">
              <label class="glassy-field-label" for="reg-fullname">Full Name</label>
              <div class="glassy-input-wrap">
                <span class="glassy-input-icon"><i class="far fa-user"></i></span>
                <input type="text" id="reg-fullname" placeholder="John Doe" required style="color-scheme:dark;">
              </div>
            </div>

            <!-- Email Address -->
            <div class="glassy-field-group">
              <label class="glassy-field-label" for="reg-email">Email Address</label>
              <div class="glassy-input-wrap">
                <span class="glassy-input-icon"><i class="far fa-envelope"></i></span>
                <input type="email" id="reg-email" placeholder="name@domain.com" required style="color-scheme:dark;">
              </div>
            </div>

            <!-- Password & Confirm Password Row -->
            <div class="glassy-field-row-grid">
              <div class="glassy-field-group" style="margin-bottom:0;">
                <label class="glassy-field-label" for="reg-password">Password</label>
                <div class="glassy-input-wrap">
                  <span class="glassy-input-icon"><i class="fas fa-lock"></i></span>
                  <input type="password" id="reg-password" placeholder="••••••••••••" required style="color-scheme:dark;">
                </div>
              </div>
              <div class="glassy-field-group" style="margin-bottom:0;">
                <label class="glassy-field-label" for="reg-password-confirm">Confirm Password</label>
                <div class="glassy-input-wrap">
                  <span class="glassy-input-icon"><i class="fas fa-lock"></i></span>
                  <input type="password" id="reg-password-confirm" placeholder="••••••••••••" required style="color-scheme:dark;">
                </div>
              </div>
            </div>

            <!-- Terms Checkbox -->
            <div class="glassy-options-row" style="margin-top:16px;margin-bottom:20px;">
              <label class="glassy-checkbox-label">
                <input type="checkbox" id="reg-terms" checked required>
                <span class="glassy-custom-check"></span>
                <span class="glassy-check-text">I agree to the Terms &amp; Privacy Policy</span>
              </label>
            </div>

            <!-- Create Account Button -->
            <button type="submit" class="glassy-btn-primary" id="reg-submit">
              <span>Create Account</span>
              <i class="fas fa-arrow-right" style="font-size:14px;margin-left:6px;"></i>
            </button>

            <!-- Divider -->
            <div class="glassy-divider">
              <span>OR CONTINUE WITH</span>
            </div>

            <!-- Social Buttons -->
            <div class="glassy-alt-actions">
              <button type="button" class="glassy-alt-btn" onclick="handleSocialLogin('google')">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                <span>Google</span>
              </button>
              <button type="button" class="glassy-alt-btn" onclick="handleSocialLogin('apple')">
                <i class="fab fa-apple" style="font-size:18px;color:#FFFFFF;"></i>
                <span>Apple</span>
              </button>
            </div>

            <!-- Footer: Switch back to Sign In -->
            <div class="glassy-card-footer">
              <span>Already have an account?</span>
              <a href="#" class="glassy-link-cyan" onclick="switchGlassyView('login'); return false;">Sign In</a>
            </div>
          </form>
        </div>

        <!-- VIEW 3: MODE PIN KASIR (Tactile Numeric Keypad) -->
        <div class="glassy-view" id="glassy-view-pin" style="display:none;">
          <div class="glassy-card-header">
            <h2 class="glassy-title">Mode PIN Kasir</h2>
            <p class="glassy-subtitle">Ketik PIN numerik untuk akses kasir kilat</p>
          </div>

          <!-- PIN Masked Indicator -->
          <div class="glassy-pin-display-box">
            <div class="glassy-pin-dots" id="glassy-pin-dots">
              <span class="pin-dot"></span>
              <span class="pin-dot"></span>
              <span class="pin-dot"></span>
              <span class="pin-dot"></span>
              <span class="pin-dot"></span>
              <span class="pin-dot"></span>
            </div>
          </div>

          <!-- Tactile Keypad (1-9, CLR, 0, ENTER) -->
          <div class="glassy-keypad-grid">
            <button type="button" class="glassy-key" onclick="handleGlassyKey('1')">1</button>
            <button type="button" class="glassy-key" onclick="handleGlassyKey('2')">2</button>
            <button type="button" class="glassy-key" onclick="handleGlassyKey('3')">3</button>
            <button type="button" class="glassy-key" onclick="handleGlassyKey('4')">4</button>
            <button type="button" class="glassy-key" onclick="handleGlassyKey('5')">5</button>
            <button type="button" class="glassy-key" onclick="handleGlassyKey('6')">6</button>
            <button type="button" class="glassy-key" onclick="handleGlassyKey('7')">7</button>
            <button type="button" class="glassy-key" onclick="handleGlassyKey('8')">8</button>
            <button type="button" class="glassy-key" onclick="handleGlassyKey('9')">9</button>
            <button type="button" class="glassy-key glassy-key-clear" onclick="handleGlassyClear()">CLR</button>
            <button type="button" class="glassy-key" onclick="handleGlassyKey('0')">0</button>
            <button type="button" class="glassy-key glassy-key-enter" onclick="submitGlassyPIN()">
              <i class="fas fa-check"></i>
            </button>
          </div>

          <div class="glassy-card-footer" style="margin-top:20px;">
            <span>Kembali ke form masuk?</span>
            <a href="#" class="glassy-link-cyan" onclick="switchGlassyView('login'); return false;">Sign In</a>
          </div>
        </div>
      </div>

      <div class="glassy-footer-copy">
        <small>&copy; 2026 POS Kasir &amp; Manajemen Stok Terintegrasi</small>
      </div>
    </div>
  </div>

`;

html = html.substring(0, startIndex) + replacement + html.substring(endIndex);

// Bump versions
html = html.replace(/style\.css\?v=[0-9.]+/, 'style.css?v=9.2');
html = html.replace(/app\.js\?v=[0-9.]+/, 'app.js?v=11.2');

fs.writeFileSync('index.html', html, 'utf8');
console.log('SUCCESS: index.html updated!');

// ================= 2. UPDATE STYLE.CSS =================
let css = fs.readFileSync('style.css', 'utf8');

const morphCSS = `
/* ==============================================================================
   GLASSY MORPH & VIEW TRANSITIONS (SMOOTH FRAMER-MOTION ACCORDION REPRODUCTION)
   ============================================================================== */
.glassy-view {
  width: 100%;
  transform-origin: top center;
  transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), filter 0.22s ease;
}

.glassy-view.animate-out {
  opacity: 0 !important;
  transform: scale(0.95) translateY(-8px) !important;
  filter: blur(4px) !important;
  pointer-events: none !important;
}

.glassy-view.animate-in {
  animation: glassyViewEnter 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
}

@keyframes glassyViewEnter {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(12px);
    filter: blur(4px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0);
  }
}

.glassy-field-row-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

@media (max-width: 480px) {
  .glassy-field-row-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

/* Card Morphing Height Ease */
.login-card.glassy-card {
  will-change: height, transform, box-shadow;
  transition: height 0.42s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s ease, box-shadow 0.3s ease !important;
}
`;

css += '\n' + morphCSS;
fs.writeFileSync('style.css', css, 'utf8');
console.log('SUCCESS: style.css updated!');

// ================= 3. UPDATE APP.JS =================
let app = fs.readFileSync('app.js', 'utf8');

const jsMorphCode = `
// ========================= GLASSY FORM V3 FRAMER-MOTION REPRODUCTION =========================
window.switchGlassyView = function (targetView) {
  const card = document.getElementById('vault-door-card');
  const viewLogin = document.getElementById('glassy-view-login');
  const viewRegister = document.getElementById('glassy-view-register');
  const viewPin = document.getElementById('glassy-view-pin');

  if (!card || !viewLogin || !viewRegister) return;

  if (window.VaultAudio && typeof window.VaultAudio.playClick === 'function') {
    window.VaultAudio.playClick();
  }

  // 1. Identify active view
  let activeView = null;
  if (viewLogin.style.display !== 'none' && viewLogin.classList.contains('active-view')) activeView = viewLogin;
  else if (viewRegister.style.display !== 'none' && viewRegister.classList.contains('active-view')) activeView = viewRegister;
  else if (viewPin && viewPin.style.display !== 'none' && viewPin.classList.contains('active-view')) activeView = viewPin;
  else activeView = viewLogin;

  let nextView = viewLogin;
  if (targetView === 'register') nextView = viewRegister;
  else if (targetView === 'pin' && viewPin) nextView = viewPin;

  if (activeView === nextView) return;

  // 2. Lock current card height to start morphing smoothly
  const currentHeight = card.offsetHeight;
  card.style.height = currentHeight + 'px';
  card.style.overflow = 'hidden';

  // 3. Animate OUT active view
  activeView.classList.remove('animate-in');
  activeView.classList.add('animate-out');

  setTimeout(function () {
    activeView.style.display = 'none';
    activeView.classList.remove('active-view', 'animate-out');

    // 4. Measure target natural height
    nextView.style.visibility = 'hidden';
    nextView.style.display = 'block';
    nextView.style.position = 'relative';

    card.style.height = 'auto';
    const targetHeight = card.offsetHeight;
    card.style.height = currentHeight + 'px'; // reset before transition
    void card.offsetHeight; // force reflow

    // 5. Animate card height to targetHeight!
    card.style.height = targetHeight + 'px';

    // 6. Animate IN next view
    nextView.style.visibility = 'visible';
    nextView.classList.add('active-view', 'animate-in');

    if (targetView === 'pin') {
      setVaultActiveInput('login-password');
      updateGlassyPinDots();
    } else if (targetView === 'login') {
      setVaultActiveInput('login-username');
      const userInp = document.getElementById('login-username');
      if (userInp) userInp.focus();
    }

    // After animation finishes, release fixed height for responsiveness
    setTimeout(function () {
      card.style.height = 'auto';
      card.style.overflow = 'visible';
      nextView.classList.remove('animate-in');
    }, 450);
  }, 160);
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
`;

if (!app.includes('window.switchGlassyView')) {
  app += '\n' + jsMorphCode;
  fs.writeFileSync('app.js', app, 'utf8');
  console.log('SUCCESS: app.js updated with switchGlassyView animation!');
} else {
  console.log('switchGlassyView already exists in app.js.');
}

// ================= 4. UPDATE SW.JS =================
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/CACHE_NAME = 'pos-app-v[0-9.]+';/, "CACHE_NAME = 'pos-app-v12.2';");
sw = sw.replace(/style\.css\?v=[0-9.]+/, 'style.css?v=9.2');
sw = sw.replace(/app\.js\?v=[0-9.]+/, 'app.js?v=11.2');
fs.writeFileSync('sw.js', sw, 'utf8');
console.log('SUCCESS: sw.js bumped to pos-app-v12.2!');

