const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const idx = app.indexOf('function showOutletDetailModal');
console.log(app.substring(idx + 500, idx + 2500));

