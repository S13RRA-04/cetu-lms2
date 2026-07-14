'use strict';
/**
 * Seed PACKET HEIST — Drop 3 challenge assignments: Account Lifecycle &
 * RestonIT Nexus. Per-victim like Drop 1 (one quiz + one deliverable set per
 * victim), but each is now grounded in the Drop 3 account-lifecycle artifacts
 * (account creation record, prior login/activity history, support ticket or
 * change record) plus the shared Cross-Squad CP Bulletin revealing RestonIT
 * LLC as the common support provider behind all four compromised accounts,
 * and that victim's own Parallel Investigative Squad Update (the downstream
 * "buyer" actor being investigated by a separate squad).
 *
 * Source: scenarios/PACKET HEIST/Drop 3/<Victim>/Artifact - *.md,
 * scenarios/PACKET HEIST/Drop 3/Cross-Squad CP Bulletin.pdf,
 * scenarios/PACKET HEIST/Drop 3/Parallel Investigative Squad Update/*.md
 *
 * Run: node backend/scripts/seed-packet-heist-drop3.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect:        'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging:        false,
});

const RESTON_CLASSIFICATIONS = [
  'A common support provider with poor account hygiene',
  'A compromised MSP',
  'A negligent access custodian',
  'An intentional upstream source of access',
  'An entity requiring further investigation before classification',
];

/* ─────────────────────────────────────────────────────────────────────────────
   Redstone Memorial Hospital
───────────────────────────────────────────────────────────────────────────── */
const redstoneQuestions = [
  {
    id: uuidv4(),
    stem: 'According to the account creation record, who requested creation of fac-vendor-svc17 and what organization was listed as the requesting/support organization?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Requested by the Facilities Support Project; RestonIT LLC listed as the requesting organization' },
        { id: 'b', text: 'Requested by RMH IT Security; no outside organization involved' },
        { id: 'c', text: 'Requested by a hospital physician for clinical system access' },
        { id: 'd', text: 'Requested anonymously with no department of record' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The account was requested through the Facilities Support Project, with RestonIT LLC listed as the requesting/support organization.',
      incorrect: 'Review the account creation record — the request ties to the Facilities Support Project and names RestonIT LLC as the outside support organization.',
      reference: 'Redstone Memorial — Account Creation Record',
    },
  },
  {
    id: uuidv4(),
    stem: 'Identifying RestonIT LLC as the account’s requesting/support organization establishes that RestonIT conducted the intrusion.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — per the Cross-Squad CP Bulletin, this connects RestonIT to the account’s lifecycle/support history, not to conducting the intrusion itself.',
      incorrect: 'The Bulletin explicitly cautions that this does not establish RestonIT conducted the intrusions — only that RestonIT is tied to the account’s support history.',
      reference: 'Cross-Squad CP Bulletin',
    },
  },
  {
    id: uuidv4(),
    stem: 'What does the prior login history show about fac-vendor-svc17 between the support project closeout and the incident?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Continuous daily approved use through the incident date' },
        { id: 'b', text: 'No approved use was identified between 2026-01-21 (project closeout validation) and the unauthorized login on 2026-04-07' },
        { id: 'c', text: 'The account was deleted and recreated before the incident' },
        { id: 'd', text: 'The account was only ever used once, on the day of the incident' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'RMH IT’s own note confirms no approved use between the January closeout validation and the unauthorized April 7 login — a roughly 2.5-month dormancy gap.',
      incorrect: 'Check the login history dates — the account went dormant after project closeout (Jan 21) until the unauthorized login on April 7.',
      reference: 'Redstone Memorial — Prior Login History',
    },
  },
  {
    id: uuidv4(),
    stem: 'What does the support ticket’s closure status reveal about account review after the facilities project ended?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'The ticket confirms the account was disabled immediately at closeout' },
        { id: 'b', text: 'The ticket closed with status "access review pending" — meaning the promised review never happened before the account was misused' },
        { id: 'c', text: 'The ticket was never closed' },
        { id: 'd', text: 'The ticket shows RMH declined the vendor access request' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The ticket closed "access review pending" — the review that should have disabled or re-validated the account was never confirmed complete.',
      incorrect: 'Check the ticket’s Closure Status field — it explicitly reads "Closed - access review pending," not a completed review.',
      reference: 'Redstone Memorial — Support Ticket',
    },
  },
  {
    id: uuidv4(),
    stem: 'Match each Drop 3 artifact to what it primarily establishes about the fac-vendor-svc17 account.',
    payload: {
      kind: 'drag_match',
      sources: [
        { id: 'creation', text: 'Account Creation Record' },
        { id: 'login',    text: 'Prior Login History' },
        { id: 'ticket',   text: 'Support Ticket' },
        { id: 'parallel', text: 'Parallel Investigative Squad Update' },
      ],
      targets: [
        { id: 'provenance', text: 'Account provenance (who requested/approved it and why)' },
        { id: 'dormancy',   text: 'Dormancy gap before misuse' },
        { id: 'review',     text: 'Failed/incomplete access review' },
        { id: 'downstream', text: 'Downstream actor investigation status' },
      ],
      matches: [
        { sourceId: 'creation', targetId: 'provenance' },
        { sourceId: 'login',    targetId: 'dormancy' },
        { sourceId: 'ticket',   targetId: 'review' },
        { sourceId: 'parallel', targetId: 'downstream' },
      ],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Each artifact serves a distinct investigative purpose — provenance, dormancy, review failure, and downstream-actor status are four separate facts, not interchangeable.',
      incorrect: 'Review what each document actually records — the creation record explains provenance, login history shows the dormancy gap, the ticket shows the review never completed, and the Parallel Squad Update covers the downstream actor.',
      reference: 'Drop 3 artifact set',
    },
  },
  {
    id: uuidv4(),
    stem: 'Per the Parallel Investigative Squad Update, has the identity of the downstream actor who used fac-vendor-svc17 been confirmed?',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — no subscriber identity has been confirmed for source IP 198.51.100.77, and there is no confirmed link to RestonIT at the hands-on-keyboard level.',
      incorrect: 'The update explicitly states no subscriber identity has been confirmed for the downstream actor.',
      reference: 'Parallel Investigative Squad Update — Redstone (Buyer A)',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which squad is investigating the downstream actor (Buyer A) who used fac-vendor-svc17, and is that lead a PACT task force priority?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Hometown Cyber Squad A — relevant to PACT only to the extent it explains how the actor obtained the credential, not as a standalone priority' },
        { id: 'b', text: 'PACT itself is directly investigating Buyer A as its top priority' },
        { id: 'c', text: 'Financial Crimes / Cyber Squad, and it is a top PACT priority regardless of scope' },
        { id: 'd', text: 'No squad has been assigned to this lead' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Hometown Cyber Squad A is handling the downstream actor. Per Command Post Guidance, this stays relevant to PACT only insofar as it helps explain the upstream credential source.',
      incorrect: 'Review the update and Command Post Guidance — downstream-actor investigation belongs to another squad, and only ties back to PACT if it explains the upstream access source.',
      reference: 'Parallel Investigative Squad Update — Redstone (Buyer A); Command Post Guidance',
    },
  },
  {
    id: uuidv4(),
    stem: 'Per the Cross-Squad CP Bulletin, which classifications must squads consider for RestonIT LLC? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'A common support provider with poor account hygiene' },
        { id: 'b', text: 'A compromised MSP' },
        { id: 'c', text: 'An intentional upstream source of access' },
        { id: 'd', text: 'A confirmed nation-state front company' },
        { id: 'e', text: 'An entity requiring further investigation before classification' },
      ],
      correct: ['a', 'b', 'c', 'e'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Command Post lists five possible classifications, including poor hygiene, compromised MSP, negligent custodian, intentional upstream source, and requiring further investigation — "confirmed nation-state front" is not one of them and is unsupported.',
      incorrect: 'Review the Cross-Squad CP Bulletin’s list of five classifications — a nation-state front company is not among them, and nothing in the evidence supports it.',
      reference: 'Cross-Squad CP Bulletin',
    },
  },
  {
    id: uuidv4(),
    stem: 'What is Command Post’s stated next investigative priority regarding RestonIT?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Immediately execute search warrants on RestonIT’s offices' },
        { id: 'b', text: 'Determine who at RestonIT had access to the credentials, how they were stored, whether they were exported or shared, and whether similar access existed for other clients' },
        { id: 'c', text: 'Publicly name RestonIT as the intruder' },
        { id: 'd', text: 'Close all four victim investigations' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The Bulletin directs squads to determine credential access, storage, export/sharing, and whether similar exposure exists for other RestonIT clients — not to take premature enforcement or public-attribution action.',
      incorrect: 'Review the Bulletin’s "Next investigative priority" line directly — it is about credential handling and scope, not enforcement action.',
      reference: 'Cross-Squad CP Bulletin',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which conclusions should the squad AVOID reaching prematurely at Drop 3? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'That RestonIT conducted the intrusion' },
        { id: 'b', text: 'That the downstream actor’s identity is established' },
        { id: 'c', text: 'That fac-vendor-svc17 was created through a RestonIT-associated support project' },
        { id: 'd', text: 'That RestonIT is definitively a compromised MSP rather than merely negligent' },
      ],
      correct: ['a', 'b', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Attributing the intrusion to RestonIT, confirming the downstream actor’s identity, or picking a single RestonIT classification are all premature. The account’s RestonIT-associated origin (option C) IS supportable from the creation record and ticket.',
      incorrect: 'Option C is directly supported by the creation record and support ticket. The others require evidence not yet in hand.',
      reference: 'Redstone Memorial — Drop 3 artifacts',
    },
  },
];

