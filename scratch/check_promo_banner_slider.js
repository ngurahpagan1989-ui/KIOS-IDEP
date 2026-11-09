const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const idx = app.indexOf('<!-- 2. Hero Banner Slider (3 Banner) -->');
console.log(app.substring(idx, idx + 2000));

