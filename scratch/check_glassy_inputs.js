const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const loginMatch = html.match(/id="login-username"[\s\S]{1,200}/);
console.log('login-username in index.html:', loginMatch ? loginMatch[0] : 'NONE');

const css = fs.readFileSync('style.css', 'utf8');
const glassyAutofill = css.match(/[^{}]*glassy[^{}]*:-webkit-autofill[^{]*\{[^}]+\}/g);
console.log('glassy autofill in css:', glassyAutofill);

