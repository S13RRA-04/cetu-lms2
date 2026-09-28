'use strict';
const data = require('./_aar-dataset.json');

console.log('=== SUMMARY ===');
console.log(JSON.stringify(data.summary, null, 1));
console.log('Grade distribution:', JSON.stringify(data.gradeDistribution));
console.log('Data notes:', JSON.stringify(data.dataNotes, null, 1));
console.log('Cohort:', JSON.stringify(data.cohort));
console.log('Squads:', JSON.stringify(data.squadRows));
console.log('PrePost aggregate:', JSON.stringify(data.prePostAggregate, null, 1));

console.log('\n=== PARTICIPATION (submittedCount / gradedCount / avgPct) ===');
const sorted = [...data.roster].sort((a, b) => (a.avgPct ?? -1) - (b.avgPct ?? -1));
for (const r of sorted) {
  console.log(r.name.padEnd(22), 'submitted:', r.submittedCount, '| graded:', r.gradedCount, '| avg%:', r.avgPct, '| totalScore/Max:', r.totalScore + '/' + r.totalMax);
}

console.log('\n=== SURVEY ===');
console.log('response_count:', data.surveyResults.response_count, 'recommendation_count:', data.surveyResults.recommendation_count);
console.log('sections:', data.surveyResults.sections.map((s) => s.title));
console.log(JSON.stringify(data.surveyResults.recommendation_groups, null, 1));
