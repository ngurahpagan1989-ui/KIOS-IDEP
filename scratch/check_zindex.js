const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

const mModal = css.match(/#modal-container[^{]*\{[^}]+\}/);
console.log('modal-container:', mModal ? mModal[0] : 'NONE');

const mLogin = css.match(/#login-screen|\.login-screen[^{]*\{[^}]+\}/);
console.log('login-screen:', mLogin ? mLogin[0] : 'NONE');
