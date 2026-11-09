const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const m = app.match(/set-store-[a-zA-Z0-9_-]+/g);
console.log('set-store- IDs:', Array.from(new Set(m)));

