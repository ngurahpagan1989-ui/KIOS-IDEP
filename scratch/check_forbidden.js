const fs = require('fs');

const forbiddenPatterns = [
  /\bidep\b/i,
  /\bkios\s*idep\b/i,
  /\bidep\s*foundation\b/i
];

const files = ['index.html', 'katalog.html', 'katalog.css', 'katalog.js', 'style.css', 'app.js', 'sw.js'];
let violations = 0;

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Ignore git-related or commented historical hashes if any, but check code
    forbiddenPatterns.forEach(pattern => {
      if (pattern.test(line)) {
        console.error(`VIOLATION in ${file}:${idx + 1}: ${line.trim()}`);
        violations++;
      }
    });
  });
});

if (violations === 0) {
  console.log('SUCCESS: No forbidden words found in any modified source files!');
} else {
  console.error(`FAILED: Found ${violations} violations!`);
}

