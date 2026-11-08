const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// 1. Report date inputs
code = code.replace(
  '<input type="date" id="report-start-date" value="\' + escapeHtml(startDateVal) + \'" style="padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);background:var(--surface);color:var(--text-main);color-scheme:dark;">',
  '<input type="date" id="report-start-date" value="\' + escapeHtml(startDateVal) + \'" style="padding:5px 10px;font-size:12px;border:1px solid rgba(255,255,255,0.16);border-radius:var(--radius-xs);background:rgba(15,23,42,0.95);color:#F8FAFC;color-scheme:dark;">'
);

code = code.replace(
  '<input type="date" id="report-end-date" value="\' + escapeHtml(endDateVal) + \'" style="padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);background:var(--surface);color:var(--text-main);color-scheme:dark;">',
  '<input type="date" id="report-end-date" value="\' + escapeHtml(endDateVal) + \'" style="padding:5px 10px;font-size:12px;border:1px solid rgba(255,255,255,0.16);border-radius:var(--radius-xs);background:rgba(15,23,42,0.95);color:#F8FAFC;color-scheme:dark;">'
);

// 2. Faktur date inputs
code = code.replace(
  '<input type="date" id="faktur-start-date" value="\' + currentStart + \'" style="width:100%;padding:4px 6px;font-size:11px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--text-main);color-scheme:dark;">',
  '<input type="date" id="faktur-start-date" value="\' + currentStart + \'" style="width:100%;padding:5px 8px;font-size:11px;border:1px solid rgba(255,255,255,0.16);border-radius:4px;background:rgba(15,23,42,0.95);color:#F8FAFC;color-scheme:dark;">'
);

code = code.replace(
  '<input type="date" id="faktur-end-date" value="\' + currentEnd + \'" style="width:100%;padding:4px 6px;font-size:11px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--text-main);color-scheme:dark;">',
  '<input type="date" id="faktur-end-date" value="\' + currentEnd + \'" style="width:100%;padding:5px 8px;font-size:11px;border:1px solid rgba(255,255,255,0.16);border-radius:4px;background:rgba(15,23,42,0.95);color:#F8FAFC;color-scheme:dark;">'
);

// 3. Search input in report
code = code.replace(
  '<input type="text" id="report-tx-search" placeholder="🔍 Cari nomor nota, pelanggan, atau metode bayar..." oninput="filterReportTransactions(this.value)" style="padding:7px 12px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);width:100%;max-width:340px;background:#FFF;">',
  '<input type="text" id="report-tx-search" placeholder="🔍 Cari nomor nota, pelanggan, atau metode bayar..." oninput="filterReportTransactions(this.value)" style="padding:7px 12px;font-size:12.5px;border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius-sm);width:100%;max-width:340px;background:rgba(15,23,42,0.95);color:#F8FAFC;">'
);

// 4. Promo config sections in buildCatalogPromoSettingsHTML
code = code.replace(
  /'  <!-- 1\. Pita Pengumuman Berjalan -->'\s*\+\s*'\s*<div style="background:var\(--surface-muted\);border:1px solid var\(--border\);border-radius:var\(--radius-sm\);padding:14px;margin-bottom:18px;">'/g,
  `'  <!-- 1. Pita Pengumuman Berjalan -->' +
    '  <div style="background:rgba(22,30,46,0.65);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-sm);padding:14px;margin-bottom:18px;">'`
);

code = code.replace(
  /'  <!-- 2\. Hero Banner Slider \(3 Banner\) -->'\s*\+\s*'\s*<div style="background:var\(--surface-muted\);border:1px solid var\(--border\);border-radius:var\(--radius-sm\);padding:14px;margin-bottom:18px;">'/g,
  `'  <!-- 2. Hero Banner Slider (3 Banner) -->' +
    '  <div style="background:rgba(22,30,46,0.65);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-sm);padding:14px;margin-bottom:18px;">'`
);

code = code.replace(
  /'  <!-- 3\. Produk Pilihan \/ Paling Laris -->'\s*\+\s*'\s*<div style="background:var\(--surface-muted\);border:1px solid var\(--border\);border-radius:var\(--radius-sm\);padding:14px;margin-bottom:18px;">'/g,
  `'  <!-- 3. Produk Pilihan / Paling Laris -->' +
    '  <div style="background:rgba(22,30,46,0.65);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-sm);padding:14px;margin-bottom:18px;">'`
);

// 5. Open public catalog manager modal card
code = code.replace(
  '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:var(--radius-sm);padding:14px;">',
  '<div style="background:rgba(22,30,46,0.7);border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);padding:14px;">'
);

