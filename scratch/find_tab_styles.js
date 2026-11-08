const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

// Find any rule that might match settings tabs
const lines = css.split('\n');
lines.forEach((line, i) => {
  if (line.includes('settings-tab-btn') || line.includes('nav-tabs') || line.includes('settings-tabs-wrapper')) {
    console.log(`Line ${i+1}: ${line}`);
  }
});

