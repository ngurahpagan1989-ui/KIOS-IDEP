const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const idx = html.indexOf('class="glassy-alt-actions"');
console.log(html.substring(idx - 100, idx + 1000));

