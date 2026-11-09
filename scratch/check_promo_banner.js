const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const idx = app.indexOf('Manajemen Media Promosi');
console.log(app.substring(idx - 400, idx + 2000));

