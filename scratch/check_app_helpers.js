const fs = require('fs');

// Check app.js around line 1640 for handleVaultKey
const code = fs.readFileSync('app.js', 'utf8');

console.log('Has handleVaultKey:', code.includes('handleVaultKey'));
console.log('Has handleVaultClear:', code.includes('handleVaultClear'));
console.log('Has setVaultActiveInput:', code.includes('setVaultActiveInput'));

