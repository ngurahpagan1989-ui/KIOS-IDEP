const fs = require('fs');
const appJs = fs.readFileSync('app.js', 'utf8');

const idx = appJs.indexOf('<!-- SUB-NAVIGASI TAB PENGATURAN -->');
console.log(appJs.substring(idx - 200, idx + 1800));

