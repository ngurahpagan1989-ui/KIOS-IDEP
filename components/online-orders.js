// ==============================================================================
// SISTEM ANTREAN PESANAN ONLINE (KATALOG WEB -> KASIR POS)
// ==============================================================================
window.ONLINE_ORDERS_CACHE = [];
window.LAST_ONLINE_PENDING_COUNT = -1;
window.ONLINE_ORDERS_POLL_TIMER = null;
window.ACTIVE_ONLINE_ORDER_ID = null;

function playOnlineOrderDing() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) { }
}

async function fetchOnlineOrdersList() {
  if (typeof supabase === 'undefined' || !supabase) return [];
  try {
    // 1. Coba tabel online_orders
    const { data, error } = await supabase
      .from('online_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && Array.isArray(data)) {
      data.forEach(function (o) {
        if (!o.id && o.order_no) o.id = o.order_no;
      });
      return data;
    }
  } catch (e) { }

  // 2. Fallback otomatis ke tabel settings
  try {
    const { data: setData, error: setErr } = await supabase
      .from('settings')
      .select('key, value, updated_at')
      .like('key', 'online_order_%')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (!setErr && Array.isArray(setData)) {
      const list = [];
      setData.forEach(function (row) {
        try {
          const parsed = JSON.parse(row.value);
          if (parsed && parsed.order_no) {
            if (!parsed.id) {
              parsed.id = row.key.replace('online_order_', '') || parsed.order_no;
            }
            list.push(parsed);
          }
        } catch (err) { }
      });
      return list;
    }
  } catch (e) { }

  return [];
}

function updateOnlineOrderBadgesUI(orders) {
  const list = Array.isArray(orders) ? orders : [];
  const pendingOrders = list.filter(function (o) { return o && o.status === 'pending'; });
  const count = pendingOrders.length;

  const badge = document.getElementById('pos-online-order-badge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }

  const dashBadge = document.getElementById('dash-online-order-badge');
  if (dashBadge) {
    dashBadge.textContent = count;
    dashBadge.style.display = count > 0 ? 'inline-block' : 'none';
  }

  const dashCountEl = document.getElementById('dash-online-order-count');
  if (dashCountEl) {
    dashCountEl.textContent = count + ' Pesanan';
  }

  return pendingOrders;
}

async function checkOnlineOrdersBadge(silent) {
  const orders = await fetchOnlineOrdersList();
  window.ONLINE_ORDERS_CACHE = orders;
  const pendingOrders = updateOnlineOrderBadgesUI(orders);
  const count = pendingOrders.length;

  if (!silent && window.LAST_ONLINE_PENDING_COUNT !== undefined && window.LAST_ONLINE_PENDING_COUNT !== -1 && count > window.LAST_ONLINE_PENDING_COUNT) {
    playOnlineOrderDing();
    const latest = pendingOrders[0];
    showToast('🛒 Pesanan baru masuk dari katalog online: #' + (latest ? latest.order_no : '') + ' (' + count + ' antrean)!');
  }

  window.LAST_ONLINE_PENDING_COUNT = count;
  return orders;
}

function startOnlineOrdersPolling() {
  checkOnlineOrdersBadge(true);
  if (window.ONLINE_ORDERS_POLL_TIMER) clearInterval(window.ONLINE_ORDERS_POLL_TIMER);
  window.ONLINE_ORDERS_POLL_TIMER = setInterval(function () {
    const currentRoute = (typeof getCurrentRoute === 'function') ? getCurrentRoute() : '';
    if (currentRoute === 'pos' || currentRoute === 'dashboard' || document.getElementById('btn-pos-online-orders') || document.getElementById('dash-online-order-count')) {
      checkOnlineOrdersBadge(false);
    }
  }, 25000);
}

function openOnlineOrderQueueModal(activeTab) {
  if (!activeTab) activeTab = 'pending';
  openModal(
    '📦 Antrean Pesanan Katalog Online',
    '<div class="empty-state" style="padding:28px;"><span class="sync-spinner" style="display:inline-block;width:24px;height:24px;margin-bottom:8px;"></span><br>Mengambil data antrean pesanan online...</div>',
    '',
    true
  );

  fetchOnlineOrdersList().then(function (orders) {
    window.ONLINE_ORDERS_CACHE = orders;
    updateOnlineOrderBadgesUI(orders);
    renderOnlineOrderQueueModalContent(orders, activeTab);
  }).catch(function (err) {
    openModal(
      '📦 Antrean Pesanan Katalog Online',
      '<div class="empty-state" style="padding:24px;color:var(--danger);"><i class="fas fa-exclamation-triangle" style="font-size:28px;margin-bottom:8px;"></i><br>Gagal memuat antrean pesanan: ' + escapeHtml(err.message || err) + '</div>',
      '<button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>',
      true
    );
  });
}


// ========================= KANBAN DRAG & DROP FOR ONLINE ORDERS =========================
window.ONLINE_ORDERS_VIEW_MODE = window.ONLINE_ORDERS_VIEW_MODE || 'kanban';
window.ONLINE_ORDERS_ACTIVE_TAB = window.ONLINE_ORDERS_ACTIVE_TAB || 'pending';

window.handleKanbanDragStart = function (event, orderId) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', String(orderId));
    event.dataTransfer.effectAllowed = 'move';
  }
  const card = event.currentTarget;
  if (card) {
    card.classList.add('is-dragging');
  }
};

