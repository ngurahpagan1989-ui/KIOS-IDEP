const fs = require('fs');
const readline = require('readline');

async function readStepsRange(start, end) {
  const fileStream = fs.createReadStream('C:\\Users\\Ngurah pagan\\.gemini\\antigravity\\brain\\c398e296-786c-44c5-8e1b-d13947ccca5b\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const obj = JSON.parse(line);
    if (obj.step_index >= start && obj.step_index <= end && obj.content && obj.source === 'MODEL') {
      console.log(`\n================ STEP ${obj.step_index} (${obj.type}) ================`);
      console.log(obj.content.substring(0, 800));
    }
  }
}

readStepsRange(4300, 4320);

