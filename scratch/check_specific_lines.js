const fs = require('fs');
const lines = fs.readFileSync('app.js', 'utf8').split('\n');

const checkIndices = [1120, 3020, 3718, 3863, 3924, 4105, 4544, 4545, 4550, 4878, 4879, 7523, 7530, 7739, 8149, 8154, 8641, 11057, 11269, 11935, 11941, 12226, 13038, 15312, 15762, 16092, 16485, 16882, 17107, 17139, 17258, 21587, 21601, 21607];

checkIndices.forEach(idx => {
  const line = lines[idx - 1];
  if (line) console.log(`${idx}: ${line.trim()}`);
});

