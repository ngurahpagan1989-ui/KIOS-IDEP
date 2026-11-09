const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]*>/gi;
let m;
while ((m = linkRegex.exec(html)) !== null) {
  console.log(m[0]);
}

