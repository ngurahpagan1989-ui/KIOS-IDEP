const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const regex = /(?:theme-light|theme-dark|ekasir_theme|currentTheme)[^;\n]{0,80}/g;
let m;
while ((m = regex.exec(app)) !== null) {
  console.log(m[0]);
}

