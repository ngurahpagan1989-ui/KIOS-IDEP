const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

const regex = /([^{}]+)\{([^}]*background[^}]*)\}/gi;
let m;
const whiteRules = [];
while ((m = regex.exec(css)) !== null) {
  const sel = m[1].trim();
  const body = m[2].trim();
  if (/background\s*:\s*(#fff|#ffffff|white)(\s*!important)?\s*;/i.test(body)) {
    whiteRules.push({ sel, body: body.slice(0, 100) });
  }
}

console.log(`Found ${whiteRules.length} rules setting pure white background:`);
whiteRules.forEach(r => console.log(`SEL: ${r.sel}\nBODY: ${r.body}\n---`));