code = code.replace(
  '<input type="text" id="public-catalog-url-input" value="\' + escapeHtml(catalogUrl) + \'" readonly style="flex:1;padding:8px 12px;font-size:12.5px;background:#ffffff;border:1px solid #CBD5E1;border-radius:var(--radius-xs);color:var(--text-main);font-family:monospace;" onclick="this.select()">',
  '<input type="text" id="public-catalog-url-input" value="\' + escapeHtml(catalogUrl) + \'" readonly style="flex:1;padding:8px 12px;font-size:12.5px;background:rgba(15,23,42,0.9);border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius-xs);color:#22D3EE;font-family:monospace;" onclick="this.select()">'
);

code = code.replace(
  '<div style="border:1.5px dashed #CBD5E1;border-radius:var(--radius-md);padding:20px;text-align:center;background:#ffffff;box-shadow:0 4px 16px rgba(0,0,0,0.03);">',
  '<div style="border:1.5px dashed rgba(6,182,212,0.4);border-radius:var(--radius-md);padding:20px;text-align:center;background:rgba(22,30,46,0.8);box-shadow:0 4px 20px rgba(0,0,0,0.4);">'
);

code = code.replace(
  '<h3 style="font-size:18px;font-weight:900;color:#0F172A;margin-bottom:2px;">\' + escapeHtml(storeName) + \'</h3>',
  '<h3 style="font-size:18px;font-weight:900;color:#F8FAFC;margin-bottom:2px;">\' + escapeHtml(storeName) + \'</h3>'
);

code = code.replace(
  '<p style="font-size:11.5px;color:#64748B;margin-bottom:14px;max-width:340px;margin-left:auto;margin-right:auto;">\' + escapeHtml(storeTagline) + \'</p>',
  '<p style="font-size:11.5px;color:#94A3B8;margin-bottom:14px;max-width:340px;margin-left:auto;margin-right:auto;">\' + escapeHtml(storeTagline) + \'</p>'
);

code = code.replace(
  '<div style="font-size:13px;font-weight:800;color:#0F172A;margin-bottom:4px;">',
  '<div style="font-size:13px;font-weight:800;color:#F8FAFC;margin-bottom:4px;">'
);

code = code.replace(
  '<div style="font-size:11.5px;color:#64748B;">',
  '<div style="font-size:11.5px;color:#94A3B8;">'
);

// 6. Common search inputs
code = code.replace(
  'id="produk-search-input" placeholder="🔍 Cari nama produk atau kategori..." oninput="PRODUCT_SEARCH_QUERY=(this.value||\'\').toLowerCase().trim();renderFilteredProducts();" style="padding:7px 12px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;"',
  'id="produk-search-input" placeholder="🔍 Cari nama produk atau kategori..." oninput="PRODUCT_SEARCH_QUERY=(this.value||\'\').toLowerCase().trim();renderFilteredProducts();" style="padding:7px 12px;font-size:12.5px;border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius-sm);background:rgba(15,23,42,0.95);color:#F8FAFC;"'
);

code = code.replace(
  'id="stok-search-input" placeholder="🔍 Cari nama benih atau kode..." oninput="filterStokTable()" style="padding:7px 12px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);width:100%;max-width:260px;background:#fff;"',
  'id="stok-search-input" placeholder="🔍 Cari nama benih atau kode..." oninput="filterStokTable()" style="padding:7px 12px;font-size:12.5px;border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius-sm);width:100%;max-width:260px;background:rgba(15,23,42,0.95);color:#F8FAFC;"'
);

code = code.replace(
  'id="modal-audit-search" placeholder="🔍 Cari benih, no. nota/batch, atau keterangan..." oninput="filterModalAuditTable()" style="padding:7px 12px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);width:100%;max-width:280px;background:#fff;"',
  'id="modal-audit-search" placeholder="🔍 Cari benih, no. nota/batch, atau keterangan..." oninput="filterModalAuditTable()" style="padding:7px 12px;font-size:12.5px;border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius-sm);width:100%;max-width:280px;background:rgba(15,23,42,0.95);color:#F8FAFC;"'
);

code = code.replace(
  'id="crm-search" placeholder="🔍 Cari nama pelanggan, no. WhatsApp, atau kategori..." oninput="renderFilteredCustomers()" style="padding:8px 12px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);width:100%;max-width:340px;background:#fff;"',
  'id="crm-search" placeholder="🔍 Cari nama pelanggan, no. WhatsApp, atau kategori..." oninput="renderFilteredCustomers()" style="padding:8px 12px;font-size:12.5px;border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius-sm);width:100%;max-width:340px;background:rgba(15,23,42,0.95);color:#F8FAFC;"'
);

code = code.replace(
  'id="stock-val-status-filter" onchange="filterStockValuationTable()" style="padding:7px 10px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#FFF;"',
  'id="stock-val-status-filter" onchange="filterStockValuationTable()" style="padding:7px 10px;font-size:12px;border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius-sm);background:rgba(15,23,42,0.95);color:#F8FAFC;"'
);

fs.writeFileSync('app.js', code, 'utf8');
console.log('SUCCESS: app.js updated and inline styles patched!');

