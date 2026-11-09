const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const idx = app.indexOf('let bannersHtml');
console.log(app.substring(idx, idx + 1800));

