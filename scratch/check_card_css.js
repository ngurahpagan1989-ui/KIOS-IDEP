const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

const m = css.match(/[^{}]*\.card[^{]*\{[^}]+\}/g);
console.log('card rules count:', m ? m.length : 0);
if (m) m.slice(0, 5).forEach((rule, i) => console.log(`[${i}] ${rule}\n`));

