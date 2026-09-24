'use strict';
/**
 * Day 3 PM range practical — squad-lead performance rubric, transcribed from
 * "PACT Challenges"/range_observer_briefing.docx Section 3 (the 13-criterion
 * rubric range observers score live during the paired residence/business
 * operation).
 *
 * The briefing repeatedly points to a separate day3_squad_lead_rubric.docx
 * for the full point/weighting table, but that file doesn't exist in the
 * PACT Challenges folder — only this briefing's own summary does. Per Cody's
 * explicit choice, this spec uses exactly what the briefing states (13
 * criteria, each scored 0-3, with the three weights it names — #6 and #7 at
 * x1.5, #9 at x1.3, everything else at x1.0) rather than inventing numbers
 * to force the briefing's own unreconciled "84 weighted points" claim. The
 * real weighted maximum from this spec's own math is 42.9 (13 x 3 = 39 base,
 * scaled by the stated per-criterion weights) — see the max_score assertion
 * in the test file.
 *
 * This assignment is never seen or submitted by students — see
 * seed-pact-day3-range-observer-rubric.js for why it's seeded unpublished
 * with a placeholder Submission per squad, purely so a range observer or
 * instructor can score it through the Grade Center's squad-grading UI
 * (RangeObserverRubricGrading in AdminPage.jsx) after the operation.
 */

const TITLE = 'Day 3 PM Range Practical: Squad-Lead Performance Rubric';

const LAUNCH_BRIEFING = 'Instructor/observer-only scoring tool for the Day 3 PM paired residence/business operation — students never see this item.';

const DESCRIPTION = [
  'Squad-lead performance rubric for the Day 3 PM paired operation (Reston residence / RestonIT business venues), scored',
  'by the range observer(s) after the exercise from their real-time notes — see range_observer_briefing.docx Section 3.',
  'Each of the 13 criteria is scored 0-3 (0 = absent/counterproductive, 1 = present but underdeveloped, 2 = solid,',
  '3 = strong); three criteria carry extra weight (Real-time decision-making and Cross-venue coordination at x1.5,',
  'Adaptive scope reasoning at x1.3) reflecting their outsized operational importance. Maximum weighted score: 42.9.',
].join(' ');

// Section 3.2's four score bands — identical description set applies to
// every criterion, so it's factored out once rather than repeated 13x.
const BANDS = [
  { score: 0, label: 'Absent or counterproductive', description: 'Squad did not address this criterion, or addressed it in a way that worked against them' },
  { score: 1, label: 'Present but underdeveloped', description: 'Squad touched the criterion but did not develop it substantively' },
  { score: 2, label: 'Solid', description: 'Squad addressed the criterion competently — meets the standard for a capable practitioner' },
  { score: 3, label: 'Strong', description: 'Squad addressed the criterion at a level that distinguishes their work' },
];

// Section 3.1 (criteria + "what strong performance looks like") and Section
// 3.3 (weights: #6/#7 x1.5, #9 x1.3, everything else x1.0).
const CRITERIA = [
  { number: 1, title: 'Initial scope establishment', description: "Squad lead opens the operation with clear scope articulation: what we're doing, what's in scope, what's out of scope, success criteria for the operation", weight: 1.0 },
  { number: 2, title: 'Role delegation', description: 'Squad lead assigns specific squad members to specific functions (evidence, witness, documentation, photography). Squad members know what they’re responsible for', weight: 1.0 },
  { number: 3, title: 'Authority and warrant discipline', description: "Squad lead and squad operate within the authority of their notional warrant. Don't exceed scope; document basis for any scope-relevant decisions", weight: 1.0 },
  { number: 4, title: 'Evidence acquisition discipline', description: 'Evidence is identified, documented, handled, and preserved appropriately. Chain of custody is maintained. Hashes are recorded where applicable', weight: 1.0 },
  { number: 5, title: 'Witness engagement', description: 'Witnesses are engaged professionally — clear introduction, open-ended questions, patience, respect for witness considerations (potential interest in counsel, emotional state)', weight: 1.0 },
  { number: 6, title: 'Real-time decision-making', description: 'When scripted injects surface (Halloran call, sticky note, contradiction), squad lead makes timely decisions and articulates reasoning', weight: 1.5 },
  { number: 7, title: 'Cross-venue coordination', description: "Squad lead actively coordinates with the other venue's squad lead — shares relevant findings in real time, requests information when needed", weight: 1.5 },
  { number: 8, title: 'Document and artifact thoroughness', description: 'Squad reviews routine documents (badge logs, client folders, sticky notes) systematically rather than focusing only on obvious digital artifacts', weight: 1.0 },
  { number: 9, title: 'Adaptive scope reasoning', description: "When new information surfaces (Halloran call about Pinecrest, badge log contradiction), squad lead reasons about whether and how to adapt scope rather than rigidly executing original plan", weight: 1.3 },
  { number: 10, title: 'Squad-internal communication', description: 'Squad lead manages internal squad communication — periodic check-ins, status updates, course corrections without micro-management', weight: 1.0 },
  { number: 11, title: 'OPSEC and tradecraft awareness', description: 'Squad demonstrates awareness of operational security considerations — what could tip the actor, what should not be discussed publicly, how to handle sensitive findings', weight: 1.0 },
  { number: 12, title: 'Closure discipline', description: "Squad lead brings the operation to a clean close — confirms acquisition completeness, exits in coordinated fashion, documents what was and wasn't accomplished", weight: 1.0 },
  { number: 13, title: 'Hot wash preparation', description: 'Squad lead organizes squad-internal recap for the post-operation hot wash. Squad enters hot wash with structured observations rather than disjointed notes', weight: 1.0 },
];

function buildQuestions() {
  return CRITERIA.map((c) => ({
    id:     `criterion-${c.number}`,
    kind:   'rubric_criterion',
    number: c.number,
    title:  c.title,
    text:   c.description,
    weight: c.weight,
    points: Number((3 * c.weight).toFixed(2)),
    bands:  BANDS,
  }));
}

module.exports = { TITLE, LAUNCH_BRIEFING, DESCRIPTION, BANDS, CRITERIA, buildQuestions };
