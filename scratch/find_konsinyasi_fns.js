const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const lines = app.split('\n');
console.log('=== KONSINYASI / CONSIGNMENT IN app.js ===');

// Find all functions or blocks related to konsinyasi
lines.forEach((line, idx) => {
  if (/(function|const|let|var)\s+\w*(konsinyasi|consign)\w*/i.test(line) || /case ['"]#?konsinyasi['"]/i.test(line) || /renderKonsinyasi/i.test(line)) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});

