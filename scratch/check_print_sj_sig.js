const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const idx = app.indexOf('function printConsignmentSuratJalan');
console.log(app.substring(idx + 1800, idx + 3500));

