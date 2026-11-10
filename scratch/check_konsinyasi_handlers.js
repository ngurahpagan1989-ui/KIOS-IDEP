const fs = require('fs');

const sb = fs.readFileSync('supabaseClient.js', 'utf8');

const actions = [
  'getOutlets',
  'saveOutlet',
  'deleteOutlet',
  'getOutletDetail',
  'transferStockToOutlet',
  'getConsignmentSuratJalanPdf',
  'getDeliveryOrderReceiptData',
  'confirmDeliveryReceipt',
  'getAllConsignmentTransfers',
  'submitConsignmentAudit',
  'createConsignmentInvoice'
];

actions.forEach(act => {
  const caseStr = `case '${act}':`;
  const idx = sb.indexOf(caseStr);
  if (idx !== -1) {
    console.log(`[OK] ${caseStr} FOUND`);
  } else {
    console.error(`[ERROR] ${caseStr} NOT FOUND in supabaseClient.js!`);
  }
});

