const fs = require('fs');

const appJs = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

function searchBoth(term) {
  console.log(`\n=== SEARCH: ${term} ===`);
  let idx = appJs.indexOf(term);
  if (idx !== -1) {
    console.log(`app.js at ${idx}:`, appJs.substring(Math.max(0, idx - 100), Math.min(appJs.length, idx + 400)));
  } else {
    console.log('Not in app.js');
  }
  idx = html.indexOf(term);
  if (idx !== -1) {
    console.log(`index.html at ${idx}:`, html.substring(Math.max(0, idx - 100), Math.min(html.length, idx + 400)));
  } else {
    console.log('Not in index.html');
  }
}

searchBoth('Format Batch & Multi-Tier');
searchBoth('Hak Akses & Peran');
searchBoth('settings-subnav');
searchBoth('settings-tabs');

