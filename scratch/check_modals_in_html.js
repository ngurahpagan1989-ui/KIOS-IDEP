const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

console.log('delivery-signature-modal in index.html:', html.includes('delivery-signature-modal'));
console.log('delivery-receipt-modal in index.html:', html.includes('delivery-receipt-modal'));
console.log('pod-modal in index.html:', html.includes('pod-modal'));
console.log('pod-view-modal in index.html:', html.includes('pod-view-modal'));

