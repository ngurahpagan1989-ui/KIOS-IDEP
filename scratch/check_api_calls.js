const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');

const calls = [
  'saveConsignmentTransfer',
  'submitDeliveryOrderReceipt',
  'getConsignmentTransfers',
  'saveTransferStock',
  'saveTransfer',
  'submitDeliveryReceipt',
  'getTransfers'
];

calls.forEach(c => {
  const count = (app.match(new RegExp(`api\\(['"]${c}['"]`, 'g')) || []).length;
  console.log(`api('${c}') in app.js:`, count);
});

