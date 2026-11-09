const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

console.log('--- VIEW 1: SIGN IN ALT ACTIONS ---');
const idx1 = html.indexOf('class="glassy-alt-actions"');
console.log(html.substring(idx1 - 100, idx1 + 1300));

console.log('\n--- VIEW 2: SIGN UP ALT ACTIONS ---');
const idx2 = html.indexOf('class="glassy-alt-actions"', idx1 + 20);
if (idx2 !== -1) {
  console.log(html.substring(idx2 - 100, idx2 + 1300));
}

