'use strict';
/**
 * Definitions for PACKET HEIST v2 Drop 4's role assessments: 7 individual
 * role assessments plus 1 cohort-wide Squad Synthesis Quiz — transcribed
 * from "PACT Challenges"/PACT_Day4_Role_Assignments_Student.docx and its
 * _InstructorKey.docx counterpart.
 *
 * Cohort-wide, same shape as day3RoleSpecs.js: Drop 4's evidence (the two
 * seized-device extractions, the client-access matrix, the CoinBridge KYC
 * return) is one shared case file every squad works, not per-victim. See
 * day3RoleSpecs.js's header comment for the full rationale.
 *
 * Role codes/labels/roleFilters are identical to Day 1/2/3's
 * (SA/IA/DA/FoA/SOS/TFO/CS) — reused verbatim so role_filters continue to
 * match backend/src/config/constants.js's PROFESSIONAL_ROLES.
 *
 * Run: node backend/scripts/seed-pact-day4-role-assignments.js
 */
const { v4: uuidv4 } = require('uuid');

const SCENARIO = 'packet-heist-v2';
const DROP = 4;
const TITLE_PREFIX = 'PACKET HEIST v2 — Drop 4:';

const MC_POINTS = 10;
const BLANK_POINTS = 10;
const PROMPT_POINTS = 30;

function mc(stem, options, correctIndex, reference) {
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
    scoring: { points: MC_POINTS, mustPass: false },
    feedback: {
      correct: 'Correct.',
      incorrect: `Review ${reference} again.`,
      reference,
    },
  };
}

