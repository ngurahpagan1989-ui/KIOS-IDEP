const fs = require('fs');

const sb = fs.readFileSync('supabaseClient.js', 'utf8');
const lines = sb.split('\n');

console.log('=== KONSINYASI IN supabaseClient.js ===');
lines.forEach((line, idx) => {
  if (/(function|const|let|var)\s+\w*(outlet|consign|transfer|audit|pod|receipt)\w*/i.test(line) || /getOutlets|saveOutlet|getTransfers|saveTransfer|getAudits|saveAudit|recordAudit/i.test(line)) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});

