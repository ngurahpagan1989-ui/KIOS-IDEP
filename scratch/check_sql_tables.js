const fs = require('fs');

const sql = fs.readFileSync('seed_dummy_kios_idep.sql', 'utf8');

const tables = ['outlets', 'outlet_stocks', 'consignment_transfers', 'consignment_transfer_items', 'consignment_audits', 'consignment_audit_items'];

tables.forEach(t => {
  const idx = sql.indexOf(`CREATE TABLE IF NOT EXISTS ${t}`) !== -1 ? sql.indexOf(`CREATE TABLE IF NOT EXISTS ${t}`) : sql.indexOf(`CREATE TABLE ${t}`);
  if (idx !== -1) {
    console.log(`=== TABLE ${t} ===`);
    console.log(sql.substring(idx, idx + 600));
  } else {
    console.log(`Table ${t} not found in seed sql`);
  }
});

