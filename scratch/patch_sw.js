const fs = require('fs');
let sw = fs.readFileSync('sw.js', 'utf8');

sw = sw.replace("const CACHE_NAME = 'pos-app-v13.3';", "const CACHE_NAME = 'pos-app-v13.4';");
sw = sw.replace("'./style.css?v=13.3',", "'./style.css?v=13.4',");
sw = sw.replace("'./i18n.js?v=3.2',", "'./i18n.js?v=3.3',");
sw = sw.replace("'./app.js?v=13.3',", "'./app.js?v=13.4',");
sw = sw.replace("'./supabaseClient.js?v=6.5',", "'./supabaseClient.js?v=6.6',");

fs.writeFileSync('sw.js', sw, 'utf8');
console.log('sw.js updated to 13.4');
