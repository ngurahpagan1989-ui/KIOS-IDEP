const fs = require('fs');

const sb = fs.readFileSync('supabaseClient.js', 'utf8');
const idx = sb.indexOf("case 'submitConsignmentAudit':");
console.log(sb.substring(idx, idx + 2500));

