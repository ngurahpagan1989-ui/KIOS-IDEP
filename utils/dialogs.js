// Modul: Toast Notifikasi, Modal & Dialog Kustom

let _toastTimer = null;
window.CONFIG_ALERT_DIALOG_ERRORS = true; // Error otomatis tampil sebagai kotak dialog di tengah layar

function showToast(message, isError, forceToast) {
  if (typeof message === 'string' && window.t) {
    message = window.t(message);
  }
  // Jika parameter isError bernilai true dan tidak dipaksa toast, tampilkan kotak dialog error di tengah layar
  if (isError && !forceToast && window.CONFIG_ALERT_DIALOG_ERRORS) {
    showAlertDialog({
      title: 'Terjadi Kesalahan',
      message: message,
      type: 'error'
    });
    return;
  }

  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');
  if (!toast) return;

  if (_toastTimer) {
    clearTimeout(_toastTimer);
    _toastTimer = null;
  }

  if (toastMsg) toastMsg.textContent = message;
  if (toastIcon) {
    if (isError) {
      toastIcon.innerHTML = '<i class="fas fa-triangle-exclamation"></i>';
    } else {
      toastIcon.innerHTML = '<i class="fas fa-circle-check"></i>';
    }
  }

  toast.className = 'toast show' + (isError ? ' toast-error' : '');
  toast.style.display = 'flex';

  _toastTimer = setTimeout(function () {
    toast.style.display = 'none';
    toast.className = 'toast';
    _toastTimer = null;
  }, 3500);
}


function syncModalOpenState() {
  const activeModals = document.querySelectorAll('.modal-overlay[style*="display: flex"], .modal-overlay[style*="display: block"], .modal-overlay.active');
  if (activeModals.length === 0) {
    document.body.classList.remove('modal-open');
  }
}

function closeModal() {
  const modalContainer = document.getElementById('modal-container');
  if (modalContainer) modalContainer.style.display = 'none';
  const dialog = document.getElementById('modal-dialog');
  if (dialog) {
    dialog.className = 'modal-dialog';
    dialog.style.width = '';
    dialog.style.maxWidth = '';
    dialog.style.maxHeight = '';
    dialog.style.overflowY = '';
    dialog.style.padding = '';
  }
  document.querySelectorAll('.modal-overlay:not(#confirm-modal):not(#alert-modal):not(#modal-container):not(#delivery-signature-modal):not(#delivery-receipt-modal):not(#pod-view-modal):not(#modal-reset-data):not(#modal-qc-entry):not(#modal-qc-photo-viewer):not(#modal-user-entry):not(#modal-role-entry):not(#idle-timeout-modal)').forEach(function (m) {
    m.remove();
  });
  syncModalOpenState();
  window._currentAuditData = null;
}


