const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

const m = css.match(/[^{}]*\.btn-secondary[^{]*\{[^}]+\}/g);
console.log('btn-secondary rules count:', m ? m.length : 0);
if (m) m.forEach((rule, i) => console.log(`[${i}] ${rule}\n`));

const m2 = css.match(/[^{}]*\.invoice-format-tab-btn[^{]*\{[^}]+\}/g);
console.log('invoice-format-tab-btn rules count:', m2 ? m2.length : 0);
if (m2) m2.forEach((rule, i) => console.log(`[${i}] ${rule}\n`));

