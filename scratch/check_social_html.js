const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const idx = html.indexOf('glassy-social-grid');
if (idx !== -1) {
  console.log(html.substring(idx - 200, idx + 600));
}

