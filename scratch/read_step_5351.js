const fs = require('fs');
const readline = require('readline');

async function getStep5351() {
  const fileStream = fs.createReadStream('C:\\Users\\Ngurah pagan\\.gemini\\antigravity\\brain\\c398e296-786c-44c5-8e1b-d13947ccca5b\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('"step_index":5351')) {
      const obj = JSON.parse(line);
      console.log('STEP 5351 THINKING:');
      console.log(obj.thinking);
      break;
    }
  }
}

getStep5351();

