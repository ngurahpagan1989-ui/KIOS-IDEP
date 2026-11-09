const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const idx = app.indexOf('switchGlassyView');
console.log(app.substring(idx + 1000, idx + 2600));

