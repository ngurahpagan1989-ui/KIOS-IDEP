const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const idx = app.indexOf('store_profile');
if (idx !== -1) {
  console.log(app.substring(idx - 100, idx + 400));
}

const idx2 = app.indexOf('openModuleGuide');
if (idx2 !== -1) {
  console.log('openModuleGuide at', idx2, ':', app.substring(idx2 - 50, idx2 + 400));
}
