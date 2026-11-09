const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const idx = app.indexOf('handleSocialLogin');
if (idx !== -1) {
  console.log(app.substring(idx - 50, idx + 350));
}