function blank(stem, accepted, reference) {
  return {
    id: uuidv4(),
    stem,
    payload: { kind: 'fill_blank', blanks: [{ accepted, caseSensitive: false }] },
    scoring: { points: BLANK_POINTS, mustPass: false },
    feedback: {
      correct: 'Correct.',
      incorrect: `Review ${reference} again.`,
      reference,
    },
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

const ROLES = [
  {
    code: 'SA', label: 'Special Agent', roleFilter: 'special_agent',
    task: `Own the final attribution memo and charging outline.`,
    mc: [
      mc('What forensic item on Reston\'s personal laptop matches the BRKR_AL public key from the marketplace profile?', ['A browser cookie', 'A recovered PGP private key', 'A saved password', 'A deleted email'], 1, 'the residence laptop extraction report'),
      mc('What does the client_access_matrix.csv show about the four original victims\' status?', ['Dormant, never used', 'SOLD, referencing sale ref BH-0314', 'Deleted', 'Transferred to another vendor'], 1, 'the client access matrix'),
      mc('What single file is described as "the centerpiece" of Thursday\'s evidence?', ['The seized evidence inventory', 'The client_access_matrix.csv', 'The PGP keyring export', 'The CoinBridge KYC return'], 1, 'today\'s Command Post'),
    ],
    blanks: [
      blank('The PGP private key recovered from Reston\'s laptop carries the UID "brkr_al <______>".', ['amr.secure@protonrelay.example'], 'the PGP keyring export'),
      blank('Your attribution memo must state a ______ level, not just a conclusion.', ['confidence'], 'today\'s Command Post'),
    ],
    shortAnswer: prompt('State your attribution conclusion and confidence level, citing the single strongest artifact.', ['States a clear attribution conclusion and confidence level', 'Cites the PGP key match as the forensic identity tie, or the client_access_matrix.csv as the subject\'s own record of the offense']),
  },
  {
    code: 'IA', label: 'Intelligence Analyst', roleFilter: 'intelligence_analyst',
    task: `Synthesize the forensic identity tie and frame the attribution's confidence level appropriately for intelligence versus legal products.`,
    mc: [
      mc('Where should confidence-level language (e.g., "high confidence") appear?', ['In the charging document', 'In intelligence products, not in the charging document, which sticks to facts', 'Nowhere — confidence should never be stated', 'Only in casual conversation'], 1, 'today\'s Command Post'),
      mc('What does Reston\'s browser history show about the "d.kort92" identity?', ['It appears frequently, confirming Reston is the buyer', 'It does NOT appear — consistent with Reston being the seller (BRKR_AL), not the buyer (BRKR_RU)', 'It appears once', 'It\'s inconclusive'], 1, 'the residence browser artifacts'),
      mc('What identity tie connects the residence laptop directly to the Black Harbor seller profile?', ['The wallet export alone', 'The PGP private key matching the BRKR_AL public key on the marketplace profile', 'The browser history alone', 'The personal financial records'], 1, 'the residence laptop extraction report'),
    ],
    blanks: [
      blank('The forensic identity tie is strong because the recovered key is a ______ key, not just a public one.', ['private'], 'the PGP keyring export'),
      blank('Reston\'s own client-access matrix documents a ______ lifecycle: provisioned, dormant, listed, sold.', ['four-phase'], 'the client access matrix'),
    ],
    shortAnswer: prompt('Write one sentence, suitable for an intelligence product, stating your attribution confidence and why it does not belong verbatim in the charging document.', ['Shows understanding that intelligence confidence language is analytic framing', 'The charging document should state only what the evidence directly establishes']),
  },
  {
    code: 'DA', label: 'Data Analyst', roleFilter: 'operational_support_da',
    task: `Quantify the proceeds trail using the CoinBridge KYC return and the client-access matrix's sale reference.`,
    mc: [
      mc('What sale reference appears in the client-access matrix for the four sold victims?', ['BH-0102', 'BH-0314', 'CB-4471', 'VS-88213'], 1, 'the client access matrix'),
      mc('What two accounts received withdrawals from wallet w3 per the CoinBridge KYC return?', ['Two unrelated third-party accounts', 'RestonIT\'s operating account and Alex Reston\'s personal account', 'Only a business account', 'Only Sam Smith\'s account'], 1, 'the CoinBridge KYC return'),
      mc('What do Reston\'s personal financial records show relative to his stated income?', ['Spending well below income', 'Spending materially exceeding legitimate MSP income', 'No personal spending recorded', 'Personal and business income are identical'], 1, 'the residence personal financials'),
    ],
    blanks: [
      blank('The sale reference BH-0314 links the client-access matrix to the escrow transaction captured in ______ (name the Wednesday artifact).', ['the Black Harbor transaction messages', 'Black Harbor transaction messages'], 'the Black Harbor transaction messages'),
    ],
    dualBlankPrompt: prompt('RestonIT\'s operating account ending in ___ and Reston\'s personal account ending in ___ both received CoinBridge withdrawals. State both.', ['Operating account ending in 7734', 'Personal account ending in 2091'], BLANK_POINTS),
    shortAnswer: prompt('Quantify, in one or two sentences, the complete proceeds trail from sale to personal bank account.', ['Traces: sale referenced in the client-access matrix (BH-0314) → escrow captured in Wednesday\'s marketplace messages → wallet w3 → CoinBridge → RestonIT operating and Reston\'s personal accounts']),
  },
  {
    code: 'FoA', label: 'Forensic Accountant', roleFilter: 'forensic_accountant',
    task: `Close the personal-finance discrepancy question left open Wednesday.`,
    mc: [
      mc('What does today\'s personal financial return finally confirm, that Wednesday\'s business return could not?', ['That RestonIT is profitable', 'That Reston\'s personal spending, not just business activity, exceeds legitimate income, with CoinBridge inflows', 'That Reston has no personal accounts', 'That the business account is unrelated to the personal one'], 1, 'the residence personal financials'),
      mc('What connects the personal financial records to the exchange-return evidence?', ['Nothing directly', 'Both show CoinBridge-linked inflows/withdrawals to the same person', 'They contradict each other', 'They cover different individuals'], 1, 'the residence personal financials and the CoinBridge KYC return'),
      mc('What is the correct way to characterize this financial evidence in your memo?', ['As independent proof of guilt on its own', 'As a lifestyle/discrepancy indicator that corroborates, but doesn\'t independently prove, the broader case', 'As irrelevant to attribution', 'As proof of a separate, unrelated crime'], 1, 'the residence personal financials'),
    ],
    blanks: [
      blank('Reston\'s personal account shows inflows from ______, the same exchange named in the KYC return.', ['CoinBridge'], 'the residence personal financials'),
      blank('Today\'s return closes the proceeds trail that Wednesday\'s business banking return could only partially show, because Wednesday\'s return covered only the ______ account.', ['business'], 'the residence personal financials'),
    ],
    shortAnswer: prompt('Summarize the complete financial picture of this case in three sentences or fewer, from legitimate MSP income through to personal proceeds.', ['Covers legitimate MSP revenue', 'Business-account crypto deposits and outsized draws (Wednesday)', 'Personal-account spending/inflows exceeding income (Thursday) — one coherent financial narrative']),
  },
  {
    code: 'SOS', label: 'Staff Operations/Tactical Specialist', roleFilter: 'operational_support_sos',
    task: `Once a live, unresolved exposure is identified in today's extraction, coordinate the victim-notification action — this cannot wait for the attribution memo to finish.`,
    mc: [
      mc('What should happen the moment a previously-unknown, still-active client access is confirmed during today\'s review?', ['Note it for Friday\'s moot court', 'Initiate a same-day notification action immediately', 'Wait until the attribution memo is complete', 'Refer it to the victim\'s insurance company only'], 1, 'today\'s Command Post'),
      mc('What is SOS\'s role once such a discovery is confirmed?', ['Perform the technical extraction personally', 'Coordinate the notification action operationally — who is contacted, how, and by when', 'Draft the charging outline', 'Interview the subject'], 1, 'today\'s Command Post'),
      mc('Why can\'t this action be deferred to prioritize the attribution memo?', ['It can be deferred — attribution is always the priority', 'An active, exploitable exposure is an ongoing-harm situation that takes precedence over case-building tasks', 'Policy requires all notifications to wait for Friday', 'There\'s no urgency once a subject is in custody'], 1, 'today\'s Command Post'),
    ],
    blanks: [
      blank('A live, unresolved exposure found today should be treated with the same urgency as a ______.', ['new victim report'], 'today\'s Command Post'),
      blank('Your notification memo should be produced ______ upon confirming the exposure, not at end of day.', ['immediately'], 'today\'s Command Post'),
    ],
    shortAnswer: prompt('Draft the opening two sentences of your notification action memo once such an exposure is confirmed today.', ['Identifies the affected client', 'States the nature of the live exposure', 'Urges immediate remediation (disabling the account) — credit even if the student needed CS\'s finding to know the client\'s name']),
  },
  {
    code: 'TFO', label: 'Task Force Officer', roleFilter: 'task_force_officer',
    task: `Reconcile the seized-evidence inventory against Wednesday's on-scene custody documentation before anything is used in analysis.`,
    mc: [
      mc('What must happen before any seized item is used in today\'s analysis?', ['Nothing — seizure alone is sufficient', 'It must be cross-checked against on-scene custody documentation for any gap', 'It must be re-photographed', 'It must be re-seized'], 1, 'the seized evidence inventory'),
      mc('What two scenes does the seizure inventory cover?', ['Two client sites', 'RestonIT\'s office and Alex Reston\'s residence', 'Only the residence', 'Only the office'], 1, 'the seized evidence inventory'),
      mc('If you find a custody gap on an item, what should you do?', ['Ignore it if the item seems important', 'Flag it before it\'s used in any analysis', 'Quietly correct the paperwork', 'Discard the item entirely without documentation'], 1, 'the seized evidence inventory'),
    ],
    blanks: [
      blank('The evidence photo log documents physical items ______ in place before collection, each tied to an evidence number.', ['photographed'], 'the office photo log'),
      blank('Sam Smith\'s service-ticket log attributes the provisioning visits to technician code "______," distinct from Sam\'s own, unrelated visits.', ['AR'], 'Sam Smith\'s service tickets'),
    ],
    shortAnswer: prompt('Describe your custody-reconciliation process for today and what you would do if you found a gap between the seizure inventory and the on-scene forms.', ['Describes a systematic, item-by-item cross-check', 'Escalating any discrepancy to the Command Post/case agent before that item is relied on in analysis']),
  },
  {
    code: 'CS', label: 'Computer Scientist', roleFilter: 'cyber_analyst',
    task: `Complete the technical extraction review of both seized devices, and build the full client/system inventory that surfaces any previously-unaccounted-for exposure.`,
    mc: [
      mc('What is recovered from Reston\'s residence laptop, per the examiner summary?', ['Nothing of evidentiary value', 'A PGP keyring, Tor browser artifacts, a cryptocurrency wallet, and Black Harbor session remnants', 'Only browser history', 'Only financial records'], 1, 'the residence laptop extraction report'),
      mc('What does the client_access_matrix.csv track for each client?', ['Only billing information', 'Provisioned date, technician, permissions, and status (dormant/listed/sold)', 'Only phone numbers', 'Employee schedules'], 1, 'the client access matrix'),
      mc('What should you do with every client or system name you find anywhere in the seized data?', ['Ignore anything not already named in Packets 1–3', 'Cross-check it against every client/system named in Packets 1–3 and flag anything new', 'Only check the four known victims', 'Report only if it\'s a large company'], 1, 'today\'s evidence'),
    ],
    blanks: [
      blank('The office-machine extraction recovers a full client folder index, listing roughly ______ total clients.', ['eleven', '~11', '11'], 'the RestonIT client index'),
      blank('Any client folder appearing in today\'s extraction that never appeared in Packets 1 through 3 should be treated as a possible live, unresolved ______.', ['exposure'], 'today\'s evidence'),
    ],
    shortAnswer: prompt('You\'ve now built a complete client inventory from the seized data. Is there any client here that never appeared anywhere in Packets 1–3? If so, name it, describe what its folder contains, and state what you\'d do next.', ['Names SaturnV Mart from a genuine full cross-check', 'Describes the still-live/unused provisioned account (svc_inventory) found in its folder notes', 'States that SOS should be notified immediately to coordinate same-day notification — partial credit if the methodology was sound but needed a nudge to find it']),
  },
];

// SA's task explicitly says "own the final attribution memo AND charging
// outline," and IA's own question tests the distinction between the two
// ("confidence language belongs in intelligence products, not the charging
// document, which sticks to facts") — but nothing anywhere in this drop ever
// showed a squad what a charging outline actually looks like. This is a
// STRUCTURAL/FORMAT reference only, not a worked example for this case: a
// filled-in outline would hand SA the answer to their own graded prompt
// ("state your attribution conclusion..."), and naming a specific U.S. Code
// section would assert a legal conclusion this training exercise never
// establishes elsewhere. Shown on every role's launch screen (not just SA's)
// since IA, TFO, and SOS all reason about what does/doesn't belong in one.
const CHARGING_OUTLINE_REFERENCE = `**Charging Outline — Reference Format**

A charging outline is a different document from your attribution memo. The attribution memo states your conclusion and a confidence level. The charging outline states only what the evidence directly establishes, element by element — no confidence language, no "we believe."

A charging outline typically includes:

1. **Subject.** The individual(s) it addresses, by full legal name — not by alias/handle alone.
2. **Proposed offense(s).** The conduct the facts appear to support, in plain terms (e.g. "unauthorized computer access and sale of access," "wire fraud," "money laundering"). You are not expected to cite a specific U.S. Code section today.
3. **Elements of the offense.** Each legal element the government would need to prove, listed separately — not folded into one paragraph.
4. **Evidence supporting each element.** Under each element, the specific artifact(s) that support it — e.g. "Element: unauthorized access — Evidence: client_access_matrix.csv, PGP keyring export." An element with nothing listed under it is a gap to flag, not to paper over.
5. **Venue.** Why this case belongs in this district — where the conduct, the victim, or the subject is located.
6. **Anticipated weaknesses.** Gaps, alternative explanations, or custody issues the defense would raise — stated honestly, not minimized.

Nothing in a charging outline should read like the attribution memo's "high confidence" language — it states what the evidence shows, full stop.`;

const SQUAD_QUIZ = [
  mc('What forensic item conclusively ties Reston\'s residence laptop to the BRKR_AL marketplace identity?', ['Browser history alone', 'A recovered PGP private key matching the BRKR_AL public key', 'The personal financial records', 'The evidence photo log'], 1, 'the residence laptop extraction report'),
  mc('What does the client_access_matrix.csv reveal about SaturnV Mart?', ['It was sold under reference BH-0314', 'It is listed but unsold, with a still-live provisioned account', 'It never appears in the matrix', 'It was the first client ever provisioned'], 1, 'the client access matrix'),
  mc('What is the correct sequence of the proceeds trail?', ['CoinBridge → wallet w3 → sale → personal account', 'Sale (BH-0314) → escrow → wallet w3 → CoinBridge → RestonIT/personal accounts', 'Personal account → wallet w3 → sale', 'There is no traceable sequence'], 1, 'the CoinBridge KYC return'),
  mc('What should your squad do about SaturnV Mart\'s live access, relative to finishing the attribution memo?', ['Finish the memo first', 'Initiate the notification action immediately, in parallel with finishing the memo', 'Wait for Friday', 'Refer it to another squad'], 1, 'today\'s evidence'),
  mc('What is required before any seized item is used in today\'s charging-outline analysis?', ['Nothing', 'Custody reconciliation against Wednesday\'s on-scene forms', 'A second search warrant', 'A judge\'s pre-approval of each item'], 1, 'the seized evidence inventory'),
];

function buildRoleQuestions(role) {
  const items = [...role.mc, ...role.blanks];
  if (role.dualBlankPrompt) items.push(role.dualBlankPrompt);
  items.push(role.shortAnswer);
  return items;
}

// One spec per assignment to create, in insertion order. grading_mode alone
// decides who a submission/grade belongs to: role assessments are
// individual, the squad quiz is squad. Cohort-wide (victimName: null) — see
// day3RoleSpecs.js's header comment for why Drop 4 differs from Day 1/Day
// 2's per-victim shape.
function buildAssignmentSpecs() {
  const specs = [];
  for (const role of ROLES) {
    specs.push({
      kind: 'role',
      title: `${TITLE_PREFIX} "The Case" — ${role.code} (${role.label})`,
      description: `${role.label} individual assessment for Day 4 ("The Case"): ${role.task}`,
      victimName: null,
      roleFilters: [role.roleFilter],
      gradingMode: 'individual',
      launchBriefing: CHARGING_OUTLINE_REFERENCE,
      questions: buildRoleQuestions(role),
    });
  }
  specs.push({
    kind: 'squad_quiz',
    title: `${TITLE_PREFIX} "The Case" — Squad Synthesis Quiz`,
    description: `Squad Synthesis Quiz for Day 4 — complete together, as a squad, after every role has finished its individual assessment.`,
    victimName: null,
    roleFilters: [],
    gradingMode: 'squad',
    launchBriefing: CHARGING_OUTLINE_REFERENCE,
    questions: SQUAD_QUIZ,
  });
  return specs;
}

module.exports = { SCENARIO, DROP, TITLE_PREFIX, ROLES, SQUAD_QUIZ, CHARGING_OUTLINE_REFERENCE, buildRoleQuestions, buildAssignmentSpecs };
