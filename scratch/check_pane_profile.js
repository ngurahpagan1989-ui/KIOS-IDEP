const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const idx = app.indexOf('pane-profile');
if (idx !== -1) {
  console.log(app.substring(idx - 100, idx + 800));
}

