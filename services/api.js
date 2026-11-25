// Modul Layanan API: Client API Wrapper, Permission Guard & Central Supabase Dispatcher

window.__API_UNHANDLED = Symbol('API_UNHANDLED');

// ========================= NETWORK API & UTILITIES =========================
function setProgressLoading(isLoading) {
  const bar = document.getElementById('top-progress-bar');
  const sync = document.getElementById('sync-indicator');
  if (isLoading) {
    ACTIVE_REQUESTS_COUNT++;
    if (bar) bar.style.display = 'block';
    if (sync) sync.style.display = 'flex';
  } else {
    ACTIVE_REQUESTS_COUNT = Math.max(0, ACTIVE_REQUESTS_COUNT - 1);
    if (ACTIVE_REQUESTS_COUNT === 0) {
      if (bar) bar.style.display = 'none';
      if (sync) sync.style.display = 'none';
    }
  }
}

function api(fnName, ...args) {
  if (API_DELETE_MODULE_MAP[fnName] && !userCanDelete(API_DELETE_MODULE_MAP[fnName])) {
    const errDel = new Error('Akses ditolak: Peran Anda tidak memiliki izin menghapus / membatalkan data pada modul ini.');
    showToast(errDel.message, true);
    return Promise.reject(errDel);
  }
  if (API_WRITE_MODULE_MAP[fnName] && !userCanEdit(API_WRITE_MODULE_MAP[fnName])) {
    const errEdit = new Error('Akses ditolak: Akun Anda berada dalam Mode Pantau (View-Only) dan tidak diizinkan mengubah data.');
    showToast(errEdit.message, true);
    return Promise.reject(errEdit);
  }
  setProgressLoading(true);
  if (typeof window.dispatchApiCall === 'function') {
    return Promise.resolve(window.dispatchApiCall(fnName, args))
      .catch(function (err) {
        const errMsg = err && err.message ? err.message : String(err);
        if (errMsg.includes('UNAUTHORIZED') || errMsg.includes('JWT expired')) {
          handleLogout();
          showToast('Sesi berakhir. Silakan login kembali.', true);
        }
        throw err;
      })
      .finally(function () {
        setProgressLoading(false);
      });
  }
  if (typeof window.api === 'function' && window.api !== api) {
    return Promise.resolve(window.api(fnName, ...args))
      .finally(function () {
        setProgressLoading(false);
      });
  }
  return new Promise(function (resolve, reject) {
    if (!window.google || !google.script || !google.script.run) {
      setProgressLoading(false);
      reject(new Error('Koneksi sistem backend belum terhubung. Pastikan Supabase client aktif.'));
      return;
    }
    google.script.run
      .withSuccessHandler(function (res) {
        setProgressLoading(false);
        resolve(res);
      })
      .withFailureHandler(function (err) {
        setProgressLoading(false);
        const errMsg = err && err.message ? err.message : String(err);
        if (errMsg.includes('UNAUTHORIZED')) {
          handleLogout();
          showToast('Sesi berakhir. Silakan login kembali.', true);
        }
        reject(err);
      })
    [fnName](...args);
  });
}


async function dispatchApiCall(fnName, args) {
  if (!supabase) {
    throw new Error('Koneksi Supabase belum terpasang. Periksa SUPABASE_CONFIG.');
  }

  if (typeof handleCoreApi === 'function') {
    const coreResult = await handleCoreApi(fnName, args);
    if (coreResult !== window.__API_UNHANDLED) return coreResult;
  }
  if (typeof handleSalesApi === 'function') {
    const salesResult = await handleSalesApi(fnName, args);
    if (salesResult !== window.__API_UNHANDLED) return salesResult;
  }
  if (typeof handleReportsApi === 'function') {
    const reportsResult = await handleReportsApi(fnName, args);
    if (reportsResult !== window.__API_UNHANDLED) return reportsResult;
  }

  // DEFAULT FALLBACK: PANGGIL RPC ATAU TABEL POSTGREST SESUAI NAMA
  console.warn(`[Supabase Bridge] Menjalankan fallback RPC/Tabel untuk fungsi '${fnName}'`);
  const { data: rpcData, error: rpcError } = await supabase.rpc(fnName, args[1] || {});
  if (!rpcError) return rpcData;

  throw new Error(`Fungsi backend '${fnName}' belum diimplementasikan pada supabaseClient.`);
}

window.dispatchApiCall = dispatchApiCall;
window.importBulkProducts = (token, productsArray) => dispatchApiCall('importBulkProducts', [token, productsArray]);
