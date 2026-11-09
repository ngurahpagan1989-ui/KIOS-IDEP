const fs = require('fs');
const readline = require('readline');

async function readSteps(targetIndexes) {
  const fileStream = fs.createReadStream('C:\\Users\\Ngurah pagan\\.gemini\\antigravity\\brain\\c398e296-786c-44c5-8e1b-d13947ccca5b\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    for (const target of targetIndexes) {
      if (line.includes(`"step_index":${target}`)) {
        const obj = JSON.parse(line);
        console.log(`\n================ STEP ${target} (${obj.type}) ================`);
        if (obj.content) console.log('CONTENT:\n', obj.content);
      }
    }
  }
}

readSteps([4298, 4299]);

