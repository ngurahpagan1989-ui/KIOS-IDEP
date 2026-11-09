const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const startIdx = app.indexOf('// ======================== GLASSY FORM V3 FRAMER-MOTION REPRODUCTION =========================');
const endIdx = app.indexOf('// ======================== END GLASSY FORM V3 =========================');

console.log('startIdx:', startIdx, 'endIdx:', endIdx);
if (startIdx !== -1 && endIdx !== -1) {
  console.log(app.substring(startIdx, endIdx + 70));
}

