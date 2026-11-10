const fs = require('fs');

const sb = fs.readFileSync('supabaseClient.js', 'utf8');
const start = sb.indexOf("case 'transferStockToOutlet':");
console.log(sb.substring(start, start + 2500));

