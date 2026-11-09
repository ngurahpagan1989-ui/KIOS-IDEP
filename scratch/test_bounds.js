const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

const loginStart = lines.findIndex(l => l.includes('id="login-screen"'));
const appShellStart = lines.findIndex(l => l.includes('id="app-shell"'));

console.log(`loginStart: ${loginStart + 1}, appShellStart: ${appShellStart + 1}`);
console.log('Lines before login:');
console.log(lines.slice(loginStart - 3, loginStart + 3).join('\n'));
console.log('Lines before app shell:');
console.log(lines.slice(appShellStart - 5, appShellStart + 3).join('\n'));

