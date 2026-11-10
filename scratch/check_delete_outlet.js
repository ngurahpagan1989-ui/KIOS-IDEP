const fs = require('fs');

const sb = fs.readFileSync('supabaseClient.js', 'utf8');
const idx = sb.indexOf("case 'deleteOutlet':");
console.log(sb.substring(idx, idx + 1200));

