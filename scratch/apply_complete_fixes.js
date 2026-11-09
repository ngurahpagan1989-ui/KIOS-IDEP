const fs = require('fs');

console.log('=== STARTING COMPLETE UPDATE ===');

// 1. UPDATE app.js (switchGlassyView & Promo Banner outer card)
let app = fs.readFileSync('app.js', 'utf8');

// A. Update switchGlassyView to add 3D FOLD-CLOSE & SPRING-OPEN ("Gerakan Menutup")
const oldSwitchRegex = /window\.switchGlassyView\s*=\s*function\s*\([\s\S]*?\}\s*;\s*\n\s*\/\/ Aliases for compatibility/;
const newSwitchCode = `window.switchGlassyView = function (targetView) {
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
    card.style.height = currentHeight + 'px'; // reset before height transition
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
    } else if (targetView === 'login') {
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

// Aliases for compatibility`;

if (oldSwitchRegex.test(app)) {
  app = app.replace(oldSwitchRegex, newSwitchCode);
  console.log('Successfully replaced switchGlassyView in app.js');
} else {
  console.error('Could not find switchGlassyView in app.js with regex!');
}

// B. Update Promo Banner card in app.js to have explicit dark styling
const oldPromoCard = '\'<div class="card" style="margin-top:20px;border-top:3px solid var(--primary);">';
const newPromoCard = '\'<div class="card" style="margin-top:20px;border-top:3px solid var(--primary);background:rgba(17,24,39,0.85);border:1px solid rgba(255,255,255,0.08);color:var(--text-main);box-shadow:0 4px 20px rgba(0,0,0,0.35);border-radius:var(--radius-md);padding:20px;">';

if (app.includes(oldPromoCard)) {
  app = app.replace(oldPromoCard, newPromoCard);
  console.log('Successfully updated Promo Banner outer card in app.js');
} else {
  console.log('Promo card already has custom style or not matched directly');
}

fs.writeFileSync('app.js', app, 'utf8');

console.log('=== APP.JS UPDATED ===');

