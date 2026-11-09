const fs = require('fs');
const readline = require('readline');

async function findVideoSteps() {
  const fileStream = fs.createReadStream('C:\\Users\\Ngurah pagan\\.gemini\\antigravity\\brain\\c398e296-786c-44c5-8e1b-d13947ccca5b\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('WhatsApp Video 2026-11-08') && line.includes('"source":"PLANNER_RESPONSE"')) {
      const obj = JSON.parse(line);
      console.log('STEP INDEX:', obj.step_index);
      console.log('THINKING:', obj.thinking ? obj.thinking.substring(0, 500) : 'none');
    }
  }
}

findVideoSteps();