window.handleKanbanDragEnd = function (event) {
  const card = event.currentTarget;
  if (card) {
    card.classList.remove('is-dragging');
  }
  document.querySelectorAll('.kanban-column').forEach(function (col) {
    col.classList.remove('drag-over');
  });
};

window.handleKanbanDragOver = function (event) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  const col = event.currentTarget;
  if (col && !col.classList.contains('drag-over')) {
    col.classList.add('drag-over');
  }
};

window.handleKanbanDragLeave = function (event) {
  const col = event.currentTarget;
  if (col) {
    col.classList.remove('drag-over');
  }
};

window.handleKanbanDrop = function (event, targetStatus) {
  event.preventDefault();
  const col = event.currentTarget;
  if (col) {
    col.classList.remove('drag-over');
  }
  const orderId = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
  if (!orderId) return;
  updateOnlineOrderStatus(orderId, targetStatus);
};

window.setOnlineOrdersViewMode = function (mode) {
  window.ONLINE_ORDERS_VIEW_MODE = mode;
  renderOnlineOrderQueueModalContent(window.ONLINE_ORDERS_CACHE || [], window.ONLINE_ORDERS_ACTIVE_TAB || 'pending');
};

function renderOnlineOrderQueueModalContent(orders, activeTab) {
  orders = Array.isArray(orders) ? orders : [];
  window.ONLINE_ORDERS_CACHE = orders;
  window.ONLINE_ORDERS_ACTIVE_TAB = activeTab || 'pending';
  const viewMode = window.ONLINE_ORDERS_VIEW_MODE || 'kanban';

  const pendingList = orders.filter(function (o) { return !o.status || o.status === 'pending' || o.status === 'baru'; });
  const processingList = orders.filter(function (o) { return o.status === 'processing' || o.status === 'packing' || o.status === 'proses'; });
  const readyList = orders.filter(function (o) { return o.status === 'ready' || o.status === 'siap'; });
  const completedList = orders.filter(function (o) { return o.status === 'completed' || o.status === 'selesai'; });

  // Header Toolbar: Mode Switcher & Stats
  const topToolbar =
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.08);">' +
    '  <div style="display:flex;gap:6px;align-items:center;">' +
    '    <button type="button" class="btn btn-sm ' + (viewMode === 'kanban' ? 'btn-primary' : 'btn-secondary') + '" onclick="setOnlineOrdersViewMode(\'kanban\')" style="display:inline-flex;align-items:center;gap:6px;">' +
    '      <i class="fas fa-columns"></i> Papan Kanban' +
    '    </button>' +
    '    <button type="button" class="btn btn-sm ' + (viewMode === 'list' ? 'btn-primary' : 'btn-secondary') + '" onclick="setOnlineOrdersViewMode(\'list\')" style="display:inline-flex;align-items:center;gap:6px;">' +
    '      <i class="fas fa-list"></i> Tampilan Daftar' +
    '    </button>' +
    '  </div>' +
    '  <div style="display:flex;gap:8px;align-items:center;">' +
    '    <span style="font-size:12px;color:var(--text-secondary);">' + orders.length + ' Total Pesanan</span>' +
    '    <button type="button" class="btn btn-secondary btn-sm" onclick="openOnlineOrderQueueModal(\'' + activeTab + '\')" title="Segarkan Antrean"><i class="fas fa-sync-alt"></i></button>' +
    '  </div>' +
    '</div>';

  let bodyContent = '';

  if (viewMode === 'kanban') {
    // Helper to render individual cards inside Kanban column
    function renderKanbanCard(order, colStatus) {
      const orderKey = String(order.id || order.order_no || '').trim();
      const waNum = (order.customer_phone || '').replace(/[^0-9]/g, '');
      const cleanWa = waNum.startsWith('0') ? ('62' + waNum.slice(1)) : waNum;
      const waUrl = 'https://wa.me/' + cleanWa + '?text=' + encodeURIComponent('Halo ' + (order.customer_name || 'Pelanggan') + ', kami dari Kasir mengonfirmasi pesanan online #' + order.order_no + '.');

      const itemsList = Array.isArray(order.items) ? order.items : [];
      const itemsPreview = itemsList.map(function (it) {
        return escapeHtml(it.name || 'Produk') + ' (' + (it.qty || 1) + ')';
      }).join(', ');

      let quickActions = '';
      if (colStatus === 'pending') {
        quickActions =
          '<button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation();loadOnlineOrderToPosCart(\'' + escapeHtml(orderKey) + '\')" style="font-size:11px;padding:3px 8px;" title="Muat ke Kasir POS"><i class="fas fa-cart-arrow-down"></i> Ke Kasir</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();updateOnlineOrderStatus(\'' + escapeHtml(orderKey) + '\', \'processing\')" style="font-size:11px;padding:3px 8px;color:#38BDF8;" title="Mulai Kemas"><i class="fas fa-box-open"></i> Kemas</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();updateOnlineOrderStatus(\'' + escapeHtml(orderKey) + '\', \'cancelled\')" style="font-size:11px;padding:3px 6px;color:#EF4444;" title="Batalkan"><i class="fas fa-times"></i></button>';
      } else if (colStatus === 'processing') {
        quickActions =
          '<button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation();loadOnlineOrderToPosCart(\'' + escapeHtml(orderKey) + '\')" style="font-size:11px;padding:3px 8px;" title="Muat ke Kasir POS"><i class="fas fa-cart-arrow-down"></i> Ke Kasir</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();updateOnlineOrderStatus(\'' + escapeHtml(orderKey) + '\', \'ready\')" style="font-size:11px;padding:3px 8px;color:#FBBF24;" title="Tandai Siap"><i class="fas fa-motorcycle"></i> Siap</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();updateOnlineOrderStatus(\'' + escapeHtml(orderKey) + '\', \'completed\')" style="font-size:11px;padding:3px 8px;color:#34D399;" title="Selesai"><i class="fas fa-check"></i> Selesai</button>';
      } else if (colStatus === 'ready') {
        quickActions =
          '<button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation();updateOnlineOrderStatus(\'' + escapeHtml(orderKey) + '\', \'completed\')" style="font-size:11px;padding:3px 10px;background:#10B981;border-color:#059669;" title="Tandai Transaksi Selesai"><i class="fas fa-check-circle"></i> Selesaikan Pesanan</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();loadOnlineOrderToPosCart(\'' + escapeHtml(orderKey) + '\')" style="font-size:11px;padding:3px 8px;" title="Buka di Kasir"><i class="fas fa-cash-register"></i> Kasir</button>';
      } else {
        quickActions =
          '<span style="font-size:11px;color:#34D399;font-weight:700;"><i class="fas fa-check-double"></i> Selesai Tuntas</span>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();loadOnlineOrderToPosCart(\'' + escapeHtml(orderKey) + '\')" style="font-size:10px;padding:2px 6px;">Cetak Ulang</button>';
      }

      return (
        '<div class="kanban-card" draggable="true" ondragstart="handleKanbanDragStart(event, \'' + escapeHtml(orderKey) + '\')" ondragend="handleKanbanDragEnd(event)">' +
        '  <div class="kanban-card-top">' +
        '    <span class="kanban-card-orderno">#' + escapeHtml(order.order_no) + '</span>' +
        '    <span style="font-size:10.5px;color:var(--text-secondary);">' + formatDate(order.created_at) + '</span>' +
        '  </div>' +
        '  <div class="kanban-card-customer" style="display:flex;justify-content:space-between;align-items:center;">' +
        '    <span><i class="fas fa-user" style="color:#06B6D4;margin-right:4px;"></i>' + escapeHtml(order.customer_name || 'Pelanggan') + '</span>' +
        (cleanWa ? ('<a href="' + waUrl + '" target="_blank" onclick="event.stopPropagation()" style="color:#34D399;text-decoration:none;font-size:11px;display:inline-flex;align-items:center;gap:3px;background:rgba(16,185,129,0.15);padding:1px 6px;border-radius:10px;border:1px solid rgba(16,185,129,0.3);"><i class="fab fa-whatsapp"></i> WA</a>') : '') +
        '  </div>' +
        '  <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">' +
        '    <i class="fas fa-truck" style="margin-right:4px;"></i>' + escapeHtml(order.delivery_method || 'Ambil di Toko') +
        '  </div>' +
        (order.notes ? ('<div style="font-size:10.5px;color:#FBBF24;background:rgba(245,158,11,0.1);padding:4px 8px;border-radius:4px;margin-bottom:6px;border:1px dashed rgba(245,158,11,0.25);">📝 ' + escapeHtml(order.notes) + '</div>') : '') +
        '  <div class="kanban-card-items-summary" title="' + escapeHtml(itemsPreview) + '">' +
        '    <i class="fas fa-box" style="margin-right:4px;"></i>' + itemsList.length + ' item: ' + (itemsPreview.length > 40 ? (itemsPreview.slice(0, 40) + '...') : itemsPreview) +
        '  </div>' +
        '  <div class="kanban-card-total">' +
        '    <span style="font-size:11px;color:var(--text-secondary);">Total:</span>' +
        '    <span>Rp ' + Number(order.total || 0).toLocaleString('id-ID') + '</span>' +
        '  </div>' +
        '  <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06);flex-wrap:wrap;">' +
        quickActions +
        '  </div>' +
        '  <div style="font-size:9.5px;color:rgba(255,255,255,0.25);text-align:right;margin-top:4px;">⋮⋮ Tarik kartu</div>' +
        '</div>'
      );
    }

    // Render 4 Columns
    function renderCol(colId, title, icon, colorHex, list) {
      let cards = '';
      if (list.length === 0) {
        cards = '<div style="text-align:center;padding:30px 10px;color:var(--text-secondary);font-size:12px;border:1px dashed rgba(255,255,255,0.08);border-radius:6px;">Tarik pesanan ke sini</div>';
      } else {
        cards = list.map(function (o) { return renderKanbanCard(o, colId); }).join('');
      }

      return (
        '<div class="kanban-column" ondragover="handleKanbanDragOver(event)" ondragleave="handleKanbanDragLeave(event)" ondrop="handleKanbanDrop(event, \'' + colId + '\')">' +
        '  <div class="kanban-col-header">' +
        '    <div class="kanban-col-title" style="color:' + colorHex + ';">' +
        '      <i class="' + icon + '"></i> ' + title +
        '    </div>' +
        '    <span class="kanban-col-count" style="background:rgba(255,255,255,0.08);color:' + colorHex + ';">' + list.length + '</span>' +
        '  </div>' +
        '  <div class="kanban-card-list">' + cards + '</div>' +
        '</div>'
      );
    }

    bodyContent =
      topToolbar +
      '<div style="font-size:11.5px;color:var(--text-secondary);margin-bottom:10px;display:flex;align-items:center;gap:6px;">' +
      '  <i class="fas fa-hand-pointer" style="color:#06B6D4;"></i> Tarik & lepas (Drag and Drop) kartu pesanan antar kolom untuk mengubah status secara seketika.' +
      '</div>' +
      '<div class="kanban-board">' +
      renderCol('pending', 'Pesanan Masuk', 'fas fa-clock', '#FBBF24', pendingList) +
      renderCol('processing', 'Sedang Dikemas', 'fas fa-box-open', '#38BDF8', processingList) +
      renderCol('ready', 'Siap Diambil/Kirim', 'fas fa-motorcycle', '#A78BFA', readyList) +
      renderCol('completed', 'Selesai', 'fas fa-check-circle', '#34D399', completedList) +
      '</div>';

  } else {
    // Mode List Tradisional (Upgraded Cyber Styling)
    let filtered = orders;
    if (activeTab === 'pending') {
      filtered = pendingList;
    } else if (activeTab === 'completed') {
      filtered = completedList;
    }

    const tabNavHtml =
      '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">' +
      '  <button type="button" class="btn btn-sm ' + (activeTab === 'pending' ? 'btn-primary' : 'btn-secondary') + '" onclick="renderOnlineOrderQueueModalContent(window.ONLINE_ORDERS_CACHE, \'pending\')">' +
      '    🟡 Menunggu Diproses (' + pendingList.length + ')' +
      '  </button>' +
      '  <button type="button" class="btn btn-sm ' + (activeTab === 'completed' ? 'btn-primary' : 'btn-secondary') + '" onclick="renderOnlineOrderQueueModalContent(window.ONLINE_ORDERS_CACHE, \'completed\')">' +
      '    🟢 Selesai (' + completedList.length + ')' +
      '  </button>' +
      '  <button type="button" class="btn btn-sm ' + (activeTab === 'all' ? 'btn-primary' : 'btn-secondary') + '" onclick="renderOnlineOrderQueueModalContent(window.ONLINE_ORDERS_CACHE, \'all\')">' +
      '    Semua Pesanan (' + orders.length + ')' +
      '  </button>' +
      '</div>';

    if (filtered.length === 0) {
      bodyContent = topToolbar + tabNavHtml +
        '<div class="empty-state" style="padding:32px 16px;text-align:center;">' +
        '  <i class="fas fa-inbox" style="font-size:36px;color:#94A3B8;margin-bottom:8px;display:block;"></i>' +
        '  <div style="font-weight:700;color:var(--text-main);">Tidak ada pesanan pada filter ini.</div>' +
        '</div>';
    } else {
      let cardsHtml = '<div style="display:flex;flex-direction:column;gap:12px;max-height:60vh;overflow-y:auto;padding-right:4px;">';
      filtered.forEach(function (order) {
        const isPending = !order.status || order.status === 'pending' || order.status === 'baru';
        const isCompleted = order.status === 'completed' || order.status === 'selesai';
        const orderKey = String(order.id || order.order_no || '').trim();

        const waNum = (order.customer_phone || '').replace(/[^0-9]/g, '');
        const cleanWa = waNum.startsWith('0') ? ('62' + waNum.slice(1)) : waNum;
        const waUrl = 'https://wa.me/' + cleanWa + '?text=' + encodeURIComponent('Halo ' + (order.customer_name || 'Pelanggan') + ', kami dari Kasir mengonfirmasi pesanan online #' + order.order_no + '.');

        let itemsTable = '<table style="width:100%;font-size:11.5px;border-collapse:collapse;margin:8px 0;background:rgba(15,23,42,0.6);border-radius:6px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">' +
          '<thead><tr style="background:rgba(255,255,255,0.04);color:var(--text-secondary);text-align:left;"><th style="padding:6px 8px;">Produk</th><th style="padding:6px 8px;text-align:center;">Qty</th><th style="padding:6px 8px;text-align:right;">Harga</th><th style="padding:6px 8px;text-align:right;">Subtotal</th></tr></thead><tbody>';

        (order.items || []).forEach(function (it) {
          itemsTable += '<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">' +
            '<td style="padding:5px 8px;font-weight:600;color:var(--text-main);">' + escapeHtml(it.name) + (it.variant ? (' <small style="color:var(--text-secondary);">(' + escapeHtml(it.variant) + ')</small>') : '') + '</td>' +
            '<td style="padding:5px 8px;text-align:center;color:var(--text-secondary);">' + it.qty + ' ' + escapeHtml(it.unit || 'pcs') + '</td>' +
            '<td style="padding:5px 8px;text-align:right;color:var(--text-secondary);">Rp ' + Number(it.price || 0).toLocaleString('id-ID') + '</td>' +
            '<td style="padding:5px 8px;text-align:right;font-weight:700;color:#22D3EE;">Rp ' + Number(it.subtotal || 0).toLocaleString('id-ID') + '</td>' +
            '</tr>';
        });
        itemsTable += '</tbody></table>';

        let actionBtns = '';
        if (isPending) {
          actionBtns =
            '<div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap;">' +
            '  <button type="button" class="btn btn-primary btn-sm" onclick="loadOnlineOrderToPosCart(\'' + escapeHtml(orderKey) + '\')">' +
            '    <i class="fas fa-cart-arrow-down"></i> Muat ke Keranjang Kasir' +
            '  </button>' +
            '  <button type="button" class="btn btn-secondary btn-sm" onclick="updateOnlineOrderStatus(\'' + escapeHtml(orderKey) + '\', \'processing\')" style="color:#38BDF8;">' +
            '    <i class="fas fa-box-open"></i> Kemas' +
            '  </button>' +
            '  <button type="button" class="btn btn-secondary btn-sm" onclick="updateOnlineOrderStatus(\'' + escapeHtml(orderKey) + '\', \'completed\')" style="color:#34D399;">' +
            '    <i class="fas fa-check"></i> Tandai Selesai' +
            '  </button>' +
            '  <button type="button" class="btn btn-secondary btn-sm" onclick="updateOnlineOrderStatus(\'' + escapeHtml(orderKey) + '\', \'cancelled\')" style="color:#EF4444;">' +
            '    <i class="fas fa-times"></i> Batalkan' +
            '  </button>' +
            '</div>';
        }

        cardsHtml +=
          '<div style="border:1px solid rgba(255,255,255,0.09);border-radius:8px;padding:12px 14px;background:rgba(22,30,46,0.85);box-shadow:0 4px 14px rgba(0,0,0,0.3);">' +
          '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px;">' +
          '    <div>' +
          '      <span style="font-family:monospace;font-weight:900;font-size:14px;color:#22D3EE;">#' + escapeHtml(order.order_no) + '</span>' +
          '      <span style="font-size:11px;color:var(--text-secondary);margin-left:8px;">' + formatDate(order.created_at) + '</span>' +
          '    </div>' +
          '    <div>' + (isPending ? '<span class="badge badge-warning">Menunggu Kasir</span>' : (isCompleted ? '<span class="badge badge-success">Selesai</span>' : '<span class="badge">Dibatalkan</span>')) + '</div>' +
          '  </div>' +
          '  <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
          '    <strong style="color:var(--text-main);"><i class="fas fa-user" style="color:#06B6D4;margin-right:4px;"></i>' + escapeHtml(order.customer_name || 'Pelanggan') + '</strong>' +
          (cleanWa ? ('<a href="' + waUrl + '" target="_blank" style="color:#34D399;text-decoration:none;font-weight:700;display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,0.15);padding:2px 8px;border-radius:12px;border:1px solid rgba(16,185,129,0.3);"><i class="fab fa-whatsapp"></i> ' + escapeHtml(order.customer_phone || '-') + '</a>') : '') +
          '    <span>&bull; Metode: <strong>' + escapeHtml(order.delivery_method || 'Ambil di Toko') + '</strong></span>' +
          '  </div>' +
          (order.notes ? ('<div style="font-size:11.5px;color:#FBBF24;background:rgba(245,158,11,0.1);padding:6px 10px;border-radius:4px;border:1px dashed rgba(245,158,11,0.3);margin-bottom:6px;">📝 Catatan: ' + escapeHtml(order.notes) + '</div>') : '') +
          itemsTable +
          '  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">' +
          '    <span style="font-size:11.5px;color:var(--text-secondary);">Total Tagihan:</span>' +
          '    <strong style="font-size:14px;color:#34D399;">Rp ' + Number(order.total || 0).toLocaleString('id-ID') + '</strong>' +
          '  </div>' +
          actionBtns +
          '</div>';
      });
      cardsHtml += '</div>';
      bodyContent = topToolbar + tabNavHtml + cardsHtml;
    }
  }

  openModal(
    '📦 Antrean Pesanan Katalog Online',
    bodyContent,
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>',
    true
  );
}


