const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const targetStart = '  <!-- ===================== LOGIN SCREEN OVERLAY (VAULT LOCK SYSTEM) ===================== -->';
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
      <!-- TOP UTILITY / SECURITY BAR -->
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

      <!-- MAIN GLASSY CARD -->
      <div class="glassy-card-flipper" id="glassy-card-flipper">
        <div class="login-card glassy-card vault-door" id="vault-door-card">
          <!-- Geometric Cyan Corner Accents (Signature Video Feature) -->
          <svg class="glassy-corner-badge glassy-corner-tl" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path d="M0 14V0H14L32 0L0 32V14Z" fill="url(#corner-grad-tl)" stroke="#22D3EE" stroke-width="1.2"/>
            <defs>
              <linearGradient id="corner-grad-tl" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stop-color="#06B6D4" stop-opacity="0.95"/>
                <stop offset="1" stop-color="#3B82F6" stop-opacity="0.4"/>
              </linearGradient>
            </defs>
          </svg>
          <svg class="glassy-corner-badge glassy-corner-br" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path d="M0 14V0H14L32 0L0 32V14Z" fill="url(#corner-grad-br)" stroke="#22D3EE" stroke-width="1.2"/>
            <defs>
              <linearGradient id="corner-grad-br" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stop-color="#06B6D4" stop-opacity="0.95"/>
                <stop offset="1" stop-color="#3B82F6" stop-opacity="0.4"/>
              </linearGradient>
            </defs>
          </svg>

          <!-- FRONT FACE: CREDENTIALS LOGIN (Welcome Back) -->
          <div class="glassy-face glassy-face-front" id="glassy-face-front">
            <div class="glassy-card-header">
              <h2 class="glassy-title">Welcome Back</h2>
              <p class="glassy-subtitle">Enter your credentials to access your secure account</p>
            </div>

            <!-- Login Form -->
            <form id="login-form" novalidate onsubmit="return handleLogin(event);">
              <!-- Username / Email Input -->
              <div class="glassy-field-group">
                <label class="glassy-field-label" for="login-username">Email Address / Username</label>
                <div class="glassy-input-wrap">
                  <span class="glassy-input-icon"><i class="far fa-envelope"></i></span>
                  <input type="text" id="login-username" name="username" placeholder="name@domain.com atau admin" required autocomplete="username" autofocus onfocus="setVaultActiveInput('login-username')" style="color-scheme:dark;">
                </div>
              </div>

              <!-- Password Input -->
              <div class="glassy-field-group">
                <div class="glassy-label-row">
                  <label class="glassy-field-label" for="login-password">Password</label>
                  <a href="#" class="glassy-text-link" onclick="toggleGlassyView('pin'); return false;">Mode PIN?</a>
                </div>
                <div class="glassy-input-wrap">
                  <span class="glassy-input-icon"><i class="fas fa-lock"></i></span>
                  <input type="password" id="login-password" name="password" placeholder="••••••••••••" required autocomplete="current-password" onfocus="setVaultActiveInput('login-password')" oninput="window.updateGlassyPinDots && window.updateGlassyPinDots()" style="color-scheme:dark;">
                  <button type="button" id="toggle-password-visibility" class="glassy-pwd-toggle" title="Lihat password" aria-label="Lihat password">
                    <i class="far fa-eye" id="toggle-password-icon"></i>
                  </button>
                </div>
              </div>

              <!-- Remember Me & Status Row -->
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

              <!-- Error Alert Banner -->
              <div id="login-error" class="glassy-alert-banner alert-danger" style="display:none;" role="alert">
                <span class="alert-icon">&#9888;</span>
                <span id="login-error-text"></span>
              </div>

              <!-- Primary Sign In Button -->
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

              <!-- Quick Action / Alternative Buttons (Google / Apple Style from Video) -->
              <div class="glassy-alt-actions">
                <button type="button" class="glassy-alt-btn" onclick="toggleGlassyView('pin')">
                  <i class="fas fa-calculator" style="color:#22D3EE;"></i>
                  <span>Mode PIN Kasir</span>
                </button>
                <button type="button" class="glassy-alt-btn" onclick="checkLiveServerPing()">
                  <i class="fas fa-wifi" style="color:#34D399;"></i>
                  <span>Cloud Live</span>
                </button>
              </div>

              <!-- Footer Toggle -->
              <div class="glassy-card-footer">
                <span>Akses kasir kilat?</span>
                <a href="#" class="glassy-link-cyan" onclick="toggleGlassyView('pin'); return false;">Mode PIN Kasir</a>
              </div>
            </form>
          </div>

          <!-- BACK FACE: TACTILE PIN KEYPAD (Flip Mode like Video Frame 00:02) -->
          <div class="glassy-face glassy-face-back" id="glassy-face-back" style="display:none;">
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
              <span>Sudah punya akun?</span>
              <a href="#" class="glassy-link-cyan" onclick="toggleGlassyView('login'); return false;">Masuk dengan Password</a>
            </div>
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

// Bump style.css and app.js versions
html = html.replace(/style\.css\?v=[0-9.]+/, 'style.css?v=9.1');
html = html.replace(/app\.js\?v=[0-9.]+/, 'app.js?v=11.1');

fs.writeFileSync('index.html', html, 'utf8');
console.log('SUCCESS: index.html updated with Glassy Login Form v3!');

