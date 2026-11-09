const fs = require('fs');
const sw = fs.readFileSync('sw.js', 'utf8');
console.log(sw.substring(0, 800));

