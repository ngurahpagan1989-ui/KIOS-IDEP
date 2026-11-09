const fs = require('fs');

let app = fs.readFileSync('app.js', 'utf8');

const targetStr = 'let vaultWheelAngle = 0;';

const helpers = `// ========================= GLASSY LOGIN FORM V3 HELPERS =========================
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

let vaultWheelAngle = 0;`;

if (!app.includes('window.toggleGlassyView')) {
  app = app.replace(targetStr, helpers);
  fs.writeFileSync('app.js', app, 'utf8');
  console.log('SUCCESS: app.js updated with Glassy Login helpers!');
} else {
  console.log('Helpers already exist in app.js.');
}

