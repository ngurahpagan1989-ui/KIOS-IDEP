const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const lines = app.split('\n');

for (let i = 10550; i < 12900; i++) {
  const line = lines[i];
  if (/^\s*(function\s+\w+|window\.\w+\s*=)/.test(line)) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
}

