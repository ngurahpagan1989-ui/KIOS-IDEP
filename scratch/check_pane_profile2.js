const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const idx = app.indexOf('pane-profile');
console.log(app.substring(idx + 500, idx + 1800));

