const fs = require('fs');

const sb = fs.readFileSync('supabaseClient.js', 'utf8');
const lines = sb.split('\n');

console.log(lines.slice(1250, 1320).join('\n'));

