const fs = require('fs');

const appJs = fs.readFileSync('app.js', 'utf8');

function findSnippet(term, len = 600) {
  let idx = 0;
  console.log(`\n=================== SEARCH: ${term} ===================`);
  while ((idx = appJs.indexOf(term, idx)) !== -1) {
    console.log(`--- MATCH AT ${idx} ---`);
    console.log(appJs.substring(Math.max(0, idx - 150), Math.min(appJs.length, idx + len)));
    idx += term.length;
  }
}

findSnippet('Profil Toko & Pajak');
findSnippet('Dari Tgl:');
findSnippet('Struk Termal');
findSnippet('Manajemen Media Promosi');
