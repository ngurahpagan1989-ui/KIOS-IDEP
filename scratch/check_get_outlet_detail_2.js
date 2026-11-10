const fs = require('fs');

const sb = fs.readFileSync('supabaseClient.js', 'utf8');
const idx = sb.indexOf("case 'getOutletDetail':");
console.log(sb.substring(idx + 1800, idx + 3500));

