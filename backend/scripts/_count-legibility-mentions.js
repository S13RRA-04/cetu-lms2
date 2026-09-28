'use strict';
const data = require('./_aar-dataset.json');
const kw = /(scanning line|scan line|the lines|screen lines|moving graphic|flashing|gray.{0,15}(background|font|text)|grey.{0,15}(background|font|text)|contrast|legib|hard to read|readab|graphics acceleration)/i;

const seen = new Set();
let count = 0;
for (const section of data.surveyResults.sections) {
  for (const tr of section.text_responses ?? []) {
    for (const resp of tr.responses) {
      if (kw.test(resp)) {
        count++;
        console.log(`[${tr.id}] ${resp.slice(0, 90).replace(/\n/g, ' ')}...`);
      }
    }
  }
}
console.log('\nTotal matching responses (not necessarily unique people):', count);
