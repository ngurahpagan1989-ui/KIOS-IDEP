const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

function findCssSnippet(selector) {
  console.log(`\n=== CSS FOR: ${selector} ===`);
  let idx = 0;
  while ((idx = css.indexOf(selector, idx)) !== -1) {
    const start = Math.max(0, idx - 40);
    const end = Math.min(css.length, idx + 250);
    console.log(css.substring(start, end));
    console.log('------------------------');
    idx += selector.length;
  }
}

findCssSnippet('.settings-tab-btn');
findCssSnippet('.invoice-format-tab-btn');
findCssSnippet('input[type="date"]');
findCssSnippet('input[type=date]');
findCssSnippet(':-webkit-autofill');

