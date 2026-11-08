const fs = require('fs');
let html = fs.readFileSync('katalog.html', 'utf8');

html = html.replace('href="katalog.css?v=3.0"', 'href="katalog.css?v=3.1"');
html = html.replace('src="katalog.js?v=3.0"', 'src="katalog.js?v=3.1"');

fs.writeFileSync('katalog.html', html, 'utf8');
console.log('SUCCESS: katalog.html updated to v=3.1!');

