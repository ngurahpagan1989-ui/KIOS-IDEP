const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');

const loginStart = lines.findIndex(l => l.includes('id="login-screen"'));
const appShellStart = lines.findIndex(l => l.includes('id="app-shell"'));

console.log('Login screen starts at line:', loginStart + 1);
console.log('App shell starts at line:', appShellStart + 1);
console.log('\n--- Lines around login screen start ---');
console.log(lines.slice(loginStart - 2, loginStart + 25).join('\n'));

console.log('\n--- Lines around app shell start ---');
console.log(lines.slice(appShellStart - 10, appShellStart + 5).join('\n'));

