const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const idx = html.indexOf('id="delivery-signature-modal"');
console.log(html.substring(idx - 50, idx + 800));

