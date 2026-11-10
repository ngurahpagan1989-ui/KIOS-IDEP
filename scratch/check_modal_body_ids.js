const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

console.log('delivery-signature-modal-body:', html.includes('delivery-signature-modal-body'));
console.log('delivery-signature-modal-footer:', html.includes('delivery-signature-modal-footer'));

