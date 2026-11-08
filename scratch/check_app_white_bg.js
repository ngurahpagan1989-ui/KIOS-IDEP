const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const regex = /style="[^"]*background\s*:\s*(?:#fff|#ffffff|white)[^"]*"/gi;
let m;
const matches = [];
while ((m = regex.exec(app)) !== null) {
  const lineNo = app.substring(0, m.index).split('\n').length;
  matches.push({ lineNo, text: m[0] });
}

console.log(`Found ${matches.length} occurrences in app.js:`);
matches.forEach(x => console.log(`Line ${x.lineNo}: ${x.text.slice(0, 100)}`));

