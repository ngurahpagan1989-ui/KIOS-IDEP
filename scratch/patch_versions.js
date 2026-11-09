const fs = require('fs');

// Patch index.html
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/href="style\.css\?v=[^"]+"/g, 'href="style.css?v=13.0"');
html = html.replace(/src="app\.js\?v=[^"]+"/g, 'src="app.js?v=13.0"');

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully patched index.html to v=13.0');

// Patch sw.js
let sw = fs.readFileSync('sw.js', 'utf8');

sw = sw.replace(/const CACHE_NAME = 'pos-app-v[^']+';/, "const CACHE_NAME = 'pos-app-v13.0';");
sw = sw.replace(/'\.\/style\.css\?v=[^']+'/, "'./style.css?v=13.0'");
sw = sw.replace(/'\.\/app\.js\?v=[^']+'/, "'./app.js?v=13.0'");

fs.writeFileSync('sw.js', sw, 'utf8');
console.log('Successfully patched sw.js to v=13.0');

