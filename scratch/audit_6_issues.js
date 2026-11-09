const fs = require('fs');

const css = fs.readFileSync('style.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');

console.log('=== CHECK 1: Pengaturan Tabs ===');
// Are .settings-tab-btn, .btn-secondary styled dark or could they have white background?
const btnSecMatch = css.match(/\.btn-secondary\s*\{[^}]+\}/g);
console.log('btn-secondary in css:', btnSecMatch ? btnSecMatch.slice(0, 3) : 'NONE');

console.log('\n=== CHECK 2: Date Inputs in Laporan ===');
// Check #report-start-date and #report-end-date
const dateMatch = app.match(/id="report-(?:start|end)-date"[^>]+/g);
console.log('report date inputs in app.js:', dateMatch);

console.log('\n=== CHECK 3: Riwayat Transaksi Inputs & Format Tabs ===');
// Check date inputs in tx filter
const txDateMatch = app.match(/id="tx-filter-(?:start|end)-date"[^>]+/g);
console.log('tx date inputs in app.js:', txDateMatch);
const invTabMatch = css.match(/\.invoice-format-tab-btn[^{]*\{[^}]+\}/g);
console.log('invoice-format-tab-btn in css:', invTabMatch ? invTabMatch.slice(0, 2) : 'NONE');

console.log('\n=== CHECK 5: Autofill (warna coklat/kuning) ===');
// Check :-webkit-autofill rules in style.css
const autofillMatch = css.match(/[^{}]*:-webkit-autofill[^{]*\{[^}]+\}/g);
console.log('autofill rules in css count:', autofillMatch ? autofillMatch.length : 0);
if (autofillMatch) {
  console.log('Sample autofill rule:', autofillMatch[0]);
}

console.log('\n=== CHECK 6: Katalog Online Banner / Promosi ===');
// Check banner promo container in app.js
const bannerMatch = app.match(/id="promo-banner-settings"[^>]+/g) || app.match(/Manajemen Media Promosi[\s\S]{1,300}/);
console.log('promo banner in app.js:', bannerMatch ? bannerMatch[0].substring(0, 200) : 'NONE');

