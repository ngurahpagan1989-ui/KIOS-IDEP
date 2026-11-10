const fs = require('fs');

const sb = fs.readFileSync('supabaseClient.js', 'utf8');

const matches = [];
const lines = sb.split('\n');
lines.forEach((l, idx) => {
  if (l.includes("from('consignment_audits')") || l.includes("from('consignment_audit_items')")) {
    matches.push(`Line ${idx + 1}: ${l.trim()}`);
  }
});
console.log('Matches:', matches);

