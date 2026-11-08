const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

console.log('--- INDEX.HTML SCRIPT & CSS LINKS ---');
const regex = /(?:src|href)="([^"]*(?:style\.css|app\.js|katalog|supabaseClient|i18n)[^"]*)"/g;
let m;
while ((m = regex.exec(html)) !== null) {
  console.log(m[1]);
}

console.log('\n--- SW.JS CACHE & ASSETS ---');
console.log(sw.substring(0, 400));

