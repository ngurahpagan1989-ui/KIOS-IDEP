const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const idx = app.indexOf('function renderKonsinyasiTransfers');
console.log(app.substring(idx, idx + 2000));

