const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const lines = app.split('\n');

const apiCalls = new Set();
for (let i = 10566; i < 12875; i++) {
  const line = lines[i];
  const matches = line.matchAll(/api\(\s*['"]([^'"]+)['"]/g);
  for (const m of matches) {
    apiCalls.add(m[1]);
  }
}

console.log('All api() calls in Konsinyasi module in app.js:');
apiCalls.forEach(call => console.log(' - ' + call));

