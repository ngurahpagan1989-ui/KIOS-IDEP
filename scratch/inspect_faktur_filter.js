const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const idx = app.indexOf('faktur-filter-bar');
console.log(app.substring(idx - 100, idx + 1200));

