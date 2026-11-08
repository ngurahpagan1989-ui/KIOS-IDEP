const fs = require('fs');
let code = fs.readFileSync('katalog.js', 'utf8');

const targetStr = `  modal.innerHTML = \`
    <div class="cart-modal" style="max-width:440px;text-align:center;padding:26px 22px;">
      <div style="width:68px;height:68px;background:#DCFCE7;color:#16A34A;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 14px auto;">
        <i class="fas fa-check"></i>
      </div>
      <h3 style="font-size:18px;font-weight:800;color:#0F172A;margin-bottom:6px;">Pesanan Berhasil Dikirim!</h3>
      <p style="font-size:13px;color:#64748B;line-height:1.5;margin-bottom:16px;">
        Terima kasih, <strong>\${escapeHtml(customerName)}</strong>. Pesanan Anda telah tersambung langsung ke antrean kasir POS toko dengan nomor:
      </p>
      <div style="background:#F8FAFC;border:1.5px dashed #2563EB;border-radius:8px;padding:12px;margin-bottom:18px;">
        <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Nomor Pesanan Resmi</div>
        <div style="font-size:22px;font-weight:900;color:#2563EB;letter-spacing:1px;font-family:monospace;margin-top:2px;">#\${orderNo}</div>
        <div style="font-size:12.5px;font-weight:700;color:#0F172A;margin-top:4px;">Total Tagihan: \${formatRupiah(total)}</div>
      </div>
      <p style="font-size:12px;color:#64748B;margin-bottom:18px;">
        Jika WhatsApp belum terbuka otomatis, klik tombol di bawah untuk melanjutkan chat konfirmasi ke kasir:
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <a href="\${waUrl}" target="_blank" class="btn-checkout" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;">
          <i class="fab fa-whatsapp" style="font-size:18px;"></i> Buka Chat WhatsApp Kasir
        </a>
        <button type="button" class="btn-clear-cart" onclick="closeOrderSuccessModal()" style="background:#F1F5F9;color:#475569;border-color:#CBD5E1;width:100%;height:38px;">
          Selesai &amp; Lanjut Lihat Produk
        </button>
      </div>
    </div>
  \`;`;

const replacementStr = `  modal.innerHTML = \`
    <div class="cart-modal" style="max-width:440px;text-align:center;padding:26px 22px;background:#111827;border:1px solid rgba(255,255,255,0.12);box-shadow:0 20px 45px rgba(0,0,0,0.8), 0 0 24px rgba(6,182,212,0.25);">
      <div style="width:68px;height:68px;background:rgba(16,185,129,0.18);color:#34D399;border:1px solid rgba(16,185,129,0.35);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 14px auto;box-shadow:0 0 16px rgba(16,185,129,0.25);">
        <i class="fas fa-check"></i>
      </div>
      <h3 style="font-size:18px;font-weight:800;color:#F8FAFC;margin-bottom:6px;">Pesanan Berhasil Dikirim!</h3>
      <p style="font-size:13px;color:#94A3B8;line-height:1.5;margin-bottom:16px;">
        Terima kasih, <strong style="color:#F8FAFC;">\${escapeHtml(customerName)}</strong>. Pesanan Anda telah tersambung langsung ke antrean kasir POS toko dengan nomor:
      </p>
      <div style="background:rgba(15,23,42,0.85);border:1.5px dashed #06B6D4;border-radius:10px;padding:12px;margin-bottom:18px;box-shadow:inset 0 0 12px rgba(6,182,212,0.1);">
        <div style="font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;">Nomor Pesanan Resmi</div>
        <div style="font-size:22px;font-weight:900;color:#22D3EE;letter-spacing:1px;font-family:monospace;margin-top:2px;">#\${orderNo}</div>
        <div style="font-size:12.5px;font-weight:700;color:#F8FAFC;margin-top:4px;">Total Tagihan: \${formatRupiah(total)}</div>
      </div>
      <p style="font-size:12px;color:#94A3B8;margin-bottom:18px;">
        Jika WhatsApp belum terbuka otomatis, klik tombol di bawah untuk melanjutkan chat konfirmasi ke kasir:
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <a href="\${waUrl}" target="_blank" class="btn-checkout" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;">
          <i class="fab fa-whatsapp" style="font-size:18px;"></i> Buka Chat WhatsApp Kasir
        </a>
        <button type="button" class="btn-clear-cart" onclick="closeOrderSuccessModal()" style="background:rgba(255,255,255,0.06);color:#94A3B8;border:1px solid rgba(255,255,255,0.12);width:100%;height:38px;">
          Selesai &amp; Lanjut Lihat Produk
        </button>
      </div>
    </div>
  \`;`;

// Normalize CRLF to LF for matching
const normCode = code.replace(/\r\n/g, '\n');
const normTarget = targetStr.replace(/\r\n/g, '\n');
const normReplacement = replacementStr.replace(/\r\n/g, '\n');

if (normCode.includes(normTarget)) {
  const updated = normCode.replace(normTarget, normReplacement);
  fs.writeFileSync('katalog.js', updated, 'utf8');
  console.log('SUCCESS: katalog.js patched successfully!');
} else {
  console.log('Target string not found, attempting line index patch...');
  const lines = normCode.split('\n');
  const startIdx = lines.findIndex(l => l.includes("modal.innerHTML = `") && lines[lines.indexOf(l)+1].includes("cart-modal"));
  if (startIdx !== -1) {
    const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes("modal.classList.add('open');"));
    console.log(`Found block from line ${startIdx+1} to ${endIdx+1}`);
    const replacementLines = normReplacement.split('\n');
    lines.splice(startIdx, endIdx - startIdx, ...replacementLines);
    fs.writeFileSync('katalog.js', lines.join('\n'), 'utf8');
    console.log('SUCCESS: Line index patch applied successfully!');
  } else {
    console.error('ERROR: Could not find modal.innerHTML in katalog.js');
  }
}

