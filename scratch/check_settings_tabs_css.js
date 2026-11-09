const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

const matches = css.match(/[^{}]*(?:settings-tab|settings-tabs|nav-tabs)[^{]*\{[^}]+\}/g);
console.log('Matches count:', matches ? matches.length : 0);
if (matches) {
  matches.forEach((m, i) => console.log(`[${i}] ${m}\n`));
}

