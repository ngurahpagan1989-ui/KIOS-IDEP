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
        if (obj.thinking) console.log('THINKING:\n', obj.thinking.substring(0, 1500));
        if (obj.content) console.log('CONTENT:\n', obj.content.substring(0, 1000));
      }
    }
  }
}

readSteps([4296, 5222]);

