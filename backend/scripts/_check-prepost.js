'use strict';
const data = require('./_aar-dataset.json');
console.log('Full roster pre/post:');
for (const r of data.roster) {
  console.log(
    r.name.padEnd(22),
    'pre:', r.preScore, '/', r.preMax, r.prePct !== null ? `(${r.prePct.toFixed(0)}%)` : '(none)',
    '| post:', r.postScore, '/', r.postMax, r.postPct !== null ? `(${r.postPct.toFixed(0)}%)` : '(none)',
    '| delta:', r.deltaPct !== null ? r.deltaPct.toFixed(1) : 'n/a',
  );
}
