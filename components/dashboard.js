// ========================= DASHBOARD =========================
function renderDashboard(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  if (typeof checkOnlineOrdersBadge === 'function') {
    checkOnlineOrdersBadge(true);
  }

  const cached = getCachedData('dashboard');
  if (!forceRefresh && cached) {
    drawDashboardUI(cached);
    if (isCacheValid('dashboard')) return;
  } else {
    content.innerHTML =
      '<div class="content-skeleton-loader">' +
      '<div class="skeleton-header"></div>' +
      '<div class="skeleton-grid">' +
      '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>' +
      '</div>' +
      '</div>';
  }

  api('getDashboardSummary', TOKEN).then(function (data) {
    data = data || {};
    setCachedData('dashboard', data);
    drawDashboardUI(data);
  }).catch(function (err) {
    if (!cached) {
      showToast('Gagal memuat dashboard: ' + (err.message || err), true);
    }
  });
}

function drawDashboardUI(data) {
  const content = document.getElementById('content');
  if (!content) return;

  const todaySales = Number(data.todaySales || 0);
  const todayTxCount = Number(data.todayTransactionCount || 0);
  const receivables = Array.isArray(data.receivables) ? data.receivables : [];
  const receivablesSum = receivables.reduce(function (acc, r) {
    return acc + Number(r.balance || r.amount || 0);
  }, 0);
  const onlineOrders = window.ONLINE_ORDERS_CACHE || [];
  const onlinePendingCount = onlineOrders.filter(function (o) { return o.status === 'pending'; }).length;

  // Tanggal Hari Ini format Indonesia
  const now = new Date();
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const dateFormatted = dayNames[now.getDay()] + ', ' + now.getDate() + ' ' + monthNames[now.getMonth()] + ' ' + now.getFullYear();

  // Target Omzet Harian (default 5.000.000 atau dari pengaturan)
  const targetOmzet = Number(data.dailyTarget || (APP_SETTINGS && APP_SETTINGS.daily_target) || 5000000);
  const targetPercent = targetOmzet > 0 ? Math.min(100, Math.round((todaySales / targetOmzet) * 100)) : 0;
  const circleRadius = 46;
  const circumference = 2 * Math.PI * circleRadius; // ~289.02
  const strokeOffset = circumference - (circumference * (targetPercent / 100));

  // Spline Data Points 7 Hari Terakhir (Data Riwayat Asli)
  const trendDays = (Array.isArray(data.splineDays) && data.splineDays.length === 7)
    ? data.splineDays
    : ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  const splineValues = (Array.isArray(data.splineValues) && data.splineValues.length === 7)
    ? data.splineValues
    : [0, 0, 0, 0, 0, 0, todaySales];

  const maxVal = Math.max(...splineValues, 100000);
  const isAllZeroSpline = splineValues.every(function (v) { return Number(v) === 0; });
  const svgWidth = 600;
  const svgHeight = 180;
  const paddingLeft = 35;
  const paddingRight = 35;
  const paddingTop = 25;
  const paddingBottom = 30;
  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;

  const points = splineValues.map(function (val, idx) {
    const x = paddingLeft + (idx / (splineValues.length - 1)) * chartW;
    const y = isAllZeroSpline
      ? (paddingTop + chartH)
      : (paddingTop + chartH - (val / maxVal) * chartH);
    return { x: Math.round(x), y: Math.round(y), val: val };
  });

  // Buat path kurva halus SVG
  let splinePath = 'M ' + points[0].x + ' ' + points[0].y;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.x + (p1.x - p0.x) / 2;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) / 2;
    const cpY2 = p1.y;
    splinePath += ' C ' + cpX1 + ' ' + cpY1 + ', ' + cpX2 + ' ' + cpY2 + ', ' + p1.x + ' ' + p1.y;
  }
  const areaPath = splinePath + ' L ' + points[points.length - 1].x + ' ' + (paddingTop + chartH) + ' L ' + points[0].x + ' ' + (paddingTop + chartH) + ' Z';

  let dotsSvg = '';
  points.forEach(function (pt, idx) {
    dotsSvg +=
      '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="5" fill="#0B0F19" stroke="#22D3EE" stroke-width="2.5" />' +
      '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="2" fill="#FFFFFF" />' +
      '<text x="' + pt.x + '" y="' + (svgHeight - 10) + '" text-anchor="middle" fill="#64748B" font-size="11" font-weight="600">' + trendDays[idx] + '</text>';
  });

  // Top Products Widget (100% Data Riil Transaksi)
  const topProducts = Array.isArray(data.topProducts) ? data.topProducts : [];
  let topProductsHtml = '';

  if (topProducts.length === 0) {
    topProductsHtml =
      '<div style="text-align:center;padding:26px 12px;color:var(--text-secondary);font-size:12.5px;">' +
      '  <div style="font-size:26px;margin-bottom:8px;opacity:0.6;">📦</div>' +
      '  <div style="font-weight:700;color:var(--text-main);margin-bottom:4px;">Belum Ada Produk Terjual Hari Ini</div>' +
      '  <div style="font-size:11px;color:var(--text-muted);line-height:1.4;">Daftar produk terlaris akan otomatis terisi dan diperbarui secara seketika saat kasir mencatat transaksi nota.</div>' +
      '</div>';
  } else {
    topProducts.slice(0, 5).forEach(function (prod) {
      topProductsHtml +=
        '<div style="margin-bottom:12px;">' +
        '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;font-size:12px;">' +
        '    <span style="font-weight:600;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">' + escapeHtml(prod.name) + '</span>' +
        '    <strong style="color:#22D3EE;font-family:monospace;">' + (prod.qty || 0) + ' terjual</strong>' +
        '  </div>' +
        '  <div style="background:rgba(255,255,255,0.06);border-radius:10px;height:7px;overflow:hidden;border:1px solid rgba(255,255,255,0.04);">' +
        '    <div style="width:' + Math.max(10, prod.percent || 10) + '%;height:100%;background:linear-gradient(90deg, #06B6D4, #3B82F6);border-radius:10px;box-shadow:0 0 10px rgba(6,182,212,0.5);"></div>' +
        '  </div>' +
        '</div>';
    });
  }

  content.innerHTML =
    '<div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;margin-bottom:20px;">' +
    '  <div>' +
    '    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
    '      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10B981;box-shadow:0 0 10px #10B981;animation:pulse 2s infinite;"></span>' +
    '      <span style="font-size:11.5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#22D3EE;">SISTEM KASIR FINTECH &bull; OPERASIONAL LIVE</span>' +
    '    </div>' +
    '    <h1 class="page-title" style="font-size:24px;margin:0 0 4px 0;">Halo, ' + escapeHtml(USER_NAME || 'Kasir') + ' 👋</h1>' +
    '    <p class="page-subtitle" style="margin:0;color:var(--text-secondary);font-size:13px;">' + dateFormatted + ' &bull; Pantau performa finansial, analitik kurva penjualan dan antrean toko secara seketika.</p>' +
    '  </div>' +
    '  <div class="page-actions" style="display:flex;gap:10px;align-items:center;">' +
    '    <button type="button" class="btn btn-primary" onclick="openOnlineOrderQueueModal(\'pending\')" style="display:inline-flex;align-items:center;gap:8px;box-shadow:0 0 18px rgba(6,182,212,0.35);">' +
    '      <i class="fas fa-boxes"></i> Antrean Online' +
    ' <span id="dash-online-order-badge" style="background:#EF4444;color:#fff;border-radius:12px;padding:1px 7px;font-size:11px;font-weight:800;box-shadow:0 0 8px rgba(239,68,68,0.7);display:' + (onlinePendingCount > 0 ? 'inline-block' : 'none') + ';">' + onlinePendingCount + '</span>' +
    '    </button>' +
    '    <button type="button" class="btn btn-secondary btn-sm" onclick="openModuleGuide(\'dashboard\')" title="Buka Panduan Operasional Sistem"><i class="fas fa-book"></i> Panduan</button>' +
    '    <button type="button" class="btn btn-secondary btn-sm" onclick="renderDashboard(true)" title="Segarkan Data Real-Time"><i class="fas fa-sync-alt"></i> Refresh</button>' +
    '  </div>' +
    '</div>' +

    // 4 Cyber KPI Stat Cards
    '<div class="stat-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(230px, 1fr));gap:16px;margin-bottom:20px;">' +
    '  <div class="stat-card cyber-stat-card">' +
    '    <div class="stat-header">' +
    '      <span class="stat-label">Omzet Penjualan Hari Ini</span>' +
    '      <div style="width:36px;height:36px;border-radius:10px;background:rgba(6,182,212,0.15);border:1px solid rgba(6,182,212,0.3);display:flex;align-items:center;justify-content:center;color:#22D3EE;box-shadow:0 0 12px rgba(6,182,212,0.25);"><i class="fas fa-wallet"></i></div>' +
    '    </div>' +
    '    <div class="stat-value" style="color:#22D3EE;text-shadow:0 0 20px rgba(6,182,212,0.35);">' + formatRupiah(todaySales) + '</div>' +
    '    <div class="stat-meta" style="color:#10B981;font-weight:600;display:flex;align-items:center;gap:4px;"><i class="fas fa-arrow-trend-up"></i> ' + targetPercent + '% target harian tercapai</div>' +
    '    <svg class="cyber-stat-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0,25 Q25,5 50,20 T100,5 L100,30 L0,30 Z" fill="rgba(6,182,212,0.15)"></path><path d="M0,25 Q25,5 50,20 T100,5" fill="none" stroke="#06B6D4" stroke-width="2"></path></svg>' +
    '  </div>' +

    '  <div class="stat-card cyber-stat-card">' +
    '    <div class="stat-header">' +
    '      <span class="stat-label">Transaksi Hari Ini</span>' +
    '      <div style="width:36px;height:36px;border-radius:10px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);display:flex;align-items:center;justify-content:center;color:#60A5FA;box-shadow:0 0 12px rgba(59,130,246,0.25);"><i class="fas fa-receipt"></i></div>' +
    '    </div>' +
    '    <div class="stat-value" style="color:#60A5FA;text-shadow:0 0 20px rgba(59,130,246,0.35);">' + todayTxCount + ' Nota</div>' +
    '    <div class="stat-meta" style="color:var(--text-secondary);">Struk transaksi kasir terselesaikan</div>' +
    '    <svg class="cyber-stat-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0,28 Q30,10 60,22 T100,8 L100,30 L0,30 Z" fill="rgba(59,130,246,0.15)"></path><path d="M0,28 Q30,10 60,22 T100,8" fill="none" stroke="#3B82F6" stroke-width="2"></path></svg>' +
    '  </div>' +

    '  <div class="stat-card cyber-stat-card" style="cursor:pointer;" onclick="openOnlineOrderQueueModal(\'pending\')">' +
    '    <div class="stat-header">' +
    '      <span class="stat-label">Pesanan Online Masuk</span>' +
    '      <div style="width:36px;height:36px;border-radius:10px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);display:flex;align-items:center;justify-content:center;color:#FBBF24;box-shadow:0 0 12px rgba(245,158,11,0.25);"><i class="fas fa-boxes"></i></div>' +
    '    </div>' +
    '    <div class="stat-value" id="dash-online-order-count" style="color:#FBBF24;text-shadow:0 0 20px rgba(245,158,11,0.35);">' + onlinePendingCount + ' Pesanan</div>' +
    '    <div class="stat-meta" style="color:#F59E0B;font-weight:600;"><i class="fas fa-columns"></i> Buka Papan Kanban &rarr;</div>' +
    '    <svg class="cyber-stat-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0,20 Q20,28 50,12 T100,18 L100,30 L0,30 Z" fill="rgba(245,158,11,0.15)"></path><path d="M0,20 Q20,28 50,12 T100,18" fill="none" stroke="#F59E0B" stroke-width="2"></path></svg>' +
    '  </div>' +

    '  <div class="stat-card cyber-stat-card">' +
    '    <div class="stat-header">' +
    '      <span class="stat-label">Piutang Klien Tempo</span>' +
    '      <div style="width:36px;height:36px;border-radius:10px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);display:flex;align-items:center;justify-content:center;color:#F87171;box-shadow:0 0 12px rgba(239,68,68,0.25);"><i class="fas fa-file-invoice-dollar"></i></div>' +
    '    </div>' +
    '    <div class="stat-value" style="color:#F87171;text-shadow:0 0 20px rgba(239,68,68,0.35);">' + receivables.length + ' Klien</div>' +
    '    <div class="stat-meta" style="color:var(--text-secondary);">' + (receivablesSum > 0 ? ('Total: ' + formatRupiah(receivablesSum)) : 'Tidak ada tagihan tertunggak') + '</div>' +
    '    <svg class="cyber-stat-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0,15 Q35,28 70,8 T100,24 L100,30 L0,30 Z" fill="rgba(239,68,68,0.15)"></path><path d="M0,15 Q35,28 70,8 T100,24" fill="none" stroke="#EF4444" stroke-width="2"></path></svg>' +
    '  </div>' +
    '</div>' +

    // Main 2-Column Grid
    '<div style="display:grid;grid-template-columns:2fr 1.1fr;gap:20px;margin-bottom:20px;" class="cyber-dashboard-grid">' +

    // Left Section
    '  <div style="display:flex;flex-direction:column;gap:20px;">' +
    // Spline Chart Card
    '    <div class="card" style="padding:18px 20px;">' +
    '      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">' +
    '        <div>' +
    '          <h3 style="font-size:15px;margin:0 0 2px 0;display:flex;align-items:center;gap:8px;">' +
    '            <i class="fas fa-chart-area" style="color:#22D3EE;"></i> Tren Omzet Mingguan' +
    '          </h3>' +
    '          <span style="font-size:12px;color:var(--text-secondary);">Fluktuasi kurva penjualan 7 hari terakhir</span>' +
    '        </div>' +
    '        <span class="badge" style="background:rgba(6,182,212,0.15);color:#22D3EE;border:1px solid rgba(6,182,212,0.3);font-size:11px;font-weight:700;"><i class="fas fa-bolt"></i> Realtime Spline</span>' +
    '      </div>' +
    '      <div style="width:100%;overflow-x:auto;">' +
    '        <svg viewBox="0 0 600 180" style="width:100%;min-width:320px;height:auto;display:block;">' +
    '          <defs>' +
    '            <linearGradient id="cyberSplineGrad" x1="0" y1="0" x2="0" y2="1">' +
    '              <stop offset="0%" stop-color="#06B6D4" stop-opacity="0.38"/>' +
    '              <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.0"/>' +
    '            </linearGradient>' +
    '            <filter id="cyberSplineGlow" x="-20%" y="-20%" width="140%" height="140%">' +
    '              <feGaussianBlur stdDeviation="3" result="blur" />' +
    '              <feComposite in="SourceGraphic" in2="blur" operator="over" />' +
    '            </filter>' +
    '          </defs>' +
    '          <!-- Grid Lines -->' +
    '          <line x1="35" y1="30" x2="565" y2="30" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3"/>' +
    '          <line x1="35" y1="75" x2="565" y2="75" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3"/>' +
    '          <line x1="35" y1="120" x2="565" y2="120" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3"/>' +
    '          <!-- Spline Area -->' +
    '          <path d="' + areaPath + '" fill="url(#cyberSplineGrad)" />' +
    '          <!-- Spline Line -->' +
    '          <path d="' + splinePath + '" fill="none" stroke="#22D3EE" stroke-width="3" filter="url(#cyberSplineGlow)" />' +
    '          <!-- Dots -->' +
    dotsSvg +
    '        </svg>' +
    '      </div>' +
    '    </div>' +

    // Stock Alerts Grid (Stok Menipis & Kadaluarsa)
    '    <div class="dashboard-panels-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;">' +
    renderPanel('Stok Menipis (&le; 5 unit/pack)', data.lowStock, function (item) {
      return '<span style="font-weight:600;color:var(--text-main);">' + escapeHtml(item.name) + '</span><span class="badge badge-danger" style="box-shadow:0 0 10px rgba(239,68,68,0.3);">Sisa ' + item.stock + '</span>';
    }, 'Semua persediaan stok dalam batas aman.') +
    renderPanel('Mendekati Kadaluarsa (30 Hari)', data.expiring, function (item) {
      return '<span style="color:var(--text-main);">' + escapeHtml(item.product_id) + '</span><span class="badge badge-warning" style="box-shadow:0 0 10px rgba(245,158,11,0.3);">' + formatDate(item.expiry_date) + '</span>';
    }, 'Tidak ada stok mendekati kadaluarsa.') +
    '    </div>' +
    '  </div>' +

    // Right Section: Target Gauge & Top Products
    '  <div style="display:flex;flex-direction:column;gap:20px;">' +
    // Circular Revenue Goal Gauge Card
    '    <div class="card" style="padding:20px;text-align:center;">' +
    '      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
    '        <h3 style="font-size:14px;margin:0;display:flex;align-items:gap:6px;">' +
    '          <i class="fas fa-bullseye" style="color:#10B981;margin-right:6px;"></i> Target Omzet Harian' +
    '        </h3>' +
    '        <span style="font-size:11px;color:var(--text-secondary);">' + formatRupiah(targetOmzet) + '</span>' +
    '      </div>' +
    '      <div class="cyber-gauge-wrap" style="margin:14px auto;">' +
    '        <svg viewBox="0 0 120 120" width="120" height="120">' +
    '          <defs>' +
    '            <linearGradient id="cyberGaugeGrad" x1="0" y1="1" x2="1" y2="0">' +
    '              <stop offset="0%" stop-color="#06B6D4" />' +
    '              <stop offset="100%" stop-color="#10B981" />' +
    '            </linearGradient>' +
    '          </defs>' +
    '          <circle cx="60" cy="60" r="' + circleRadius + '" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10"/>' +
    '          <circle cx="60" cy="60" r="' + circleRadius + '" fill="none" stroke="url(#cyberGaugeGrad)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + strokeOffset + '" transform="rotate(-90 60 60)" style="transition:stroke-dashoffset 1s ease;"/>' +
    '        </svg>' +
    '        <div class="cyber-gauge-text">' +
    '          <span style="font-size:20px;font-weight:900;text-shadow:0 0 15px rgba(34,211,238,0.5);">' + targetPercent + '%</span>' +
    '          <span style="font-size:10px;color:var(--text-secondary);letter-spacing:0.5px;">TERCAPAI</span>' +
    '        </div>' +
    '      </div>' +
    '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);">' +
    '        <div>' +
    '          <div style="font-size:11px;color:var(--text-secondary);">Tercapai</div>' +
    '          <strong style="font-size:12.5px;color:#34D399;">' + formatRupiah(todaySales) + '</strong>' +
    '        </div>' +
    '        <div>' +
    '          <div style="font-size:11px;color:var(--text-secondary);">Sisa Target</div>' +
    '          <strong style="font-size:12.5px;color:#FBBF24;">' + formatRupiah(Math.max(0, targetOmzet - todaySales)) + '</strong>' +
    '        </div>' +
    '      </div>' +
    '    </div>' +

    // Top Selling Products Card
    '    <div class="card" style="padding:18px;">' +
    '      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
    '        <h3 style="font-size:14px;margin:0;display:flex;align-items:center;gap:6px;">' +
    '          <i class="fas fa-fire" style="color:#F59E0B;"></i> Produk Terlaris Hari Ini' +
    '        </h3>' +
    '        <span style="font-size:11px;color:var(--text-secondary);"><i class="fas fa-trophy" style="color:#F59E0B;"></i> Top 5</span>' +
    '      </div>' +
    topProductsHtml +
    '    </div>' +
    '  </div>' +

    '</div>';
}

function renderPanel(title, items, renderItem, emptyText) {
  let inner = '';
  if (!items || items.length === 0) {
    inner = '<div style="text-align:center;padding:18px;color:var(--text-secondary);font-size:13px;">' + emptyText + '</div>';
  } else {
    inner = items.map(function (item) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px;">' + renderItem(item) + '</div>';
    }).join('');
  }
  return '<div class="card"><h3 style="font-size:14px;margin-bottom:12px;">' + title + '</h3>' + inner + '</div>';
}

