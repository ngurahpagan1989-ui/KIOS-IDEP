const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

let idx = 0;
while ((idx = app.indexOf('set-store-phone', idx)) !== -1) {
  console.log(app.substring(idx - 100, idx + 200));
  console.log('---');
  idx += 'set-store-phone'.length;
}