function loadOnlineOrderToPosCart(orderId) {
  let targetId = String(orderId || '').trim();
  let order = (window.ONLINE_ORDERS_CACHE || []).find(function (o) {
    return (o.id && String(o.id).trim() === targetId) || (o.order_no && String(o.order_no).trim() === targetId);
  });

  if (!order && window.ONLINE_ORDERS_CACHE && window.ONLINE_ORDERS_CACHE.length === 1) {
    order = window.ONLINE_ORDERS_CACHE[0];
  }

  if (!order) {
    showToast('Pesanan tidak ditemukan.', true);
    return;
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    showToast('Item pesanan kosong.', true);
    return;
  }

  const prods = (typeof PRODUCTS_CACHE !== 'undefined' && PRODUCTS_CACHE && PRODUCTS_CACHE.length)
    ? PRODUCTS_CACHE
    : (getCachedData('products') || []);

  const wasEditing = !!EDITING_TRANSACTION;
  EDITING_TRANSACTION = null;
  CART = [];
  SELECTED_CUSTOMER = null;
  order.items.forEach(function (it) {
    let matched = prods.find(function (p) { return p.id === it.product_id || p.id === it.id; });
    if (!matched) {
      matched = prods.find(function (p) { return p.name.toLowerCase().trim() === it.name.toLowerCase().trim(); });
    }

    const tierName = 'Reguler';
    if (matched) {
      let defaultExpDate = '';
      if (matched.batches && matched.batches.length > 0) {
        const withExp = matched.batches.filter(function (b) { return b.expiry_date; });
        if (withExp.length > 0) {
          defaultExpDate = formatDate(withExp[0].expiry_date);
        }
      }

      const cartKey = matched.id + '__' + tierName;
      const price = Number(it.price || matched.price || 0);

      CART.push({
        cart_key: cartKey,
        id: matched.id,
        product_id: matched.id,
        name: matched.variant ? (matched.name + ' (' + matched.variant + ')') : matched.name,
        tier_name: tierName,
        price: price,
        qty: Number(it.qty || 1),
        unit: matched.unit || it.unit || 'pcs',
        weight_grams: Number(matched.weight_grams || 0),
        is_seed: !!matched.is_seed,
        is_bundled: !!matched.is_bundled,
        selected_batch_id: '',
        selected_expiry: defaultExpDate
      });
    } else {
      const fallbackId = it.product_id || it.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('item-' + Date.now()));
      const cartKey = fallbackId + '__' + tierName;

      CART.push({
        cart_key: cartKey,
        id: fallbackId,
        product_id: fallbackId,
        name: it.name,
        tier_name: tierName,
        price: Number(it.price || 0),
        qty: Number(it.qty || 1),
        unit: it.unit || 'pcs',
        weight_grams: 0,
        is_seed: false,
        is_bundled: false,
        selected_batch_id: '',
        selected_expiry: ''
      });
    }
  });

  const custList = (typeof CUSTOMERS_CACHE !== 'undefined' && CUSTOMERS_CACHE && CUSTOMERS_CACHE.length)
    ? CUSTOMERS_CACHE
    : (getCachedData('customers') || []);
  const orderCustName = (order.customer_name || '').trim();
  const orderCustPhone = (order.customer_phone || '').trim();
  const matchedCust = orderCustName
    ? custList.find(function (c) { return c.name && c.name.toLowerCase() === orderCustName.toLowerCase(); })
    : null;

  if (matchedCust) {
    SELECTED_CUSTOMER = Object.assign({}, matchedCust, {
      phone: matchedCust.phone || orderCustPhone
    });
  } else if (orderCustName) {
    SELECTED_CUSTOMER = { id: '', name: orderCustName, phone: orderCustPhone, category: 'Reguler' };
  } else {
    SELECTED_CUSTOMER = null;
  }

  window.ACTIVE_ONLINE_ORDER_ID = order.id || order.order_no;
  window.ACTIVE_ONLINE_ORDER_NO = order.order_no || '';
  window.ACTIVE_ONLINE_ORDER_DATA = order;

  const custInput = document.getElementById('pos-customer-input');
  const phoneInput = document.getElementById('pos-customer-phone-input');
  const saveChk = document.getElementById('pos-save-member-chk');
  if (saveChk) saveChk.checked = false;

  if (custInput && !wasEditing) {
    custInput.value = orderCustName;
    if (phoneInput) {
      const resolvedPhone = orderCustPhone || (SELECTED_CUSTOMER && SELECTED_CUSTOMER.phone) || '';
      phoneInput.value = resolvedPhone;
      if (resolvedPhone) syncPosCustomerPhone(resolvedPhone);
    }
    if (typeof handleCustomerInput === 'function') handleCustomerInput(orderCustName);
    const phoneWrap = document.getElementById('pos-member-phone-wrap');
    if (phoneWrap) phoneWrap.style.display = 'block';
    closeModal();
    renderCart();
    switchPOSMobilePane('cart');
  } else {
    closeModal();
    window.PENDING_POS_ONLINE_CART = true;
    if (location.hash === '#pos' && typeof renderPOS === 'function') {
      renderPOS(false);
    } else {
      location.hash = '#pos';
    }
  }
  showToast('Pesanan #' + order.order_no + ' berhasil dimuat ke kasir! Silakan pilih metode bayar dan selesaikan transaksi.');
}

