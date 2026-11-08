const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

function findMatches(keyword) {
  console.log(`=== Matches for: ${keyword} ===`);
  const regex = new RegExp(`([^\\{\\}]*${keyword}[^\\{\\}]*)\\{([^\\}]*)\\}`, 'g');
  let m;
  while ((m = regex.exec(css)) !== null) {
    const sel = m[1].trim();
    const body = m[2].trim();
    console.log(`SELECTOR: ${sel}`);
    console.log(`BODY: ${body.substring(0, 150)}...\n`);
  }
}

findMatches('settings-tab-btn');
findMatches('settings-tabs-wrapper');

