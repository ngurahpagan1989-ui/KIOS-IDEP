const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const mBody = html.match(/<body[^>]*>/i);
console.log('body tag:', mBody ? mBody[0] : 'NONE');
const mHtml = html.match(/<html[^>]*>/i);
console.log('html tag:', mHtml ? mHtml[0] : 'NONE');

