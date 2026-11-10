const fs = require('fs');

const sb = fs.readFileSync('supabaseClient.js', 'utf8');

const actions = [
  'getOutlets',
  'saveOutlet',
  'deleteOutlet',
  'getOutletDetail',
  'saveConsignmentTransfer',
  'getDeliveryOrderReceiptData',
  'submitDeliveryOrderReceipt',
  'getConsignmentTransfers',
  'submitConsignmentAudit',
  'createConsignmentInvoice'
];

actions.forEach(act => {
  const caseStr = `case '${act}':`;
  const idx = sb.indexOf(caseStr);
  if (idx !== -1) {
    console.log(`FOUND ${caseStr} at character ${idx}`);
    // Extract first 150 chars
    console.log(sb.substring(idx, idx + 200).replace(/\n/g, ' '));
  } else {
    console.error(`MISSING ${caseStr} in supabaseClient.js!`);
  }
});

