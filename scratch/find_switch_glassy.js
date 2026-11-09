const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const idx = app.indexOf('switchGlassyView');
console.log('switchGlassyView idx:', idx);
if (idx !== -1) {
  console.log(app.substring(idx - 200, idx + 800));
}

