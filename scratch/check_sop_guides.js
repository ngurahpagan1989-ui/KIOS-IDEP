const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const idx = app.indexOf('KIOS_SOP_GUIDES');
if (idx !== -1) {
  console.log(app.substring(idx, idx + 800));
}