async function updateOnlineOrderStatus(orderId, newStatus) {
  const sb = (typeof window !== 'undefined' && window.supabase) ? window.supabase : (typeof supabase !== 'undefined' ? supabase : null);
  if (!sb) return;

  const targetId = String(orderId || '').trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId);

  let targetOrderNo = isUuid ? '' : targetId;
  let targetUuid = isUuid ? targetId : '';

  // 1. Segera update cache memori lokal agar UI antrean langsung sinkron seketika
  if (Array.isArray(window.ONLINE_ORDERS_CACHE)) {
    const cachedOrder = window.ONLINE_ORDERS_CACHE.find(function (o) {
      return (o.id && String(o.id).trim() === targetId) || (o.order_no && String(o.order_no).trim() === targetId);
    });
    if (cachedOrder) {
      cachedOrder.status = newStatus;
      cachedOrder.updated_at = new Date().toISOString();
      if (cachedOrder.order_no) targetOrderNo = cachedOrder.order_no;
      if (cachedOrder.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cachedOrder.id)) {
        targetUuid = cachedOrder.id;
      }
    }
  }

  // Perbarui tampilan badge dan modal seketika
  const activeOrders = window.ONLINE_ORDERS_CACHE || [];
  updateOnlineOrderBadgesUI(activeOrders);
  const modalTitle = document.querySelector('#modal-title');
  if (modalTitle && modalTitle.textContent.includes('Pesanan')) {
    renderOnlineOrderQueueModalContent(activeOrders, 'pending');
  }

  let updated = false;

  // 2. Coba via RPC Security Definer jika targetUuid valid
  if (targetUuid) {
    try {
      const { data: rpcData, error: rpcErr } = await sb.rpc('update_online_order_status', {
        p_order_id: targetUuid,
        p_status: newStatus
      });
      if (!rpcErr && rpcData && rpcData.success) {
        updated = true;
      }
    } catch (e) { }
  }

  // 3. Coba direct update ke tabel online_orders (aman tanpa UUID casting crash)
  if (!updated) {
    try {
      let query = sb.from('online_orders').update({ status: newStatus, updated_at: new Date().toISOString() });
      if (targetUuid) {
        query = query.eq('id', targetUuid);
      } else if (targetOrderNo) {
        query = query.eq('order_no', targetOrderNo);
      } else {
        query = query.eq('id', targetId);
      }
      const { data, error } = await query.select();
      if (!error && Array.isArray(data) && data.length > 0) {
        updated = true;
      }
    } catch (e) {
      console.warn('Direct update online_orders failed:', e);
    }
  }

  // 4. Fallback tabel settings jika masih menggunakan key-value
  if (!updated) {
    try {
      const { data: setRows } = await sb
        .from('settings')
        .select('key, value')
        .like('key', 'online_order_%');

      if (Array.isArray(setRows)) {
        for (let i = 0; i < setRows.length; i++) {
          const row = setRows[i];
          try {
            const parsed = JSON.parse(row.value);
            if (
              String(parsed.id) === targetId ||
              String(parsed.order_no) === targetId ||
              (targetOrderNo && String(parsed.order_no) === targetOrderNo) ||
              row.key === ('online_order_' + targetId)
            ) {
              parsed.status = newStatus;
              parsed.updated_at = new Date().toISOString();
              await sb.from('settings').update({ value: JSON.stringify(parsed) }).eq('key', row.key);
              updated = true;
              break;
            }
          } catch (e) { }
        }
      }
    } catch (e) {
      console.warn('Update online order in settings failed:', e);
    }
  }

  showToast(newStatus === 'completed' ? 'Pesanan berhasil diselesaikan! ✅' : (newStatus === 'cancelled' ? 'Pesanan dibatalkan.' : 'Status pesanan diperbarui.'));

  // Sinkronisasi ulang dengan database di background
  checkOnlineOrdersBadge(true).then(function (freshOrders) {
    const title = document.querySelector('#modal-title');
    if (title && title.textContent.includes('Pesanan')) {
      renderOnlineOrderQueueModalContent(freshOrders, 'pending');
    }
  });
}

window.openOnlineOrderQueueModal = openOnlineOrderQueueModal;
window.renderOnlineOrderQueueModalContent = renderOnlineOrderQueueModalContent;
window.loadOnlineOrderToPosCart = loadOnlineOrderToPosCart;
window.updateOnlineOrderStatus = updateOnlineOrderStatus;
window.checkOnlineOrdersBadge = checkOnlineOrdersBadge;
window.startOnlineOrdersPolling = startOnlineOrdersPolling;
window.updateOnlineOrderBadgesUI = updateOnlineOrderBadgesUI;
