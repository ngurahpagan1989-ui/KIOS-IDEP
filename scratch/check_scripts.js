const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const scriptRegex = /<script[^>]+src=["'][^"']+["'][^>]*>/gi;
let m;
while ((m = scriptRegex.exec(html)) !== null) {
  console.log(m[0]);
}

