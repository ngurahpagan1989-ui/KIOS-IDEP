const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

const last50Lines = css.split('\n').slice(-50).join('\n');
console.log(last50Lines);

