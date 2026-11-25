// Modul: Penyimpanan Aman & Sesi Browser
// ========================= PENYIMPANAN AMAN & SESI BROWSER =========================
function getSafeSession(key) {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  } catch (e) {
    return window['__mem_' + key] || '';
  }
}

function setSafeSession(key, val) {
  try {
    sessionStorage.setItem(key, val);
    localStorage.setItem(key, val);
  } catch (e) {
    window['__mem_' + key] = val;
  }
}

function removeSafeSession(key) {
  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch (e) {
    delete window['__mem_' + key];
  }
}

