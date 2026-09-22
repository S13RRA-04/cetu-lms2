'use strict';
/**
 * Seed the Day 2 "Digital Evidence Workshop" — standalone reinforcement for
 * the four forensics/timeline/scene-management assessment topics
 * (forensics_host, forensics_network, timeline_construction,
 * scene_management). The source facilitator guide labels this "Day 3"
 * content, but it slots into Day 2 of this course's actual schedule —
 * explicitly NOT tied to the Wednesday PM live-action block or any PACT
 * scenario, a self-contained fictional case (Sable Ridge Financial
 * Advisors) the guide itself says is safe to run "wherever it fits."
 *
 * Not part of packet-heist/packet-heist-v2 (no drop_number/scenario_name),
 * same pattern as the Day 1 Hive workshop — gated purely by is_published +
 * per-squad AssignmentUnlock, not the campaign release engine.
 *
 * Run: node backend/scripts/seed-pact-day2-digital-evidence-workshop.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const TITLE = 'Day 2 Workshop — Digital Evidence (Sable Ridge Financial Advisors)';

const CASE_NARRATIVE = `This is squad work. Talk through each part together before anyone writes an answer. Nothing in this packet is multiple choice — every answer is something your squad drafts and defends.

This scenario — Sable Ridge Financial Advisors — is unrelated to anything else in the course. It's built fresh for this workshop.

PART 1 — TEN RAW EVIDENCE FRAGMENTS FROM AN INTRUSION AT SABLE RIDGE FINANCIAL ADVISORS

Fragment 1
Badge access log (facilities system): Badge holder J. Kim, Main Entrance, "Access granted," 2024-11-04, 07:52 AM (Eastern, UTC-5).

Fragment 2
Browser history (WKS-14, user profile jkim): URL hxxp://mail-secure-login.example/reset, title "Account Security Verification," visited 2024-11-04, 09:05 AM (Eastern, UTC-5).

Fragment 3
Windows Security event log (WKS-14): Event ID 4625 (failed logon), account jkim, source IP 198.51.100.77, six occurrences, 2024-11-04, 09:14:00–09:14:45 AM (Eastern, UTC-5).

Fragment 4
Windows Security event log (WKS-14): Event ID 4624 (successful logon), account jkim, Logon Type 10 (RemoteInteractive), source IP 198.51.100.77, 2024-11-04 14:21:03 UTC.

Fragment 5
NetFlow record (perimeter collector): Src 10.20.4.14 (WKS-14) → Dst 198.51.100.77, port 3389, 4,204,880 bytes, duration 47m12s, session start 2024-11-04 14:21:00 UTC.

Fragment 6
DNS resolver log (internal): Query update-secure-cdn.example, type A, answer 198.51.100.77, client WKS-14, 2024-11-04 14:23:52 UTC.

Fragment 7
Web proxy log (perimeter): GET hxxp://update-secure-cdn.example/payload.bin, client WKS-14, status 200, 2,114,302 bytes, 2024-11-04 14:24:40 UTC.

Fragment 8
Registry excerpt (WKS-14, extracted from forensic image): HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run, new value "SecurityHealthUpdate" → %APPDATA%\\svchosthelper.exe, last write time 2024-11-04T14:26:10Z.

Fragment 9
Live memory acquisition (WKS-14, captured on scene): Process svchost.exe (PID 4471, parent PID inconsistent with the normal svchost tree) with an active TCP connection to 198.51.100.77:443. Capture time 2024-11-04, 3:00 PM (Eastern, UTC-5).

Fragment 10
On-scene witness interaction: IT Director recalls, "I think Jamie mentioned her computer was running slow sometime after she got back from lunch." No specific time given; lunch is typically 12:00–1:00 PM. Interview conducted on scene, same day.

For each fragment, identify: the artifact category it belongs to (one of the six host categories or four network categories from this morning's lecture, or note if it's neither), one specific thing it tells you, and one specific thing it does NOT tell you on its own.

PART 2 — BUILD THE TIMELINE

Using all ten fragments above, build the actual timeline together: normalize every timestamp to UTC, sort chronologically, assign a confidence level (High/Medium/Low) to each event, and identify at least one real gap in coverage. Then write the narrative you'd hand to the AUSA — grounded only in what's in your timeline.

PART 3 — SCENE MANAGEMENT

Sable Ridge Financial Advisors, a wealth-management firm, reported anomalous activity on its file server. Your squad arrives on scene at the firm's office suite. The file server, SRV-DATA1, is powered on and its console shows an active remote session already logged in. Two people are present: the office manager, and a part-time IT contractor who was called in an hour ago. The office manager says the server room was locked when she left last night and locked again this morning. The contractor says he found the server room door unlocked when he arrived.`;

const DESCRIPTION = 'Squad exercise reinforcing Day 2’s forensics/timeline/scene-management lecture, using a self-contained fictional intrusion (Sable Ridge Financial Advisors) unrelated to the range scenario. Work through Part 1 (source and limits), Part 2 (build the timeline), and Part 3 (scene management) together as a squad — talk it out before anyone writes.';

const FRAGMENT_FACTS = [
  `Badge access log (facilities system): Badge holder J. Kim, Main Entrance, "Access granted," 2024-11-04, 07:52 AM (Eastern, UTC-5).`,
  `Browser history (WKS-14, user profile jkim): URL hxxp://mail-secure-login.example/reset, title "Account Security Verification," visited 2024-11-04, 09:05 AM (Eastern, UTC-5).`,
  `Windows Security event log (WKS-14): Event ID 4625 (failed logon), account jkim, source IP 198.51.100.77, six occurrences, 2024-11-04, 09:14:00–09:14:45 AM (Eastern, UTC-5).`,
  `Windows Security event log (WKS-14): Event ID 4624 (successful logon), account jkim, Logon Type 10 (RemoteInteractive), source IP 198.51.100.77, 2024-11-04 14:21:03 UTC.`,
  `NetFlow record (perimeter collector): Src 10.20.4.14 (WKS-14) → Dst 198.51.100.77, port 3389, 4,204,880 bytes, duration 47m12s, session start 2024-11-04 14:21:00 UTC.`,
  `DNS resolver log (internal): Query update-secure-cdn.example, type A, answer 198.51.100.77, client WKS-14, 2024-11-04 14:23:52 UTC.`,
  `Web proxy log (perimeter): GET hxxp://update-secure-cdn.example/payload.bin, client WKS-14, status 200, 2,114,302 bytes, 2024-11-04 14:24:40 UTC.`,
  `Registry excerpt (WKS-14, extracted from forensic image): HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run, new value "SecurityHealthUpdate" → %APPDATA%\\svchosthelper.exe, last write time 2024-11-04T14:26:10Z.`,
  `Live memory acquisition (WKS-14, captured on scene): Process svchost.exe (PID 4471, parent PID inconsistent with the normal svchost tree) with an active TCP connection to 198.51.100.77:443. Capture time 2024-11-04, 3:00 PM (Eastern, UTC-5).`,
  `On-scene witness interaction: IT Director recalls, "I think Jamie mentioned her computer was running slow sometime after she got back from lunch." No specific time given; lunch is typically 12:00–1:00 PM. Interview conducted on scene, same day.`,
];

const FRAGMENT_KEY_ELEMENTS = [
  [
    'Identifies this as a badge access log — not one of the ten forensic categories, a facilities/physical-security source',
    'Tells you: J. Kim physically entered the building at 07:52 AM Eastern',
    'Does NOT tell you: that she was at her workstation, or that she (not someone else) later used her account',
  ],
  [
    'Identifies this as Host — browser data',
    'Tells you: a phishing-styled link was visited under Kim’s browser profile at 09:05 AM Eastern',
    'Does NOT tell you: that Kim herself clicked it (vs. someone else at her machine), or that this alone caused the later compromise',
  ],
  [
    'Identifies this as Host — event logs',
    'Tells you: six failed logon attempts on Kim’s account from a specific external IP',
    'Does NOT tell you: whether those attempts were Kim mistyping her password or an outside actor guessing it',
  ],
  [
    'Identifies this as Host — event logs',
    'Tells you: a successful remote logon on Kim’s account from the same external IP that failed six times minutes earlier',
    'Does NOT tell you: what the logged-in session actually did once inside — that requires other artifacts',
  ],
  [
    'Identifies this as Network — NetFlow/IPFIX',
    'Tells you: a 47-minute network session existed between WKS-14 and the external IP on the RDP port',
    'Does NOT tell you: what was actually transmitted inside that session — NetFlow has no payload',
  ],
  [
    'Identifies this as Network — DNS logs',
    'Tells you: WKS-14 resolved a specific external domain to the same IP already seen',
    'Does NOT tell you: what was downloaded or why — DNS only shows the lookup',
  ],
  [
    'Identifies this as Network — proxy logs',
    'Tells you: WKS-14 actually downloaded a specific file from that domain, with size and status code',
    'Does NOT tell you: what the file does — that requires the file itself and host-side analysis',
  ],
  [
    'Identifies this as Host — registry',
    'Tells you: a persistence mechanism was planted pointing to a suspicious binary in the user’s AppData folder',
    'Does NOT tell you: whether that binary has actually executed, or what it does once it runs',
  ],
  [
    'Identifies this as Host — memory (RAM)',
    'Tells you: as of the capture time, a suspicious process was actively connected to the same external IP',
    'Does NOT tell you: when that process first started — memory shows current state, not history, unless correlated with logs that do',
  ],
  [
    'Identifies this as witness/on-scene interaction — not a technical artifact category',
    'Tells you: roughly when the issue was noticed by someone at the company',
    'Does NOT tell you: when the intrusion actually began — noticing and starting are different facts (the clearest example of that gap in the whole set)',
  ],
];

function refNote(text) {
  return [`MODEL ANSWER (reference only — grade against the must-include list, not exact wording): ${text}`];
}

const PROMPTS = [];

FRAGMENT_FACTS.forEach((fact, i) => {
  PROMPTS.push({
    points: 7,
    text: `**FRAGMENT ${i + 1}**\n\n${fact}\n\nIdentify: the artifact category (one of the six host categories or four network categories from lecture, or note if it's neither), one specific thing this fragment tells you, and one specific thing it does NOT tell you on its own.`,
    keyElements: FRAGMENT_KEY_ELEMENTS[i],
  });
});

PROMPTS.push({
  points: 25,
  text: `**PART 2 — BUILD THE TIMELINE**\n\nUsing all ten fragments, build the timeline together: normalize every timestamp to UTC, sort chronologically, and assign a confidence level (High/Medium/Low) to each event. List every event in order with its UTC time, the fact, and your confidence level.`,
  keyElements: [
    'All 10 events converted to UTC and sorted chronologically (badge-in 12:52 UTC → phishing link 14:05 UTC → failed logons 14:14 UTC → successful RDP logon 14:21:03 UTC → NetFlow session start 14:21:00 UTC → DNS resolution 14:23:52 UTC → proxy download 14:24:40 UTC → registry persistence 14:26:10 UTC → memory capture 20:00 UTC → witness recollection ~18:00–19:00 UTC)',
    'Confidence levels are differentiated, not uniform — e.g. the badge log and event logs High, the browser-profile link Medium-High (tied to the profile, not proven to be Kim at the keyboard), the witness recollection Low',
    'Notes explain WHY a confidence level was assigned (e.g. NetFlow corroborates the RDP logon; memory capture is only high confidence as of capture time, not for when activity started)',
  ],
});

PROMPTS.push({
  points: 15,
  text: `**PART 2 — THE GAP**\n\nIdentify at least one real gap in coverage in your timeline — a stretch of time with no logged activity. State the gap's start and end, and explain why a memory capture confirming the compromise was still active at capture time does NOT by itself establish when the intrusion started.`,
  keyElements: [
    'Names the gap: roughly 14:26 UTC (registry persistence planted) to 20:00 UTC (memory capture) — about 5.5 hours with no visibility into what the actor did',
    'Explains that the memory capture confirms the compromise was still live AT CAPTURE TIME only — it does not establish when activity started; that is what the earlier host/network logs are for',
  ],
  commonErrors: refNote('The gap runs from 14:26 UTC (registry persistence) to 20:00 UTC (memory capture) — roughly 5.5 hours with no visibility into what the actor did or didn’t do. A squad whose timeline has no gap identified likely treated the memory capture as establishing when the intrusion started rather than just its state at capture time.'),
});

PROMPTS.push({
  points: 15,
  text: `**PART 2 — THE NARRATIVE**\n\nWrite four to six sentences, grounded only in your timeline, that your squad would hand to the AUSA. Every claim should be traceable to a specific fragment.`,
  keyElements: [
    'Every claim traces to a specific fragment — no invented facts beyond what the ten fragments and their timestamps support',
    'The IT Director’s account is included with a lower confidence rather than either omitted or treated as equally solid',
    'The gap (14:26–20:00 UTC) is named rather than silently skipped over',
  ],
});

PROMPTS.push({
  points: 10,
  text: `**PART 3 — SCENE MANAGEMENT**\n\nSable Ridge Financial Advisors, a wealth-management firm, reported anomalous activity on its file server. Your squad arrives on scene. The file server, SRV-DATA1, is powered on and its console shows an active remote session already logged in. Two people are present: the office manager, and a part-time IT contractor who was called in an hour ago. The office manager says the server room was locked when she left last night and locked again this morning. The contractor says he found the server room door unlocked when he arrived.\n\n3a — What is your squad's very first action once scene security is confirmed, and why? Be specific about what you risk losing on SRV-DATA1 if you don't do this first.`,
  keyElements: [
    'Prioritizes confirming/capturing what’s on the open remote session before anything else changes it — treats SRV-DATA1 as a live-acquisition priority',
    'Identifies the specific risk: if the session is closed or the machine loses power, whatever is in memory (current state, decrypted material, active connections) is gone permanently',
    'Notes photographing the console screen showing the active session before touching anything, then moving to memory capture',
  ],
});

PROMPTS.push({
  points: 10,
  text: `**PART 3b — Justify the sequencing**\n\nYou just placed the eight scene-checklist actions in order in the matching exercise. Now justify three of the transitions (e.g. "why does this step have to come before the next one") in one sentence each.`,
  keyElements: [
    'Photographic baseline before identifying volatile evidence at risk: the scene must be preserved on record before making decisions that involve touching or assessing devices',
    'Chain-of-custody documentation before witness interaction: once you start handling or discussing items with a witness, custody documentation should already be running so nothing is unaccounted for',
    'Volatile evidence acquisition before stable evidence acquisition: stable evidence (disks, documents) isn’t going anywhere; volatile evidence (memory, sessions) is actively at risk the whole time you’re doing something else first',
  ],
  commonErrors: refNote('Correct order: (1) Confirm scene security and authority to be there, (2) Establish a photographic baseline, (3) Identify volatile evidence at risk and decide capture order, (4) Begin chain-of-custody documentation, (5) Conduct witness triage, (6) Acquire volatile evidence, (7) Acquire stable evidence, (8) Communicate to your squad. Squad communication being listed last does NOT mean it happens last — it is continuous throughout, running in parallel with all seven other steps.'),
});

PROMPTS.push({
  points: 10,
  text: `**PART 3c — The witness conflict**\n\nThe office manager and the IT contractor disagree about whether the server room was locked overnight. How do you document this in your notes, and what do you specifically avoid doing?`,
  keyElements: [
    'Documents both accounts separately, attributed by name, with the time each statement was given',
    'Does not decide on scene who is right, and does not omit either account because it conflicts with the other',
    'Notes a physical way to check (access log, camera footage) as a follow-up action — the on-scene documentation records the conflict, it doesn’t resolve it',
  ],
});

PROMPTS.push({
  points: 8,
  text: `**SQUAD SYNTHESIS**\n\nWhich part of this exercise did your squad disagree about internally, and how did you resolve it?`,
  keyElements: [
    'Names a specific part of the exercise, not the workshop generally',
    'Describes a genuine resolution process, not just "we agreed"',
  ],
});

PROMPTS.push({
  points: 8,
  text: `**SQUAD SYNTHESIS**\n\nIf you had to defend your timeline's gap (Part 2) to a defense attorney who says you're hiding something, what would you say?`,
  keyElements: [
    'Explains the gap is a real absence of logged evidence, not something withheld',
    'Distinguishes "no evidence of activity in this window" from "no activity occurred" — the timeline records what the evidence shows, not more',
  ],
});

// The Part 3b sequencing exercise itself, as an auto-graded matching game —
// each scene-checklist action (as reworded/scrambled in the student packet)
// mapped to its correct step number.
const SEQUENCING_ACTIONS = [
  { text: 'Acquire stable evidence — disk imaging, documents, physical media', step: 7 },
  { text: 'Establish a photographic baseline of the scene before anything is moved', step: 2 },
  { text: 'Communicate to your squad — periodic check-ins', step: 8 },
  { text: 'Confirm scene security and authority to be there', step: 1 },
  { text: 'Acquire volatile evidence — memory, active sessions, anything that disappears at power-down', step: 6 },
  { text: 'Begin chain-of-custody documentation, starting with the first item', step: 4 },
  { text: 'Conduct any required witness interaction — a brief triage, not a full interview', step: 5 },
  { text: 'Identify volatile evidence at risk and decide capture order', step: 3 },
];

function buildSequencingQuestion() {
  const sources = SEQUENCING_ACTIONS.map((a, i) => ({ id: `src_${i + 1}`, text: a.text }));
  const targets = Array.from({ length: 8 }, (_, i) => ({ id: `tgt_${i + 1}`, text: `Step ${i + 1}` }));
  const matches = SEQUENCING_ACTIONS.map((a, i) => ({ sourceId: `src_${i + 1}`, targetId: `tgt_${a.step}` }));
  return {
    id: uuidv4(),
    stem: 'Renumber the eight scene-checklist actions into the correct sequence — match each action to its step number.',
    payload: { kind: 'drag_match', shuffle: true, sources, targets, matches },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct sequence.',
      incorrect: 'Review the scene-management checklist order again.',
      reference: 'Confirm security → photographic baseline → identify volatile evidence at risk → chain of custody → witness triage → acquire volatile evidence → acquire stable evidence → squad communication (continuous throughout, not a final step).',
    },
  };
}

function buildQuestions() {
  const prompts = PROMPTS.map((p) => ({
    id: uuidv4(),
    kind: 'prompt',
    points: p.points,
    text: p.text,
    rubric: { keyElements: p.keyElements, ...(p.commonErrors ? { commonErrors: p.commonErrors } : {}) },
  }));
  // The sequencing check belongs right after its own "justify the
  // transitions" prompt reads oddly out of order, so insert it just before
  // that prompt (index of the "Justify the sequencing" prompt in PROMPTS).
  const justifyIndex = PROMPTS.findIndex((p) => p.text.includes('Justify the sequencing'));
  prompts.splice(justifyIndex, 0, buildSequencingQuestion());
  return prompts;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const seq = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false,
  });

  try {
    await seq.authenticate();
    await seq.transaction(async (transaction) => {
      const [existing] = await seq.query(
        `SELECT id FROM assignments WHERE course_id = :courseId AND title = :title`,
        { replacements: { courseId: COURSE_ID, title: TITLE }, transaction },
      );
      if (existing.length > 0) {
        const id = existing[0].id;
        const [[{ count: subCount }]] = await seq.query('SELECT count(*)::int AS count FROM submissions WHERE assignment_id = :id', { replacements: { id }, transaction });
        const [[{ count: gradeCount }]] = await seq.query('SELECT count(*)::int AS count FROM grades WHERE assignment_id = :id', { replacements: { id }, transaction });
        if (subCount > 0 || gradeCount > 0) {
          throw new Error(`Refusing to replace "${TITLE}" (id=${id}) — it already has ${subCount} submission(s)/${gradeCount} grade(s). Reseed manually if you're sure.`);
        }
        await seq.query('DELETE FROM assignments WHERE id = :id', { replacements: { id }, transaction });
        console.log(`Deleted prior untouched row (id=${id}) before reseeding.`);
      }

      const questions = buildQuestions();
      const totalPoints = questions.reduce((sum, q) => sum + (q.kind === 'prompt' ? q.points : q.scoring.points), 0);

      await seq.query(
        `INSERT INTO assignments
           (id, course_id, title, description, launch_briefing, max_score, order_index,
            is_published, type, grading_mode, scenario_name, drop_number, questions, role_filters,
            created_at, updated_at)
         VALUES
           (:id, :courseId, :title, :description, :launchBriefing, :maxScore, 10,
            false, 'challenge', 'squad', NULL, NULL, :questions, ARRAY[]::text[],
            NOW(), NOW())`,
        {
          replacements: {
            id: uuidv4(),
            courseId: COURSE_ID,
            title: TITLE,
            description: DESCRIPTION,
            launchBriefing: CASE_NARRATIVE,
            maxScore: totalPoints,
            questions: JSON.stringify(questions),
          },
          transaction,
        },
      );

      console.log(`Seeded unpublished: "${TITLE}" (${questions.length} items, ${totalPoints} pts, order_index 10)`);
    });
  } finally {
    await seq.close();
  }
}

module.exports = { COURSE_ID, TITLE, buildQuestions };

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
