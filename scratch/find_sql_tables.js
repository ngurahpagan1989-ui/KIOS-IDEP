const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.sql') || f.endsWith('.md'));

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (/create\s+table.*(outlet|consignment)/i.test(content)) {
    console.log(`Found in ${f}:`);
    const matches = content.match(/create\s+table[^\;]+\;/gi);
    if (matches) {
      matches.filter(m => /outlet|consignment/i.test(m)).forEach(m => console.log(m.substring(0, 300)));
    }
  }
});

