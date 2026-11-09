const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');
console.log('Total lines of CSS:', css.split('\n').length);
console.log(css.substring(css.length - 2500));

