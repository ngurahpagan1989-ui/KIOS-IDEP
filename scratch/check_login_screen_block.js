const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const idx = html.indexOf('id="login-screen"');
const idxEnd = html.indexOf('</div>\n  <!-- ===================== TOPBAR', idx);
console.log('Login screen block in index.html:');
console.log(html.substring(idx - 100, idx + 1200));

