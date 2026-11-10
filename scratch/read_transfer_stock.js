const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const lines = app.split('\n');

console.log(lines.slice(11090, 11202).join('\n'));

