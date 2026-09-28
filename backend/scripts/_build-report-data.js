'use strict';
const fs = require('fs');
const path = require('path');
const data = require('./_aar-dataset.json');

const squadByUser = {
  '37c4e263-cc26-4a7d-92c3-7c5a0a1a92e6': 1, '6b660fc0-e470-4449-bc57-0905ec1bab6c': 1,
  '1733b45b-09ca-4512-9e3e-e40dd3fa0a61': 1, 'ad9689c9-9b26-4a74-93b2-f6d7982ccab9': 1,
  '7b996c47-c647-4ac6-bfd3-c9a50ce3d037': 1, 'd16c7e90-82b4-4730-b25f-96bf82bf6ca8': 1,
  '62e880ad-becb-4607-8d47-b6df5d9933d2': 1, '2b58dce1-ee1c-476c-8773-83ea633cdffa': 1,
  '9570f9b9-67d3-4f09-b50a-62be22bfffd7': 2, '8eeeff48-bb34-45d9-bc0c-06b9170135a3': 2,
  '69fa6802-3d44-412e-a050-f8972c0dcb6b': 2, 'e376d442-3ff9-4538-9e15-26383b912c89': 2,
  'b7a5db3a-ef0b-45a9-afee-755277745004': 2, '00d0c792-4c7a-4223-afb3-841954f7219c': 2,
  '883ba1a2-cba7-4468-b082-a8363dee4984': 2, '72f766d2-251d-41cb-9742-f3348c494782': 2,
  'f414b340-50a8-4400-8ffb-f7b656ef429c': 2,
  '2f166d58-bb3d-45c1-8b18-7ca6963e8d5e': 3, 'fa84005f-7617-49f5-b0aa-683446a27181': 3,
  '952cf612-04b7-4be2-9ee7-f64634b45459': 3, 'd3a6b645-55ae-4d7d-8570-05c2f0746cda': 3,
  '94c6d1c1-96ce-43f4-9200-37b50a474851': 3, 'e9e7d21e-c6c1-482e-af88-240a11f39abc': 3,
  '4814c4fd-9e68-4d0b-a604-e157b8438fc7': 3,
  '424d38b9-89fb-4e58-88a1-407db55befdf': 4, '1208819e-71f4-4c1b-8f3e-956596a53259': 4,
  'bf6b0121-4aa3-48f0-9694-6db6a126f175': 4, '44f76e48-0673-46b5-a1a2-92690c7245a1': 4,
  '63b83bbe-476e-4948-bdfb-1b4c0234c782': 4, 'ba68e158-a7df-445a-b299-ecf0c0cc8f53': 4,
  '00a0feeb-1f29-46ff-938a-fcd3c2ecaa80': 4, '60d53d89-1014-430a-b2e9-7f73a21365b9': 4,
  '8b543ffe-ec3c-4b07-819f-102298c2cf26': 4,
};
const victimBySquad = { 1: 'REDSTONE', 2: 'DOGWOOD', 3: 'CYBERDYNE', 4: 'PIXELPLAY' };

const roster = data.roster.map((r) => ({
  name: r.name,
  squad: squadByUser[r.userId] ?? null,
  victim: victimBySquad[squadByUser[r.userId]] ?? '—',
  submitted: r.submittedCount,
  graded: r.gradedCount,
  avgPct: r.avgPct,
  prePct: r.prePct !== null ? Math.round(r.prePct) : null,
  postPct: r.postPct !== null ? Math.round(r.postPct) : null,
  deltaPct: r.deltaPct !== null ? Math.round(r.deltaPct * 10) / 10 : null,
})).sort((a, b) => (a.squad - b.squad) || a.name.localeCompare(b.name));

const unmatched = roster.filter((r) => r.squad === null);
if (unmatched.length) console.error('WARNING unmatched squad:', unmatched);

fs.writeFileSync(path.join(__dirname, '_report-roster.json'), JSON.stringify(roster, null, 1));
console.log('Wrote', roster.length, 'rows');
console.log('Squad counts:', [1,2,3,4].map((n) => [n, roster.filter((r) => r.squad === n).length]));
