'use strict';
/**
 * Definitions for "The Investigator's Toolbox — Quiz Module" — a standalone
 * individual assessment for Day 4, Lecture 2, transcribed from "PACT
 * Challenges"/Investigator_Toolbox_Quiz_Module_Student.docx and its
 * _InstructorKey.docx counterpart.
 *
 * Seeded as a NEW, separate assignment rather than replacing the pre-existing
 * "Day 4 Lecture 2" module (a 12-item auto-graded quiz on the same lecture
 * topic) — that module already had 30 submissions/29 grades live when this
 * was authored, so overwriting it would have invalidated real student work.
 * User's explicit call (asked directly, given the conflict): add alongside
 * it, not replace it. See seed-pact-day4-toolbox-quiz.js.
 *
 * Same mc/blank/prompt helper shape as day3RoleSpecs.js/day4RoleSpecs.js —
 * cohort-wide, not role- or victim-scoped, so role_filters/victim_name both
 * stay empty. type:'challenge' (not 'module', unlike the existing Day 4
 * Lecture quizzes) because each topic ends in a free-text short-answer item
 * needing manual grading — AssignmentPage.jsx routes a challenge with any
 * kind:'prompt' question to ChallengeFlow, which is what auto-graded-only
 * 'module' quizzes can't render.
 *
 * grading_mode:'squad' per explicit instruction — overrides the source
 * packet's own "Complete individually" framing, so DESCRIPTION below is
 * reworded to match rather than telling a squad to work solo while grading
 * them as one unit. This shape (squad-graded, payload checks mixed with
 * free-text prompts, rendered via ChallengeFlow's shared/live-sync path) is
 * already proven elsewhere in this course — e.g. day4CryptocurrencyWorkshopSpec.js.
 *
 * The instructor key flags four MC items [MUST-PASS] as the lesson plan's
 * core must-pass concepts — mapped to scoring.mustPass:true, an already-
 * wired feature (QuizFlow/AssignmentPage show a "Must Pass" badge and call
 * out any missed must-pass items on the results screen), not new plumbing.
 *
 * Run: node backend/scripts/seed-pact-day4-toolbox-quiz.js
 */
const { v4: uuidv4 } = require('uuid');

const TITLE = "The Investigator's Toolbox — Quiz Module";
const DESCRIPTION = 'Squad assessment for Day 4, Lecture 2 — investigative tooling, tool-selection discipline, and provenance discipline. Complete together as a squad; short-answer items expect a few sentences, not a single word.';

const MC_POINTS = 10;
const BLANK_POINTS = 10;
const PROMPT_POINTS = 30;

function mc(stem, options, correctIndex, reference, mustPass = false) {
  const optionIds = ['a', 'b', 'c', 'd'];
  return {
    id: uuidv4(),
    stem,
    payload: {
      kind: 'multiple_choice',
      selectionMode: 'single',
      shuffle: true,
      options: options.map((text, i) => ({ id: optionIds[i], text })),
      correct: [optionIds[correctIndex]],
    },
    scoring: { points: MC_POINTS, mustPass },
    feedback: { correct: 'Correct.', incorrect: `Review ${reference} again.`, reference },
  };
}

function blank(stem, accepted, reference) {
  return {
    id: uuidv4(),
    stem,
    payload: { kind: 'fill_blank', blanks: [{ accepted, caseSensitive: false }] },
    scoring: { points: BLANK_POINTS, mustPass: false },
    feedback: { correct: 'Correct.', incorrect: `Review ${reference} again.`, reference },
  };
}

function prompt(text, keyElements, points = PROMPT_POINTS) {
  return {
    id: uuidv4(),
    kind: 'prompt',
    points,
    text,
    rubric: { keyElements },
  };
}

