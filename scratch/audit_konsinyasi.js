const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
console.log('=== KONSINYASI IN index.html ===');
lines.forEach((line, idx) => {
  if (/konsinyasi|consign/i.test(line)) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});

