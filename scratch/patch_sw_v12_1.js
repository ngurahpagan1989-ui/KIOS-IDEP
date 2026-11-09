const fs = require('fs');
let sw = fs.readFileSync('sw.js', 'utf8');

sw = sw.replace("const CACHE_NAME = 'pos-app-v12.0';", "const CACHE_NAME = 'pos-app-v12.1';");
sw = sw.replace("'./style.css?v=9.0',", "'./style.css?v=9.1',");
sw = sw.replace("'./app.js?v=11.0',", "'./app.js?v=11.1',");

fs.writeFileSync('sw.js', sw, 'utf8');
console.log('SUCCESS: sw.js bumped to pos-app-v12.1!');

