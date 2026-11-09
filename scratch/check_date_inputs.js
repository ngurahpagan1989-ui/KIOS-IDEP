const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

const m = css.match(/[^{}]*input\[type=["']?date["']?\][^{]*\{[^}]+\}/g);
console.log('input[type=date] rules count:', m ? m.length : 0);
if (m) m.forEach((rule, i) => console.log(`[${i}] ${rule}\n`));

