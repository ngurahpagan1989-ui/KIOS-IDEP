const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

let idx = 0;
while ((idx = app.indexOf('theme-light', idx)) !== -1) {
  console.log(`\nMatch at ${idx}:`);
  console.log(app.substring(idx - 100, idx + 250));
  idx += 'theme-light'.length;
}

