'use strict';
// Mirror of parseDeliverables from ChallengeFlow.jsx — run to verify parsing

function splitOnCommasAnd(str) {
  return str.split(/,\s*(?:and\s+)?|\s+and\s+/i).map(s=>s.trim().replace(/\.$/,'')).filter(s=>s.length>3);
}
function parseDeliverables(description='') {
  if (!description) return null;
  const p1=description.match(/(?:answers on|prepare (?:squad )?answers on)\s+(.+?)(?:\.|$)/i);
  if(p1){const p=splitOnCommasAnd(p1[1]);if(p.length>=2)return p;}
  const numbered=[...description.matchAll(/\d+\.\s+([^\n]+)/g)];
  if(numbered.length>=2)return numbered.map(m=>{const t=m[1].replace(/\s*—.*/,'').trim();return t.length>80?t.slice(0,80)+'…':t;});
  const p3=description.match(/your job is to\s+(.+?)(?:\.|$)/i);
  if(p3){const p=splitOnCommasAnd(p3[1]);if(p.length>=2)return p;}
  const p4=description.match(/\busing\s+(?:the\s+)?(.+?)(?:\blunch\b|\bbefore\b|\.|$)/i);
  if(p4){const p=splitOnCommasAnd(p4[1]);if(p.length>=2)return p;}
  const sentences=description.split(/(?<=[.!?])\s+/);
  for(const sent of sentences.reverse()){const cl=sent.split(/,\s*(?:and\s+)?/i).map(s=>s.trim()).filter(s=>s.length>5&&/^[A-Za-z]/.test(s));if(cl.length>=3)return cl;}
  const bullets=description.split(/\n/).map(l=>l.replace(/^[-•*\d.]+\s*/,'').trim()).filter(Boolean);
  if(bullets.length>=3)return bullets;
  return null;
}

const cases = [
  ['Anyproxy', 'Review the Anyproxy/5socks router botnet indictment and prepare squad answers on purpose, infrastructure, roles, charges, and persistence.'],
  ['Day 2 AM Synthesis', 'Case 288A-HT-3829471 | BROKERED EXIT | R3 / Day 2 AM workshop. Complete the synthesis worksheet using the Cardinal email exports, NorthBay subscriber return, IP-login exhibits, and the R0-R2 case picture before lunch.'],
  ['Day 4 AM', 'Work as a squad to determine what R6 changed about attribution in BROKERED EXIT. Build a timeline from physical and digital range artifacts, use the Troubador password to access protected digital evidence, correlate the findings across prior R# releases, and state a defensible attribution position with confidence levels.'],
  ['Day 4 PM', "Work as a squad to apply the Investigator's Toolbox framework to the full BROKERED EXIT record from R0-R7. Your job is not to list everything. Your job is to identify what matters, explain which tool category supports it, document provenance, validate consequential findings, and prepare a defensible attribution-support brief."],
  ['Day 5 Capstone', `Work as a squad. By 1200, your pair must produce three joint deliverables:\n\n1. Investigative timeline and attribution assessment — A one-page chronology\n\n2. Charging recommendation memo — Draft charge sheets\n\n3. Next-step legal process and partner coordination — Specific U.S. legal process`],
  ['Day 1 AM', 'Work as a squad to calibrate what each case-team triad role brings to BROKERED EXIT and where cross-role coordination is required.'],
  ['Brokered Exit', 'Review released evidence packages and develop the Brokered Exit case assessment.'],
];

cases.forEach(([name, desc]) => {
  const result = parseDeliverables(desc);
  console.log(`\n[${name}]`);
  if (result) result.forEach((d,i) => console.log(`  ${i+1}. ${d}`));
  else console.log('  → single textarea (no structured items found)');
});
