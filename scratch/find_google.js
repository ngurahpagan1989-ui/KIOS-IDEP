const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const idx = html.indexOf('Google');
console.log('Google idx:', idx);
if (idx !== -1) {
  console.log(html.substring(idx - 250, idx + 400));
}

