const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

const m = css.match(/[^{}]*:-webkit-autofill[^{]*\{[^}]+\}/g);
if (m) m.forEach((rule, i) => console.log(`[${i}] ${rule}\n`));

