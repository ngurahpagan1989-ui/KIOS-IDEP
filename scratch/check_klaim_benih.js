const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

let idx = 0;
while ((idx = app.indexOf('Klaim Benih', idx)) !== -1) {
  console.log(`Match at ${idx}:`);
  console.log(app.substring(idx - 150, idx + 150));
  idx += 'Klaim Benih'.length;
}

