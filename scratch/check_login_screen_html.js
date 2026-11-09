const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const idx = html.indexOf('id="login-screen"');
console.log(html.substring(idx - 100, idx + 2000));

