const fs = require('fs');

const i18n = fs.readFileSync('i18n.js', 'utf8');

const terms = ['Toko Cabang & Mitra Konsinyasi', 'Surat Jalan & Serah Terima Lapangan', 'Stok Opname Lapangan', 'Outlet Mitra'];
terms.forEach(t => {
  console.log(`"${t}":`, i18n.includes(`'${t}':`) ? 'IN DICT' : 'MISSING');
});

