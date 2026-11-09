const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const m = app.match(/getStoreProfile|STORE_PROFILE|app_profile/gi);
console.log('store profile matches:', m ? m.slice(0, 10) : 'none');