// ========================= MODAL & DIALOG KUSTOM =========================
function showConfirmDialog(title, message, onConfirm, isDanger) {
  const modal = document.getElementById('confirm-modal');
  if (!modal) return;

  const titleEl = modal.querySelector('.confirm-title');
  const msgEl = modal.querySelector('.confirm-message');
  const okBtn = document.getElementById('confirm-ok-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');

  if (titleEl) titleEl.textContent = (window.t && typeof title === 'string') ? window.t(title) : title;
  if (msgEl) msgEl.textContent = (window.t && typeof message === 'string') ? window.t(message) : message;

  const cleanupConfirm = function () {
    modal.style.display = 'none';
    const mainModal = document.getElementById('modal-container');
    if (!mainModal || mainModal.style.display === 'none') {
      document.body.classList.remove('modal-open');
    }
  };

  if (okBtn) {
    okBtn.className = 'btn ' + (isDanger ? 'btn-danger' : 'btn-primary');
    okBtn.onclick = function () {
      cleanupConfirm();
      if (typeof onConfirm === 'function') onConfirm();
    };
  }

  if (cancelBtn) {
    cancelBtn.onclick = function () { cleanupConfirm(); };
  }

  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

// ========================= KOTAK DIALOG STATUS & ALERT TENGAH LAYAR =========================
let _alertModalCallback = null;
let _alertModalTimer = null;

function showAlertDialog(titleOrOpts, message, type, onClose) {
  let opts = {};
  if (typeof titleOrOpts === 'object' && titleOrOpts !== null) {
    opts = Object.assign({}, titleOrOpts);
  } else {
    opts = {
      title: titleOrOpts,
      message: message,
      type: type || 'info',
      onClose: onClose
    };
  }

  const modal = document.getElementById('alert-modal');
  if (!modal) {
    alert((opts.title ? opts.title + ':\n' : '') + (opts.message || ''));
    if (typeof opts.onClose === 'function') opts.onClose();
    return;
  }

  const titleEl = document.getElementById('alert-modal-title');
  const msgEl = document.getElementById('alert-modal-message');
  const iconEl = document.getElementById('alert-modal-icon');
  const okBtn = document.getElementById('alert-modal-ok-btn');
  const dialogCard = modal.querySelector('.alert-modal-dialog');

  const alertType = (opts.type || 'info').toLowerCase();

  if (_alertModalTimer) {
    clearTimeout(_alertModalTimer);
    _alertModalTimer = null;
  }

  // Teks Judul Default berdasarkan Tipe
  let defaultTitle = 'Pemberitahuan';
  if (alertType === 'error') defaultTitle = 'Terjadi Kesalahan';
  else if (alertType === 'warning') defaultTitle = 'Perhatian';
  else if (alertType === 'success') defaultTitle = 'Berhasil';

  const finalTitle = opts.title || defaultTitle;
  const finalMsg = opts.message || '';

  if (titleEl) {
    titleEl.textContent = (window.t && typeof finalTitle === 'string') ? window.t(finalTitle) : finalTitle;
  }

  if (msgEl) {
    if (opts.html) {
      msgEl.innerHTML = finalMsg;
      if (window.i18n && window.i18n.translateDOM) window.i18n.translateDOM(msgEl);
    } else {
      msgEl.textContent = (window.t && typeof finalMsg === 'string') ? window.t(finalMsg) : finalMsg;
    }
  }

  // Set tipe styling pada dialog card
  if (dialogCard) {
    dialogCard.className = 'modal-dialog modal-dialog-sm alert-modal-dialog alert-type-' + alertType;
  }

  // Ganti icon sesuai tipe alert
  if (iconEl) {
    if (alertType === 'error') {
      iconEl.className = 'fas fa-circle-xmark';
    } else if (alertType === 'warning') {
      iconEl.className = 'fas fa-triangle-exclamation';
    } else if (alertType === 'success') {
      iconEl.className = 'fas fa-circle-check';
    } else {
      iconEl.className = 'fas fa-circle-info';
    }
  }

  // Tombol aksi
  if (okBtn) {
    const btnSpan = okBtn.querySelector('span');
    const defaultBtnText = alertType === 'error' ? 'Tutup' : 'Mengerti';
    if (btnSpan) {
      btnSpan.textContent = opts.buttonText || opts.okText || defaultBtnText;
    } else {
      okBtn.textContent = opts.buttonText || opts.okText || defaultBtnText;
    }

    if (alertType === 'error') {
      okBtn.className = 'btn btn-danger alert-modal-btn';
    } else if (alertType === 'warning') {
      okBtn.className = 'btn btn-warning alert-modal-btn';
    } else {
      okBtn.className = 'btn btn-primary alert-modal-btn';
    }
  }

  _alertModalCallback = typeof opts.onClose === 'function' ? opts.onClose : null;

  // Auto-close opsional (misal: autoCloseMs = 3000)
  if (opts.autoCloseMs && typeof opts.autoCloseMs === 'number') {
    _alertModalTimer = setTimeout(function () {
      closeAlertDialog();
    }, opts.autoCloseMs);
  }

  modal.style.display = 'flex';
  document.body.classList.add('modal-open');

  // Auto-focus tombol agar kasir bisa langsung tekan Enter / Spasi
  setTimeout(function () {
    if (okBtn) okBtn.focus();
  }, 60);
}

function closeAlertDialog() {
  const modal = document.getElementById('alert-modal');
  if (_alertModalTimer) {
    clearTimeout(_alertModalTimer);
    _alertModalTimer = null;
  }
  if (modal) {
    modal.style.display = 'none';
  }
  syncModalOpenState();

  const cb = _alertModalCallback;
  _alertModalCallback = null;
  if (typeof cb === 'function') {
    try { cb(); } catch (e) { console.error('Error in alert callback:', e); }
  }
}

// Keyboard listener global untuk menutup dialog modal tengah dengan Enter / Escape
document.addEventListener('keydown', function (e) {
  const alertModal = document.getElementById('alert-modal');
  if (alertModal && alertModal.style.display === 'flex') {
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      closeAlertDialog();
    }
  }
});

