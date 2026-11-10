const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const sb = fs.readFileSync('supabaseClient.js', 'utf8');

console.log('=== delivery_status in app.js ===');
app.split('\n').forEach((l, idx) => {
  if (l.includes('delivery_status')) console.log(`app.js:${idx + 1}: ${l.trim()}`);
});

console.log('=== delivery_status in supabaseClient.js ===');
sb.split('\n').forEach((l, idx) => {
  if (l.includes('delivery_status')) console.log(`sb.js:${idx + 1}: ${l.trim()}`);
});

