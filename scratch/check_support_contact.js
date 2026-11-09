const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const mPhone = app.match(/phone[^\n;]{0,60}/gi);
console.log('Sample phone matches in app.js:');
if (mPhone) {
  console.log(mPhone.slice(0, 5));
}

const mWA = app.match(/api\.whatsapp\.com[^\n;"]{0,100}|wa\.me[^\n;"]{0,100}/gi);
console.log('Sample WhatsApp URL matches in app.js:');
if (mWA) {
  console.log(mWA.slice(0, 5));
}
