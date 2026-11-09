const fs = require('fs');
const path = require('path');

function searchInFiles(dir, term) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'venv') continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      searchInFiles(full, term);
    } else if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.toLowerCase().includes(term.toLowerCase())) {
        console.log(`Found "${term}" in ${full}`);
      }
    }
  }
}

searchInFiles('.', 'Pengaturan');
searchInFiles('.', 'Dari Tgl');
searchInFiles('.', 'Struk Termal');
searchInFiles('.', 'Manajemen Media Promosi');