/* ── Topic 1 — Investigative Tooling (Sections 6.2–6.4) ─────────────────── */
const TOPIC1 = [
  mc('What kind of question does OSINT typically answer well?', ['The real-time current state of an IP address', 'Infrastructure, identity, and historical activity drawn from public sources', 'The content of encrypted communications', 'Chain of custody for a finding'], 1, 'Section 6.2'),
  mc('Which is an example of a passive DNS / domain-history tooling category?', ['Shodan or Censys', 'DomainTools or PassiveTotal', 'Volatility', 'Wireshark'], 1, 'Section 6.2'),
  mc('What is the specific risk of submitting a file from an active case to free-tier VirusTotal?', ['There is no risk — submissions are always private', 'The submission may be publicly searchable, potentially tipping the actor that the case exists', 'It automatically notifies foreign law enforcement partners', 'It violates TLP:WHITE marking rules'], 1, 'Section 6.3'),
  blank("A TI vendor's confidence that a hash belongs to a given actor group is their ______ ______, not ground truth.", ['analytic judgment'], 'Section 6.3'),
  blank('Information marked TLP:______ can generally be shared within your organization on a need-to-know basis, but not shared further without escalating to the originator.', ['AMBER'], 'Section 6.3'),
  prompt(
    'Name the three forensics sub-categories from Section 6.4, and one representative tool for each.',
    [
      'Host forensics — e.g. EnCase, FTK, Magnet AXIOM, X-Ways, or Autopsy/Sleuth Kit',
      'Memory forensics — Volatility (the open-source standard)',
      'Network forensics — e.g. Wireshark, Zeek, or Arkime/Moloch',
    ],
  ),
];

/* ── Topic 2 — Tool Selection Discipline (Section 6.6) ───────────────────── */
const TOPIC2 = [
  mc('What determines the right tool to use for an investigative question?', ['Personal preference or familiarity with a tool', 'The specific question being asked', 'Whichever tool is cheapest', 'Whichever tool is newest'], 1, 'Section 6.6', true),
  mc("In the lecture's worked example, which tool category would you use to find what infrastructure an actor has used over time?", ['Host forensics on the compromised system', 'Passive DNS, internet-wide scanning data, and registrant correlation', 'Sample analysis services', 'ATT&CK Navigator alone'], 1, 'Section 6.6'),
  mc('When should a consequential decision (charging, public attribution, defensive notification) rest on a tool-derived finding?', ['As soon as any single tool reports it', 'Only after cross-tool validation', "Never — tool output shouldn't inform such decisions", 'Only if the tool uses AI'], 1, 'Section 6.6', true),
  blank('A cross-tool ______ finding requires figuring out which tool is right and why, before relying on it.', ['inconsistent'], 'Section 6.6'),
  prompt(
    'In the worked example, what tool category would you use to find what known actor groups share TTPs with the actor in question — and why that category specifically, not a different one?',
    [
      'Names commercial TIPs, ATT&CK Navigator, and/or public TI feeds',
      'Explains why: this question is specifically about known-actor/TTP correlation, which TI platforms and ATT&CK tooling are built to answer — not, e.g., a host-forensics or passive-DNS question',
    ],
  ),
];

/* ── Topic 3 — Provenance Discipline (Section 6.7) ───────────────────────── */
const TOPIC3 = [
  mc('Per this lecture, when does tool output become evidence?', ['The moment the tool produces it', 'When its provenance is documented well enough to support evidentiary use', 'Only after a supervisor verbally approves it', 'Tool output is never usable as evidence'], 1, 'Section 6.7', true),
  blank('The provenance checklist includes tool name and version, the query/command/input, date and time, output captured in a documented format, a hash of the output, and documentation of how the output was ______.', ['preserved'], 'Section 6.7'),
  mc('What is the correct characterization of AI-assisted tool output, per this lecture?', ['A conclusion ready to brief as-is', 'A lead, requiring human analytic judgment before it\'s used', 'Inadmissible under all circumstances', 'Equivalent to a certified forensic finding'], 1, 'Section 6.7', true),
  mc('What should you capture instead of a screenshot of tool output, for provenance purposes?', ['Nothing else is needed beyond a screenshot', 'An export from the tool, or a forensically sound capture of the output', 'A verbal description in your notes', 'A phone photo of the screen'], 1, 'Section 6.7'),
  blank('For AI-assisted tools specifically, provenance should also include the model, the version, and the ______ used to generate the output.', ['prompt'], 'Section 6.7'),
  prompt(
    'At trial, what will opposing counsel ask about a tool-derived finding (name at least three specific questions from Slide 20), and why does provenance documentation answer them?',
    [
      'Names at least three of: which tool, what version, what query, when it was run, how the output was preserved',
      'Explains that documenting these up front means the finding stands cleanly under cross-examination; without them, the finding is weakened',
    ],
  ),
];

function buildQuestions() {
  return [...TOPIC1, ...TOPIC2, ...TOPIC3];
}

module.exports = { TITLE, DESCRIPTION, TOPIC1, TOPIC2, TOPIC3, buildQuestions };
