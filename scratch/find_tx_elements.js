const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

function find(str) {
  let idx = app.indexOf(str);
  if (idx !== -1) {
    console.log(`app.js (${idx}):`, app.substring(idx - 100, idx + 400));
  }
  idx = html.indexOf(str);
  if (idx !== -1) {
    console.log(`index.html (${idx}):`, html.substring(idx - 100, idx + 400));
  }
}

find('PERIODE TANGGAL');
find('Daftar Transaksi');
find('Klaim Benih');

