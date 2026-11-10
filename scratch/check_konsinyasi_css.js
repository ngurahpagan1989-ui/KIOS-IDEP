const fs = require('fs');

const css = fs.readFileSync('style.css', 'utf8');

const terms = ['konsinyasi', 'pod-', 'sig-', 'audit-', 'outlet-'];
terms.forEach(t => {
  const matches = (css.match(new RegExp(t, 'g')) || []).length;
  console.log(`term "${t}" matches in style.css:`, matches);
});

