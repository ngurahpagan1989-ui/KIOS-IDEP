const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

const regex = /([^{}]*\{[^}]*background(?:-color)?\s*:\s*(?:#fff|#ffffff|white)[^}]*\})/gi;
let match;
let i = 0;
while ((match = regex.exec(css)) !== null) {
  const block = match[1];
  if (block.includes('.btn') || block.includes('tab') || block.includes('input') || block.includes('date') || block.includes('card') || block.includes('modal')) {
    console.log(`[${i++}] ${block.substring(0, 200).replace(/\r?\n/g, ' ')}\n`);
  }
}

