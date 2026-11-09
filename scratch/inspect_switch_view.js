const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const idx = app.indexOf('switchGlassyView');
if (idx !== -1) {
  console.log(app.substring(idx - 100, idx + 1400));
} else {
  console.log('switchGlassyView not found');
}

