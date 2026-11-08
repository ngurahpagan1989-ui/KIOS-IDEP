const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

// 1. Replace base .invoice-format-tab-btn and .active
css = css.replace(
  /\.invoice-format-tab-btn\s*\{[\s\S]*?\.invoice-format-tab-btn\.active\s*\{[\s\S]*?\}/,
  `.invoice-format-tab-btn {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(22, 30, 46, 0.85);
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #94A3B8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  user-select: none;
}

.invoice-format-tab-btn:hover {
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(6, 182, 212, 0.35);
}

.invoice-format-tab-btn.active {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.35), rgba(59, 130, 246, 0.35)) !important;
  color: #22D3EE !important;
  border: 1px solid rgba(6, 182, 212, 0.55) !important;
  box-shadow: 0 0 14px rgba(6, 182, 212, 0.3) !important;
  font-weight: 700 !important;
}`
);

// 2. Replace base .btn-outline-*
css = css.replace(
  /\.btn-outline-success\s*\{[\s\S]*?\.btn-outline-warning:hover\s*\{[\s\S]*?\}/,
  `.btn-outline-success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34D399;
  font-weight: 600;
}
.btn-outline-success:hover {
  background: rgba(16, 185, 129, 0.28);
  color: #FFFFFF;
}

.btn-outline-secondary {
  background: rgba(30, 41, 59, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #E2E8F0;
  font-weight: 600;
}
.btn-outline-secondary:hover {
  background: rgba(51, 65, 85, 0.8);
  color: #FFFFFF;
}

.btn-outline-warning {
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #FBBF24;
  font-weight: 600;
}
.btn-outline-warning:hover {
  background: rgba(245, 158, 11, 0.3);
  color: #FFFFFF;
}`
);

// 3. Replace base .fu-tab-pill.active
css = css.replace(
  /\.fu-tab-pill\.active\s*\{[\s\S]*?\}/,
  `.fu-tab-pill.active {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.35), rgba(59, 130, 246, 0.35));
  color: #22D3EE;
  border-color: rgba(6, 182, 212, 0.5);
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.25);
  font-weight: 700;
}`
);

// 4. Replace base .laporan-nav-tab-btn.active
css = css.replace(
  /\.laporan-nav-tab-btn\.active\s*\{[\s\S]*?\}/,
  `.laporan-nav-tab-btn.active {
  color: #22D3EE;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(59, 130, 246, 0.25));
  border-bottom: 2px solid #06B6D4;
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.25);
}`
);

// 5. Append comprehensive Obsidian & Cyber Form Elements fix at the very end of style.css
const masterFix = `
/* ==========================================================================
   MASTER CYBER FINTECH & OBSIDIAN OVERRIDES (VERSION 9.0)
   Menjamin seluruh elemen (tab, tombol, input, datepicker, autofill) konsisten
   dalam tema Deep Obsidian (#0B0F19) dan Neon Cyan (#06B6D4)
   ========================================================================== */

/* 1. AUTOFILL CHROME / EDGE / WEBKIT */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active,
textarea:-webkit-autofill,
textarea:-webkit-autofill:hover,
textarea:-webkit-autofill:focus,
textarea:-webkit-autofill:active,
select:-webkit-autofill,
select:-webkit-autofill:hover,
select:-webkit-autofill:focus,
select:-webkit-autofill:active,
.vault-input-box input:-webkit-autofill,
.vault-input-box input:-webkit-autofill:hover,
.vault-input-box input:-webkit-autofill:focus,
.vault-input-box input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px #080D18 inset !important;
  box-shadow: 0 0 0 1000px #080D18 inset !important;
  -webkit-text-fill-color: #F8FAFC !important;
  caret-color: #22D3EE !important;
  transition: background-color 9999999s ease-in-out 0s !important;
  color-scheme: dark !important;
}

/* 2. DATE & TIME PICKERS UNIFORM OBSIDIAN THEME */
input[type="date"],
input[type="month"],
input[type="time"],
input[type="datetime-local"],
#report-start-date,
#report-end-date,
#faktur-start-date,
#faktur-end-date {
  background: rgba(15, 23, 42, 0.95) !important;
  color: #F8FAFC !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  border-radius: var(--radius-xs) !important;
  color-scheme: dark !important;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3) !important;
}

input[type="date"]::-webkit-calendar-picker-indicator,
input[type="month"]::-webkit-calendar-picker-indicator,
input[type="time"]::-webkit-calendar-picker-indicator,
input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  filter: invert(0.85) hue-rotate(180deg) brightness(1.2) !important;
  cursor: pointer !important;
  opacity: 0.85 !important;
}

input[type="date"]::-webkit-calendar-picker-indicator:hover,
input[type="month"]::-webkit-calendar-picker-indicator:hover {
  opacity: 1 !important;
  filter: invert(0.9) hue-rotate(180deg) brightness(1.4) !important;
}

/* 3. SETTINGS SYSTEM SUB-NAV TABS */
.settings-tabs-wrapper .settings-tab-btn,
.settings-tab-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  background: rgba(22, 30, 46, 0.9) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: #94A3B8 !important;
  border-radius: var(--radius-sm) !important;
  padding: 8px 14px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25) !important;
}

.settings-tabs-wrapper .settings-tab-btn:hover,
.settings-tab-btn:hover {
  background: rgba(255, 255, 255, 0.09) !important;
  color: #FFFFFF !important;
  border-color: rgba(6, 182, 212, 0.4) !important;
}

.settings-tabs-wrapper .settings-tab-btn.active,
.settings-tab-btn.active {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.35), rgba(59, 130, 246, 0.35)) !important;
  color: #22D3EE !important;
  border: 1px solid rgba(6, 182, 212, 0.6) !important;
  box-shadow: 0 0 16px rgba(6, 182, 212, 0.3) !important;
  font-weight: 700 !important;
}

/* 4. INVOICE FORMAT TABS & BUTTONS */
.invoice-format-tabs .invoice-format-tab-btn {
  background: rgba(22, 30, 46, 0.85) !important;
  color: #94A3B8 !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.invoice-format-tabs .invoice-format-tab-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #FFFFFF !important;
}

.invoice-format-tabs .invoice-format-tab-btn.active {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.35), rgba(59, 130, 246, 0.35)) !important;
  color: #22D3EE !important;
  border: 1px solid rgba(6, 182, 212, 0.55) !important;
  box-shadow: 0 0 14px rgba(6, 182, 212, 0.3) !important;
  font-weight: 700 !important;
}

.btn-tx-void {
  background: rgba(239, 68, 68, 0.18) !important;
  color: #F87171 !important;
  border: 1px solid rgba(239, 68, 68, 0.4) !important;
}

.btn-tx-void:hover {
  background: #DC2626 !important;
  color: #FFFFFF !important;
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.4) !important;
}

/* 5. SEARCH & TEXT INPUTS DARK OVERRIDE */
#report-tx-search,
#stok-search-input,
#produk-search-input,
#modal-audit-search,
#pos-customer-input,
#crm-search,
#stock-val-status-filter,
#stok-type-filter,
#stok-status-filter,
#modal-audit-type {
  background: rgba(15, 23, 42, 0.95) !important;
  color: #F8FAFC !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
}
`;

css += '\n' + masterFix;
fs.writeFileSync('style.css', css, 'utf8');
console.log('SUCCESS: style.css updated and patched with Master Cyber Fintech Overrides!');