const redstoneDeliverables = [
  {
    kind: 'prompt', points: 20,
    text: 'Account Lifecycle & RestonIT Provenance Summary — Summarize the full lifecycle of fac-vendor-svc17 from creation through the incident: who requested it, what organization was involved, what it was approved for, and how it went from legitimate use to unauthorized use.',
    rubric: {
      keyElements: ['Cites the Facilities Support Project and RestonIT LLC as requesting/support organization', 'States approval details (Karen Holt, RMH Facilities Operations) and stated purpose', 'Traces legitimate use (Jan 18-21) through the dormancy gap to the April 7 unauthorized login', 'Correctly frames RestonIT’s role as support-history provenance, not confirmed intrusion involvement'],
      commonErrors: ['Concluding RestonIT conducted the intrusion', 'Omitting the dormancy gap', 'Missing the approver/requester details'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Access Review Failure Analysis — The support ticket closed "access review pending." Explain what this means operationally, why it matters to the investigation, and what records would confirm whether a review ever occurred.',
    rubric: {
      keyElements: ['Explains that the promised post-project access review was never confirmed complete', 'Connects this gap directly to the account remaining active/exploitable for ~2.5 months', 'Identifies specific follow-up records needed (e.g., account audit logs, RMH IT ticketing system records, any later closeout documentation)'],
      commonErrors: ['Assuming the review happened without evidence', 'Not connecting the review gap to the dormancy window', 'Vague follow-up records request'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Downstream Actor vs. Upstream Source — Using the Parallel Investigative Squad Update, explain the difference between the downstream actor investigation (Hometown Cyber Squad A) and PACT’s own investigative question. What does the update tell you, and what does it explicitly NOT resolve?',
    rubric: {
      keyElements: ['Correctly identifies Hometown Cyber Squad A as handling the downstream/hands-on-keyboard actor', 'States what IS known: source IP 198.51.100.77, enumeration/persistence/C2 behavior, no confirmed subscriber identity', 'States what is NOT resolved: how the actor obtained fac-vendor-svc17 in the first place — PACT’s core question', 'Avoids treating the downstream lead as answering the upstream question'],
      commonErrors: ['Conflating the downstream actor lead with the upstream credential-source question', 'Claiming subscriber identity is confirmed', 'Failing to state the lead’s actual relevance boundary to PACT'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'RestonIT Classification Assessment — Of the five classifications Command Post identified (poor hygiene, compromised MSP, negligent custodian, intentional upstream source, requires further investigation), which best fits current Redstone-specific evidence? Explain your reasoning and what evidence would change your assessment.',
    rubric: {
      keyElements: ['Selects one primary classification (or explicitly "requires further investigation") with reasoning tied to Redstone’s specific facts', 'Explains why the other classifications are less supported at this stage', 'Identifies what specific evidence would move the assessment toward compromised-MSP or intentional-upstream-source', 'Uses appropriately hedged, non-definitive language'],
      commonErrors: ['Declaring a classification as proven fact', 'Not distinguishing negligence from compromise', 'No discussion of what would change the assessment'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Integrated Squad Assessment & RestonIT Lead Requests — State your squad’s current position and recommended next investigative step regarding RestonIT LLC’s role in the Redstone intrusion. List the specific records you would request from or about RestonIT to advance the investigation.',
    rubric: {
      keyElements: ['Concise integrated position consistent with the classification assessment above', 'Concrete RestonIT-directed record requests: who had credential access, credential storage method, whether credentials were shared/exported, other-client exposure', 'Recommends a specific, actionable next step, not a vague "continue investigating"', 'Includes a brief "what we are not claiming yet" note'],
      commonErrors: ['Requesting records unrelated to RestonIT’s credential handling', 'No concrete next step', 'Overstating confidence in the squad’s position'],
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Dogwood Hotel & Resort
───────────────────────────────────────────────────────────────────────────── */
const dogwoodQuestions = [
  {
    id: uuidv4(),
    stem: 'According to the account creation record, who requested netops_guest_admin3 and what organization was listed as the requesting/support organization?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Requested by Network Segmentation Support; RestonIT LLC listed as the requesting organization' },
        { id: 'b', text: 'Requested by Dogwood’s front desk staff for guest check-in support' },
        { id: 'c', text: 'Requested by the hotel’s payment processor' },
        { id: 'd', text: 'No requesting department or organization is listed' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The account was requested for Network Segmentation Support, with RestonIT LLC listed as the requesting/support organization.',
      incorrect: 'Review the account creation record — it names Network Segmentation Support and RestonIT LLC.',
      reference: 'Dogwood Hotel — Account Creation Record',
    },
  },
  {
    id: uuidv4(),
    stem: 'Identifying RestonIT LLC as netops_guest_admin3’s requesting/support organization establishes that RestonIT conducted the intrusion.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — per the Cross-Squad CP Bulletin, this ties RestonIT to the account’s support history, not to conducting the intrusion.',
      incorrect: 'The Bulletin explicitly cautions against this conclusion — support-history involvement is not confirmed intrusion involvement.',
      reference: 'Cross-Squad CP Bulletin',
    },
  },
  {
    id: uuidv4(),
    stem: 'What does the prior login history show about netops_guest_admin3 between the approved follow-up testing and the incident?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'No approved use was identified after 2026-02-07 (follow-up testing) until the unauthorized login on 2026-04-08' },
        { id: 'b', text: 'The account was used daily by Dogwood IT for two months' },
        { id: 'c', text: 'The account was disabled immediately after the change record closed' },
        { id: 'd', text: 'The account was never used before the incident' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Dogwood IT’s own note confirms no approved use after February 7 — roughly a two-month dormancy gap before the unauthorized April 8 login.',
      incorrect: 'Check the login history — the gap runs from the Feb 7 follow-up testing to the unauthorized Apr 8 login.',
      reference: 'Dogwood Hotel — Prior Login History',
    },
  },
  {
    id: uuidv4(),
    stem: 'What does the network change record’s closeout note reveal?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Follow-up testing was completed, but account disablement was not documented' },
        { id: 'b', text: 'The account was formally disabled and the credential rotated' },
        { id: 'c', text: 'RestonIT was denied access before the change was approved' },
        { id: 'd', text: 'The change record shows no connection to netops_guest_admin3' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The closeout note confirms follow-up testing completed, but explicitly states account disablement was not documented — the same review-failure pattern seen at other victims.',
      incorrect: 'Check the change record’s closeout note directly — it says disablement was not documented, not that the account was disabled.',
      reference: 'Dogwood Hotel — Change Record',
    },
  },
  {
    id: uuidv4(),
    stem: 'Match each Drop 3 artifact to what it primarily establishes about the netops_guest_admin3 account.',
    payload: {
      kind: 'drag_match',
      sources: [
        { id: 'creation', text: 'Account Creation Record' },
        { id: 'login',    text: 'Prior Login History' },
        { id: 'change',   text: 'Change Record' },
        { id: 'parallel', text: 'Parallel Investigative Squad Update' },
      ],
      targets: [
        { id: 'provenance', text: 'Account provenance (who requested it and why)' },
        { id: 'dormancy',   text: 'Dormancy gap before misuse' },
        { id: 'review',     text: 'Failed/incomplete account disablement' },
        { id: 'downstream', text: 'Downstream actor investigation status' },
      ],
      matches: [
        { sourceId: 'creation', targetId: 'provenance' },
        { sourceId: 'login',    targetId: 'dormancy' },
        { sourceId: 'change',   targetId: 'review' },
        { sourceId: 'parallel', targetId: 'downstream' },
      ],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Each document answers a different investigative question — provenance, dormancy, the disablement gap, and downstream-actor status are separate facts.',
      incorrect: 'Review what each document actually records for Dogwood before matching.',
      reference: 'Drop 3 artifact set',
    },
  },
  {
    id: uuidv4(),
    stem: 'Per the Parallel Investigative Squad Update, has the identity of the downstream actor (Buyer B) who used netops_guest_admin3 been confirmed?',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — the buyer/operator identity remains unknown, and there is no evidence the actor used CedarBridge or RestonIT remote support systems directly.',
      incorrect: 'The update explicitly states the buyer/operator identity remains unknown.',
      reference: 'Parallel Investigative Squad Update — Dogwood (Buyer B)',
    },
  },
  {
    id: uuidv4(),
    stem: 'What is the key PACT-relevant question identified in the Dogwood Parallel Investigative Squad Update?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Whether the actor’s source IP can be geolocated precisely' },
        { id: 'b', text: 'How netops_guest_admin3 became available to the downstream actor' },
        { id: 'c', text: 'Whether Dogwood’s reservation system was compromised' },
        { id: 'd', text: 'Whether the actor is affiliated with a foreign government' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The update states the key PACT-relevant question is how netops_guest_admin3 became available to the actor — the upstream credential-source question, distinct from downstream actor identity.',
      incorrect: 'Review the "Relevance to PACT" line of the update directly.',
      reference: 'Parallel Investigative Squad Update — Dogwood (Buyer B)',
    },
  },
  {
    id: uuidv4(),
    stem: 'Per the Cross-Squad CP Bulletin, which classifications must squads consider for RestonIT LLC? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'A negligent access custodian' },
        { id: 'b', text: 'An intentional upstream source of access' },
        { id: 'c', text: 'A common support provider with poor account hygiene' },
        { id: 'd', text: 'A shell company with no legitimate business operations' },
        { id: 'e', text: 'An entity requiring further investigation before classification' },
      ],
      correct: ['a', 'b', 'c', 'e'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Five classifications are listed in the Bulletin; "shell company with no legitimate operations" is not among them and is unsupported by current evidence.',
      incorrect: 'Review the Bulletin’s list of five classifications directly.',
      reference: 'Cross-Squad CP Bulletin',
    },
  },
  {
    id: uuidv4(),
    stem: 'What is Command Post’s stated next investigative priority regarding RestonIT?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Determine who at RestonIT had access to the credentials, how they were stored, whether they were exported or shared, and whether similar access existed for other clients' },
        { id: 'b', text: 'Immediately revoke RestonIT’s business license' },
        { id: 'c', text: 'Publicly attribute the intrusion to RestonIT' },
        { id: 'd', text: 'Close the Dogwood investigation as unrelated to the other three' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The Bulletin directs squads toward credential access, storage, and export/sharing questions, and whether other RestonIT clients had similar exposure.',
      incorrect: 'Review the Bulletin’s "Next investigative priority" line directly.',
      reference: 'Cross-Squad CP Bulletin',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which conclusions should the squad AVOID reaching prematurely at Drop 3? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'That RestonIT conducted the intrusion' },
        { id: 'b', text: 'That the downstream buyer’s identity is known' },
        { id: 'c', text: 'That netops_guest_admin3 was created through a RestonIT-associated network segmentation project' },
        { id: 'd', text: 'That the four victims are definitely connected through a single compromised MSP' },
      ],
      correct: ['a', 'b', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Attributing the intrusion to RestonIT, claiming the buyer’s identity is known, or concluding a single compromised MSP connects all four victims are all premature. Option C is directly supported by the creation record.',
      incorrect: 'Option C is supported by the creation record. The others go beyond what current evidence establishes.',
      reference: 'Dogwood Hotel — Drop 3 artifacts',
    },
  },
];

const dogwoodDeliverables = [
  {
    kind: 'prompt', points: 20,
    text: 'Account Lifecycle & RestonIT Provenance Summary — Summarize the full lifecycle of netops_guest_admin3 from creation through the incident: who requested it, what organization was involved, what it was approved for, and how it went from legitimate use to unauthorized use.',
    rubric: {
      keyElements: ['Cites Network Segmentation Support and RestonIT LLC as requesting/support organization', 'States the approved purpose (guest Wi-Fi and tenant network segmentation)', 'Traces legitimate use (Feb 3-7) through the dormancy gap to the April 8 unauthorized login', 'Frames RestonIT’s role as support-history provenance, not confirmed intrusion involvement'],
      commonErrors: ['Concluding RestonIT conducted the intrusion', 'Omitting the dormancy gap', 'Missing the approved scope of work'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Access Review Failure Analysis — The change record closeout notes that "account disablement not documented." Explain what this means operationally, why it matters to the investigation, and what records would confirm whether disablement ever occurred.',
    rubric: {
      keyElements: ['Explains that the account was never confirmed disabled after the segmentation project closed', 'Connects this gap to the ~2-month window the account remained active/exploitable', 'Identifies specific follow-up records needed (change management system records, Dogwood IT account audit logs)'],
      commonErrors: ['Assuming disablement happened without evidence', 'Not connecting the gap to the dormancy window', 'Vague follow-up record requests'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Downstream Actor vs. Upstream Source — Using the Parallel Investigative Squad Update, explain the difference between the downstream actor investigation (Hometown Cyber Squad B) and PACT’s own investigative question. What does the update tell you, and what does it explicitly NOT resolve?',
    rubric: {
      keyElements: ['Identifies Hometown Cyber Squad B as handling the downstream actor', 'States what IS known: source IP 198.51.100.91 (anonymized infrastructure), device inventory export, token creation, token disabled by Dogwood IT', 'States what is NOT resolved: buyer/operator identity, and how netops_guest_admin3 became available to the actor', 'Avoids conflating the downstream lead with the upstream credential-source question'],
      commonErrors: ['Conflating downstream actor lead with the upstream question', 'Claiming buyer identity is known', 'Missing the anonymized-infrastructure detail'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'RestonIT Classification Assessment — Of the five classifications Command Post identified, which best fits current Dogwood-specific evidence? Explain your reasoning and what evidence would change your assessment.',
    rubric: {
      keyElements: ['Selects one primary classification (or "requires further investigation") tied to Dogwood-specific facts', 'Explains why other classifications are less supported at this stage', 'Identifies what evidence would shift the assessment', 'Uses appropriately hedged language'],
      commonErrors: ['Declaring a classification as proven', 'No discussion of what would change the assessment'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Integrated Squad Assessment & RestonIT Lead Requests — State your squad’s current position and recommended next investigative step regarding RestonIT LLC’s role in the Dogwood intrusion. List the specific records you would request from or about RestonIT to advance the investigation.',
    rubric: {
      keyElements: ['Concise integrated position consistent with the classification assessment above', 'Concrete RestonIT-directed record requests: credential access, storage method, export/sharing, other-client exposure', 'Specific, actionable next step', 'Brief "what we are not claiming yet" note'],
      commonErrors: ['Unrelated record requests', 'No concrete next step', 'Overstating confidence'],
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   CyberDyne Data Center
───────────────────────────────────────────────────────────────────────────── */
const cyberdyneQuestions = [
  {
    id: uuidv4(),
    stem: 'According to the integration account creation record, who requested custsync_api02 and what organization was listed?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Requested via a customer metadata sync request; RestonIT LLC listed as the requesting organization' },
        { id: 'b', text: 'Requested by a CyberDyne hosted customer directly' },
        { id: 'c', text: 'Requested by CyberDyne’s hypervisor operations team' },
        { id: 'd', text: 'No requesting organization is documented' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The account was created for a customer metadata sync request, with RestonIT LLC listed as the requesting organization.',
      incorrect: 'Review the integration account creation record — it names a metadata sync request and RestonIT LLC.',
      reference: 'CyberDyne — Integration Account Creation Record',
    },
  },
  {
    id: uuidv4(),
    stem: 'Identifying RestonIT LLC as custsync_api02’s requesting organization establishes that RestonIT conducted the intrusion.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — this ties RestonIT to the account’s integration/support history, not to conducting the intrusion.',
      incorrect: 'The Cross-Squad CP Bulletin explicitly cautions against this conclusion.',
      reference: 'Cross-Squad CP Bulletin',
    },
  },
  {
    id: uuidv4(),
    stem: 'What does the prior account activity log show about custsync_api02 between final validation and the incident?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'No approved use was identified after the 2025-12-16 final validation until the interactive login on 2026-04-09' },
        { id: 'b', text: 'The account synced data every day without interruption' },
        { id: 'c', text: 'The account was deleted after final validation' },
        { id: 'd', text: 'The API key was rotated weekly' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The SOC note confirms no approved use after final validation on Dec 16, until the unauthorized interactive login on April 9 — nearly 4 months dormant.',
      incorrect: 'Check the Prior Account Activity dates — the gap runs from Dec 16 to Apr 9.',
      reference: 'CyberDyne — Prior Account Activity',
    },
  },
  {
    id: uuidv4(),
    stem: 'What does the integration request ticket’s closeout note reveal, and why is the April interactive login notable?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'The ticket closed "integration validated" but flagged an ownership review as required at the next quarterly audit — and the account was never expected to be used interactively at all' },
        { id: 'b', text: 'The ticket shows the account was always used interactively' },
        { id: 'c', text: 'The ticket confirms RestonIT was denied access' },
        { id: 'd', text: 'The ticket shows the integration was never approved' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The ticket closed "integration validated" with an ownership review flagged for the next quarterly audit — and the account creation record states interactive login was not expected, making the April 9 interactive login especially anomalous.',
      incorrect: 'Check both the ticket’s closeout note and the creation record’s "Interactive Login Expected: No" field.',
      reference: 'CyberDyne — Integration Request Ticket; Integration Account Creation Record',
    },
  },
  {
    id: uuidv4(),
    stem: 'Match each Drop 3 artifact to what it primarily establishes about the custsync_api02 account.',
    payload: {
      kind: 'drag_match',
      sources: [
        { id: 'creation', text: 'Integration Account Creation Record' },
        { id: 'activity', text: 'Prior Account Activity' },
        { id: 'ticket',   text: 'Integration Request Ticket' },
        { id: 'parallel', text: 'Parallel Investigative Squad Update' },
      ],
      targets: [
        { id: 'provenance', text: 'Account provenance (who requested it and why)' },
        { id: 'dormancy',   text: 'Dormancy gap before misuse' },
        { id: 'review',     text: 'Deferred ownership review' },
        { id: 'downstream', text: 'Downstream actor investigation status' },
      ],
      matches: [
        { sourceId: 'creation', targetId: 'provenance' },
        { sourceId: 'activity', targetId: 'dormancy' },
        { sourceId: 'ticket',   targetId: 'review' },
        { sourceId: 'parallel', targetId: 'downstream' },
      ],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Provenance, dormancy, the deferred ownership review, and downstream-actor status are four separate facts established by four separate documents.',
      incorrect: 'Review what each CyberDyne document actually records before matching.',
      reference: 'Drop 3 artifact set',
    },
  },
  {
    id: uuidv4(),
    stem: 'Per the Parallel Investigative Squad Update, has the identity of the downstream actor (Buyer C) who used custsync_api02 been confirmed?',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — no buyer identity has been confirmed, though the source IP is associated with hosted infrastructure.',
      incorrect: 'The update explicitly states no buyer identity has been confirmed.',
      reference: 'Parallel Investigative Squad Update — CyberDyne (Buyer C)',
    },
  },
  {
    id: uuidv4(),
    stem: 'What does the CyberDyne Parallel Investigative Squad Update say this lead does NOT do?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'It does not by itself identify the upstream access source' },
        { id: 'b', text: 'It does not show any customer metadata was exported' },
        { id: 'c', text: 'It does not confirm whether cardholder data was involved' },
        { id: 'd', text: 'It does not involve an API key at all' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The update states this lead helps show one buyer’s use of purchased access, but does not by itself identify the upstream access source — that remains PACT’s question.',
      incorrect: 'Review the "Relevance to PACT" line of the update directly.',
      reference: 'Parallel Investigative Squad Update — CyberDyne (Buyer C)',
    },
  },
  {
    id: uuidv4(),
    stem: 'Per the Cross-Squad CP Bulletin, which classifications must squads consider for RestonIT LLC? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'A negligent access custodian' },
        { id: 'b', text: 'An entity requiring further investigation before classification' },
        { id: 'c', text: 'A compromised MSP' },
        { id: 'd', text: 'A common support provider with poor account hygiene' },
        { id: 'e', text: 'A confirmed data broker selling access on criminal marketplaces' },
      ],
      correct: ['a', 'b', 'c', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Five classifications are listed in the Bulletin; "confirmed data broker" is not among them and is unsupported at this stage.',
      incorrect: 'Review the Bulletin’s list of five classifications directly.',
      reference: 'Cross-Squad CP Bulletin',
    },
  },
  {
    id: uuidv4(),
    stem: 'What is Command Post’s stated next investigative priority regarding RestonIT?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Determine who at RestonIT had access to the credentials, how they were stored, whether they were exported or shared, and whether similar access existed for other clients' },
        { id: 'b', text: 'Terminate CyberDyne’s contract with RestonIT immediately' },
        { id: 'c', text: 'Assume RestonIT’s other clients are unaffected' },
        { id: 'd', text: 'Focus exclusively on the API key mechanics and ignore RestonIT entirely' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The Bulletin directs squads toward credential access, storage, and export/sharing questions, and whether other RestonIT clients had similar exposure — the opposite of assuming they’re unaffected.',
      incorrect: 'Review the Bulletin’s "Next investigative priority" line directly.',
      reference: 'Cross-Squad CP Bulletin',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which conclusions should the squad AVOID reaching prematurely at Drop 3? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'That RestonIT conducted the intrusion' },
        { id: 'b', text: 'That Buyer C’s identity is known' },
        { id: 'c', text: 'That custsync_api02 was created for a RestonIT-associated metadata sync integration' },
        { id: 'd', text: 'That RestonIT’s other clients are definitely also compromised' },
      ],
      correct: ['a', 'b', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Intrusion attribution, buyer identity, and assuming other RestonIT clients are compromised are all premature. Option C is directly supported by the integration account creation record.',
      incorrect: 'Option C is supported by the creation record. The others go beyond current evidence.',
      reference: 'CyberDyne — Drop 3 artifacts',
    },
  },
];

const cyberdyneDeliverables = [
  {
    kind: 'prompt', points: 20,
    text: 'Account Lifecycle & RestonIT Provenance Summary — Summarize the full lifecycle of custsync_api02 from creation through the incident: who requested it, what organization was involved, what it was approved for, and how it went from legitimate use to unauthorized use.',
    rubric: {
      keyElements: ['Cites the customer metadata sync request and RestonIT LLC as requesting organization', 'States the approved scope (customer metadata read, no hosted/production/power access)', 'Traces legitimate use (Dec 11-16) through the dormancy gap to the April 9 unauthorized interactive login', 'Notes interactive login was explicitly not expected for this account type'],
      commonErrors: ['Concluding RestonIT conducted the intrusion', 'Omitting the dormancy gap', 'Missing that interactive login itself is anomalous for this account'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Access Review Failure Analysis — The integration ticket flagged an "ownership review required during next quarterly access audit." Explain what this means operationally, why it matters, and what records would confirm whether that audit ever occurred.',
    rubric: {
      keyElements: ['Explains the deferred quarterly ownership review and that it apparently never caught the account before misuse', 'Connects this to the ~4-month dormancy window', 'Identifies specific follow-up records needed (quarterly audit records, integration ownership documentation)'],
      commonErrors: ['Assuming the audit happened without evidence', 'Not connecting the gap to the dormancy window'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Downstream Actor vs. Upstream Source — Using the Parallel Investigative Squad Update, explain the difference between the downstream actor investigation (Regional Cyber / Data Center Squad) and PACT’s own investigative question. What does the update tell you, and what does it explicitly NOT resolve?',
    rubric: {
      keyElements: ['Identifies the Regional Cyber / Data Center Squad as handling the downstream actor', 'States what IS known: source IP 192.0.2.44 (hosted infrastructure), API key created and later disabled, limited metadata exported, no data center operational access', 'States what is NOT resolved: buyer identity, and how custsync_api02 became available to the actor', 'Avoids conflating the downstream lead with the upstream question'],
      commonErrors: ['Conflating downstream lead with upstream question', 'Claiming buyer identity is known', 'Overstating the scope of data exported'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'RestonIT Classification Assessment — Of the five classifications Command Post identified, which best fits current CyberDyne-specific evidence? Explain your reasoning and what evidence would change your assessment.',
    rubric: {
      keyElements: ['Selects one primary classification (or "requires further investigation") tied to CyberDyne-specific facts', 'Explains why other classifications are less supported at this stage', 'Identifies what evidence would shift the assessment', 'Uses appropriately hedged language'],
      commonErrors: ['Declaring a classification as proven', 'No discussion of what would change the assessment'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Integrated Squad Assessment & RestonIT Lead Requests — State your squad’s current position and recommended next investigative step regarding RestonIT LLC’s role in the CyberDyne intrusion. List the specific records you would request from or about RestonIT to advance the investigation.',
    rubric: {
      keyElements: ['Concise integrated position consistent with the classification assessment above', 'Concrete RestonIT-directed record requests: credential access, storage, export/sharing, other-client exposure', 'Specific, actionable next step', 'Brief "what we are not claiming yet" note'],
      commonErrors: ['Unrelated record requests', 'No concrete next step', 'Overstating confidence'],
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Pixel Play Arcade
───────────────────────────────────────────────────────────────────────────── */
const pixelPlayQuestions = [
  {
    id: uuidv4(),
    stem: 'According to the account creation record, who requested pos-maint08 and what organization was listed?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Requested via POS support setup; RestonIT LLC listed as the requesting organization' },
        { id: 'b', text: 'Requested directly by the payment processor' },
        { id: 'c', text: 'Requested by arcade floor staff' },
        { id: 'd', text: 'No requesting organization is documented' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The account was created for POS support setup, with RestonIT LLC listed as the requesting/support organization.',
      incorrect: 'Review the account creation record — it names POS support setup and RestonIT LLC.',
      reference: 'Pixel Play Arcade — Account Creation Record',
    },
  },
  {
    id: uuidv4(),
    stem: 'Identifying RestonIT LLC as pos-maint08’s requesting organization establishes that RestonIT conducted the intrusion.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — this ties RestonIT to the account’s support history, not to conducting the intrusion.',
      incorrect: 'The Cross-Squad CP Bulletin explicitly cautions against this conclusion.',
      reference: 'Cross-Squad CP Bulletin',
    },
  },
  {
    id: uuidv4(),
    stem: 'What does the prior login history show about pos-maint08 between vendor validation and the incident?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'No approved vendor activity was identified between 2026-01-31 (vendor validation) and the unauthorized login on 2026-04-10' },
        { id: 'b', text: 'The vendor logged in every week without interruption' },
        { id: 'c', text: 'The account was locked immediately after setup' },
        { id: 'd', text: 'The account was used only by arcade employees' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Pixel Play’s own note confirms no approved vendor activity between January 31 and the unauthorized April 10 login — roughly a 2.5-month dormancy gap.',
      incorrect: 'Check the login history dates — the gap runs from Jan 31 to Apr 10.',
      reference: 'Pixel Play Arcade — Prior Login History',
    },
  },
  {
    id: uuidv4(),
    stem: 'What does the POS support ticket’s closure status reveal?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Support setup completed, with the maintenance account closed "access review pending" — the review was never confirmed done before misuse' },
        { id: 'b', text: 'The ticket confirms the account was deleted at closeout' },
        { id: 'c', text: 'The ticket shows Pixel Play declined the vendor’s access request' },
        { id: 'd', text: 'The ticket was never closed' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The ticket closed "access review pending" — the same review-failure pattern seen at the other three victims.',
      incorrect: 'Check the ticket’s Closure Status field directly — it reads "Closed - access review pending."',
      reference: 'Pixel Play Arcade — Support Ticket',
    },
  },
  {
    id: uuidv4(),
    stem: 'Match each Drop 3 artifact to what it primarily establishes about the pos-maint08 account.',
    payload: {
      kind: 'drag_match',
      sources: [
        { id: 'creation', text: 'Account Creation Record' },
        { id: 'login',    text: 'Prior Login History' },
        { id: 'ticket',   text: 'Support Ticket' },
        { id: 'parallel', text: 'Parallel Investigative Squad Update' },
      ],
      targets: [
        { id: 'provenance', text: 'Account provenance (who requested it and why)' },
        { id: 'dormancy',   text: 'Dormancy gap before misuse' },
        { id: 'review',     text: 'Failed/incomplete access review' },
        { id: 'downstream', text: 'Downstream actor investigation status' },
      ],
      matches: [
        { sourceId: 'creation', targetId: 'provenance' },
        { sourceId: 'login',    targetId: 'dormancy' },
        { sourceId: 'ticket',   targetId: 'review' },
        { sourceId: 'parallel', targetId: 'downstream' },
      ],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Provenance, dormancy, the review failure, and downstream-actor status are four separate facts, each established by a different document.',
      incorrect: 'Review what each Pixel Play document actually records before matching.',
      reference: 'Drop 3 artifact set',
    },
  },
  {
    id: uuidv4(),
    stem: 'Per the Parallel Investigative Squad Update, has the identity of the downstream actor (Buyer D) who used pos-maint08 been confirmed?',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — no buyer identity has been confirmed, though the activity appears financially motivated.',
      incorrect: 'The update explicitly states no buyer identity has been confirmed.',
      reference: 'Parallel Investigative Squad Update — Pixel Play (Buyer D)',
    },
  },
  {
    id: uuidv4(),
    stem: 'What does RocketPay Systems (the POS vendor) state about the incident window, per the update?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'RocketPay confirms it performed the maintenance session' },
        { id: 'b', text: 'RocketPay denies approved maintenance during the incident window' },
        { id: 'c', text: 'RocketPay has no record of pos-maint08 ever existing' },
        { id: 'd', text: 'RocketPay confirms cardholder data was accessed' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'RocketPay Systems denies approved maintenance during the incident window — ruling out the possibility this was legitimate vendor activity.',
      incorrect: 'Review the "Current Status" section of the Pixel Play update directly.',
      reference: 'Parallel Investigative Squad Update — Pixel Play (Buyer D)',
    },
  },
  {
    id: uuidv4(),
    stem: 'Per the Cross-Squad CP Bulletin, which classifications must squads consider for RestonIT LLC? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'A compromised MSP' },
        { id: 'b', text: 'An intentional upstream source of access' },
        { id: 'c', text: 'A common support provider with poor account hygiene' },
        { id: 'd', text: 'A negligent access custodian' },
        { id: 'e', text: 'A confirmed accomplice named in a sealed indictment' },
      ],
      correct: ['a', 'b', 'c', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Five classifications appear in the Bulletin (the fifth being "requires further investigation"); a "confirmed accomplice in a sealed indictment" is not one of them and is unsupported.',
      incorrect: 'Review the Bulletin’s list of five classifications directly.',
      reference: 'Cross-Squad CP Bulletin',
    },
  },
  {
    id: uuidv4(),
    stem: 'What is Command Post’s stated next investigative priority regarding RestonIT?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Determine who at RestonIT had access to the credentials, how they were stored, whether they were exported or shared, and whether similar access existed for other clients' },
        { id: 'b', text: 'Assume the Pixel Play intrusion is unrelated to the other three victims' },
        { id: 'c', text: 'Focus exclusively on RocketPay Systems and drop the RestonIT lead' },
        { id: 'd', text: 'Publicly name RestonIT as responsible for all four intrusions' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The Bulletin directs squads toward credential access, storage, and export/sharing questions, and whether other RestonIT clients had similar exposure.',
      incorrect: 'Review the Bulletin’s "Next investigative priority" line directly.',
      reference: 'Cross-Squad CP Bulletin',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which conclusions should the squad AVOID reaching prematurely at Drop 3? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'That RestonIT conducted the intrusion' },
        { id: 'b', text: 'That Buyer D’s identity is known' },
        { id: 'c', text: 'That pos-maint08 was created for a RestonIT-associated POS support engagement' },
        { id: 'd', text: 'That the activity is confirmed financially motivated organized crime' },
      ],
      correct: ['a', 'b', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Intrusion attribution, buyer identity, and confirming organized-crime motivation are all premature. Option C is directly supported by the account creation record.',
      incorrect: 'Option C is supported by the creation record. The others go beyond current evidence — "appears financially motivated" is not the same as "confirmed organized crime."',
      reference: 'Pixel Play Arcade — Drop 3 artifacts',
    },
  },
];

const pixelPlayDeliverables = [
  {
    kind: 'prompt', points: 20,
    text: 'Account Lifecycle & RestonIT Provenance Summary — Summarize the full lifecycle of pos-maint08 from creation through the incident: who requested it, what organization was involved, what it was approved for, and how it went from legitimate use to unauthorized use.',
    rubric: {
      keyElements: ['Cites the POS support setup request and RestonIT LLC as requesting organization', 'States the approved purpose (POS back-office maintenance and remote support)', 'Traces legitimate use (Jan 29-31) through the dormancy gap to the April 10 unauthorized login', 'Frames RestonIT’s role as support-history provenance, not confirmed intrusion involvement'],
      commonErrors: ['Concluding RestonIT conducted the intrusion', 'Omitting the dormancy gap', 'Missing the approved scope of work'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Access Review Failure Analysis — The support ticket closed "access review pending." Explain what this means operationally, why it matters, and what records would confirm whether a review ever occurred — including what RocketPay Systems’ denial of approved maintenance adds to the picture.',
    rubric: {
      keyElements: ['Explains the account was never confirmed reviewed/disabled after setup', 'Connects this to the ~2.5-month dormancy window', 'Notes RocketPay’s denial of approved maintenance rules out legitimate vendor activity during the incident', 'Identifies specific follow-up records needed'],
      commonErrors: ['Assuming a review happened without evidence', 'Ignoring the RocketPay denial', 'Vague follow-up record requests'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Downstream Actor vs. Upstream Source — Using the Parallel Investigative Squad Update, explain the difference between the downstream actor investigation (Financial Crimes / Cyber Squad) and PACT’s own investigative question. What does the update tell you, and what does it explicitly NOT resolve?',
    rubric: {
      keyElements: ['Identifies the Financial Crimes / Cyber Squad as handling the downstream actor', 'States what IS known: source IP 198.51.100.128 (anonymized infrastructure), RemoteAssist use, terminal enumeration, failed settlement query, no cardholder data access confirmed', 'States what is NOT resolved: buyer identity, and how pos-maint08 became available to the actor', 'Avoids conflating the downstream lead with the upstream question'],
      commonErrors: ['Conflating downstream lead with upstream question', 'Claiming cardholder data was accessed', 'Claiming buyer identity is known'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'RestonIT Classification Assessment — Of the five classifications Command Post identified, which best fits current Pixel Play-specific evidence? Explain your reasoning and what evidence would change your assessment.',
    rubric: {
      keyElements: ['Selects one primary classification (or "requires further investigation") tied to Pixel Play-specific facts', 'Explains why other classifications are less supported at this stage', 'Identifies what evidence would shift the assessment', 'Uses appropriately hedged language'],
      commonErrors: ['Declaring a classification as proven', 'No discussion of what would change the assessment'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Integrated Squad Assessment & RestonIT Lead Requests — State your squad’s current position and recommended next investigative step regarding RestonIT LLC’s role in the Pixel Play intrusion. List the specific records you would request from or about RestonIT to advance the investigation.',
    rubric: {
      keyElements: ['Concise integrated position consistent with the classification assessment above', 'Concrete RestonIT-directed record requests: credential access, storage, export/sharing, other-client exposure', 'Specific, actionable next step', 'Brief "what we are not claiming yet" note'],
      commonErrors: ['Unrelated record requests', 'No concrete next step', 'Overstating confidence'],
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────────────────────── */
const VICTIMS = [
  { name: 'Redstone Memorial Hospital', quiz: redstoneQuestions,  deliverables: redstoneDeliverables },
  { name: 'Dogwood Hotel & Resort',     quiz: dogwoodQuestions,   deliverables: dogwoodDeliverables },
  { name: 'CyberDyne Data Center',      quiz: cyberdyneQuestions, deliverables: cyberdyneDeliverables },
  { name: 'Pixel Play Arcade',          quiz: pixelPlayQuestions, deliverables: pixelPlayDeliverables },
];

(async () => {
  await seq.authenticate();
  console.log('PostgreSQL connected\n');

  for (const victim of VICTIMS) {
    const analysisTitle    = 'PACKET HEIST — Drop 3: Account Lifecycle & RestonIT Nexus';
    const deliverableTitle = 'PACKET HEIST — Drop 3: Squad Deliverables';

    await seq.query(
      `DELETE FROM assignments WHERE course_id = :courseId AND victim_name = :victim AND drop_number = 3 AND title IN (:t1, :t2)`,
      { replacements: { courseId: COURSE_ID, victim: victim.name, t1: analysisTitle, t2: deliverableTitle } },
    );

    const [[{ next: oi0 }]] = await seq.query(
      "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
      { replacements: { courseId: COURSE_ID } },
    );
    const oi       = Number(oi0);
    const maxScore = victim.quiz.reduce((s, q) => s + q.scoring.points, 0);
    const quizId   = uuidv4();
    const delivId  = uuidv4();

    await seq.query(
      `INSERT INTO assignments
         (id, course_id, title, description, type, grading_mode, max_score, order_index,
          is_published, scenario_name, victim_name, drop_number, questions, role_filters, created_at, updated_at)
       VALUES
         (:id, :courseId, :title, :description, 'challenge', 'squad', :maxScore, :oi,
          false, 'packet-heist', :victim, 3, :questions, '{}', NOW(), NOW())`,
      {
        replacements: {
          id:          quizId,
          courseId:    COURSE_ID,
          title:       analysisTitle,
          description: `Review the Drop 3 account-lifecycle artifacts for ${victim.name} and the Cross-Squad CP Bulletin revealing RestonIT LLC's role, then answer each question based strictly on what the evidence supports. Avoid speculation.`,
          maxScore,
          oi,
          victim:      victim.name,
          questions:   JSON.stringify(victim.quiz),
        },
      },
    );
    console.log(`✓ ${victim.name} — Account Lifecycle & RestonIT Nexus | ID: ${quizId} | ${victim.quiz.length} questions | ${maxScore} pts`);

    await seq.query(
      `INSERT INTO assignments
         (id, course_id, title, description, type, grading_mode, max_score, order_index,
          is_published, scenario_name, victim_name, drop_number, questions, role_filters, created_at, updated_at)
       VALUES
         (:id, :courseId, :title, :description, 'challenge', 'squad', 100, :oi2,
          false, 'packet-heist', :victim, 3, :questions, '{}', NOW(), NOW())`,
      {
        replacements: {
          id:       delivId,
          courseId: COURSE_ID,
          title:    deliverableTitle,
          victim:   victim.name,
          description: [
            `${victim.name} · Drop 3 — Account Lifecycle & RestonIT Nexus`,
            '',
            'Complete all five deliverables as a squad. Your responses will be reviewed and graded by command.',
            'Base every response on evidence in the Drop 3 packet and the Cross-Squad CP Bulletin.',
            'These deliverables feed directly into your Command Post briefing.',
          ].join('\n'),
          oi2:       oi + 1,
          questions: JSON.stringify(victim.deliverables),
        },
      },
    );
    console.log(`✓ ${victim.name} — Squad Deliverables | ID: ${delivId} | ${victim.deliverables.length} prompts\n`);
  }

  console.log('All seeded unpublished. Assign each victim to its squad and unlock + publish via Command → Content Gating when ready.\n');
  await seq.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
