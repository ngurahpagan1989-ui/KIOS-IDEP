const fs = require('fs');

const sb = fs.readFileSync('supabaseClient.js', 'utf8');
const idx = sb.indexOf("case 'getDeliveryOrderReceiptData':");
console.log(sb.substring(idx + 600, idx + 2500));

