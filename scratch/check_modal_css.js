const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

const m = css.match(/\.modal-container|\.modal-backdrop[^{]*\{[^}]+\}/g);
if (m) console.log(m.slice(0, 3));

