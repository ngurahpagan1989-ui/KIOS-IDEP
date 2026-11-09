const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

const m = css.match(/[^{}]*(?:body:not\(\.theme-light\)|:root)[^{]*\{[^}]+\}/g);
if (m) m.slice(0, 4).forEach((rule, i) => console.log(`[${i}] ${rule}\n`));

