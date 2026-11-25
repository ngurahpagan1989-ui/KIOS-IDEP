// ========================= CYBER THEME MANAGER =========================
function initAppTheme() {
  try {
    const saved = localStorage.getItem('app_theme') || 'dark';
    if (saved === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
    updateThemeToggleBtnUI(saved);
  } catch (e) {
    console.warn('initAppTheme error', e);
  }
}

function updateThemeToggleBtnUI(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  const icon = document.getElementById('theme-toggle-icon');
  if (!icon) return;
  if (theme === 'light') {
    icon.className = 'fas fa-sun';
    icon.style.color = '#F59E0B';
    if (btn) btn.title = 'Tema: Mode Terang (Klik untuk Cyber Glass Dark)';
  } else {
    icon.className = 'fas fa-moon';
    icon.style.color = '#22D3EE';
    if (btn) btn.title = 'Tema: Cyber Glass Dark (Klik untuk Mode Terang)';
  }
}

function toggleAppTheme() {
  const isLight = document.body.classList.toggle('theme-light');
  const newTheme = isLight ? 'light' : 'dark';
  try {
    localStorage.setItem('app_theme', newTheme);
  } catch (e) { }
  updateThemeToggleBtnUI(newTheme);
  showToast(newTheme === 'light' ? 'Beralih ke Mode Terang' : 'Beralih ke Cyber Glass Dark');
}

window.initAppTheme = initAppTheme;
window.toggleAppTheme = toggleAppTheme;
try { initAppTheme(); } catch (e) { }

