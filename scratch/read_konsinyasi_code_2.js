const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const lines = app.split('\n');

console.log(lines.slice(10740, 11000).join('\n'));

