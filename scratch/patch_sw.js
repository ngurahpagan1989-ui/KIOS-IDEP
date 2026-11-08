const fs = require('fs');
let sw = fs.readFileSync('sw.js', 'utf8');

sw = sw.replace("const CACHE_NAME = 'pos-app-v11.5';", "const CACHE_NAME = 'pos-app-v12.0';");
sw = sw.replace("'./style.css?v=8.3',", "'./style.css?v=9.0',");
sw = sw.replace("'./i18n.js?v=2.9',", "'./i18n.js?v=3.0',");
sw = sw.replace("'./app.js?v=10.4',", "'./app.js?v=11.0',");
sw = sw.replace("'./supabaseClient.js?v=6.4',", "'./supabaseClient.js?v=6.5',");

fs.writeFileSync('sw.js', sw, 'utf8');
console.log('SUCCESS: sw.js updated with pos-app-v12.0!');

