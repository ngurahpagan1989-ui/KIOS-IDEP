const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const lines = app.split('\n');

console.log('=== OUTLET / TRANSFER FUNCTIONS IN app.js ===');
lines.forEach((line, idx) => {
  if (/function\s+(openOutletModal|showOutletDetailModal|openTransferSuratJalan|saveOutlet|deleteOutlet|saveTransfer|openPodModal|submitPod)/i.test(line)) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});

