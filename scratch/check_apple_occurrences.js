const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

let idx = 0;
while ((idx = html.indexOf('Apple', idx)) !== -1) {
  console.log('Apple in index.html at', idx, ':', html.substring(idx - 60, idx + 60));
  idx += 'Apple'.length;
}

