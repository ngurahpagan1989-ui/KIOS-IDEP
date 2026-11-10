const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');

const matches = [];
const lines = app.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('PRODUCTS_CACHE')) {
    matches.push(`Line ${idx + 1}: ${l.trim()}`);
  }
});
console.log('PRODUCTS_CACHE occurrences:', matches.length);
matches.forEach(m => console.log(m));

