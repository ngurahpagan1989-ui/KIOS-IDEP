const fs = require('fs');
const readline = require('readline');

async function findVideoInTranscript() {
  const fileStream = fs.createReadStream('C:\\Users\\Ngurah pagan\\.gemini\\antigravity\\brain\\c398e296-786c-44c5-8e1b-d13947ccca5b\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('WhatsApp Video')) {
      const obj = JSON.parse(line);
      console.log('STEP INDEX:', obj.step_index, 'TYPE:', obj.type, 'SOURCE:', obj.source);
    }
  }
}

findVideoInTranscript();