// Shortcut fungsi pembantu (helper functions)
window.showAlertDialog = showAlertDialog;
window.showAlert = showAlertDialog;
window.closeAlertDialog = closeAlertDialog;

window.showErrorDialog = function (message, title, onClose) {
  return showAlertDialog({ title: title || 'Terjadi Kesalahan', message: message, type: 'error', onClose: onClose });
};

window.showSuccessDialog = function (message, title, onClose) {
  return showAlertDialog({ title: title || 'Berhasil', message: message, type: 'success', onClose: onClose });
};

window.showWarningDialog = function (message, title, onClose) {
  return showAlertDialog({ title: title || 'Perhatian', message: message, type: 'warning', onClose: onClose });
};

window.showInfoDialog = function (message, title, onClose) {
  return showAlertDialog({ title: title || 'Informasi', message: message, type: 'info', onClose: onClose });
};

// Dialog status tengah dengan durasi otomatis hilang (misal status transaksi atau sinkronisasi)
window.showCenterStatus = function (message, type, autoCloseMs, onClose) {
  return showAlertDialog({
    title: type === 'error' ? 'Gagal' : type === 'warning' ? 'Perhatian' : 'Status Sistem',
    message: message,
    type: type || 'success',
    autoCloseMs: autoCloseMs || 2600,
    buttonText: 'Tutup',
    onClose: onClose
  });
};

function showPromptDialog(title, message, defaultValue, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '2100';
  overlay.innerHTML =
    '<div class="modal-backdrop"></div>' +
    '<div class="modal-dialog modal-dialog-sm">' +
    '<div class="modal-header">' +
    '<h3 class="modal-title">' + escapeHtml(title) + '</h3>' +
    '<button type="button" class="modal-close-btn" id="prompt-close">&times;</button>' +
    '</div>' +
    '<div class="modal-body">' +
    '<p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px;">' + escapeHtml(message) + '</p>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="prompt-input" value="' + escapeHtml(defaultValue || '') + '" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '<div class="modal-footer">' +
    '<button type="button" class="btn btn-secondary" id="prompt-cancel">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="prompt-ok">Lanjutkan</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');

  const input = overlay.querySelector('#prompt-input');
  const close = function () {
    overlay.remove();
    const mainModal = document.getElementById('modal-container');
    if (!mainModal || mainModal.style.display === 'none') {
      document.body.classList.remove('modal-open');
    }
  };

  overlay.querySelector('#prompt-close').onclick = close;
  overlay.querySelector('#prompt-cancel').onclick = close;
  overlay.querySelector('#prompt-ok').onclick = function () {
    const val = input.value.trim();
    close();
    if (val && typeof onConfirm === 'function') onConfirm(val);
  };
  input.focus();
}

function openModal(title, bodyHtml, footerHtml, isLarge) {
  const container = document.getElementById('modal-container');
  const dialog = document.getElementById('modal-dialog');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const footerEl = document.getElementById('modal-footer');

  if (!container || !dialog) return;

  dialog.className = 'modal-dialog';
  dialog.style.width = '';
  dialog.style.maxWidth = '';
  dialog.style.maxHeight = '';
  dialog.style.overflowY = '';
  dialog.style.padding = '';

  if (isLarge) {
    dialog.classList.add('modal-dialog-lg');
  } else {
    dialog.classList.remove('modal-dialog-lg');
  }

  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;
  if (footerEl) footerEl.innerHTML = footerHtml;

  const closeBtn = document.getElementById('modal-close-btn');
  const backdrop = document.getElementById('modal-backdrop');
  if (closeBtn) closeBtn.onclick = closeModal;
  if (backdrop) backdrop.onclick = closeModal;

  container.style.display = 'flex';
  document.body.classList.add('modal-open');
}

