const fs = require('fs');
const sw = fs.readFileSync('sw.js', 'utf8');
console.log(sw.substring(sw.indexOf('addEventListener(\'fetch\''), sw.indexOf('addEventListener(\'fetch\'') + 800));

