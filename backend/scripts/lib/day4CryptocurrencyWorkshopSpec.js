'use strict';
/**
 * Definitions for the Day 4 PM "Investigating Cryptocurrency Workshop" —
 * squads run a fictional ransomware-payment trace (Harlow Dental Group)
 * through the lecture's six-step checklist (capture, classify, trace,
 * identify the exchange and match legal process, document provenance, know
 * when to escalate), then a trial-readiness check and squad synthesis.
 * Transcribed from "PACT Challenges"/Cryptocurrency_Workshop_Squad_Packet.docx
 * and its _Facilitator_Guide.docx counterpart.
 *
 * Deliberately fictional and NOT tied to Operation BROKERED EXIT or any
 * packet-heist/packet-heist-v2 drop, per the facilitator guide — clean,
 * internally consistent hop-by-hop data built specifically so the exercise
 * doesn't depend on any case-file materials.
 *
 * Pure data — no database access — same pattern as
 * day4AttributionWorkshopSpec.js, which this mirrors structurally (a squad
 * WORKSHOP, not an individual role assessment: auto-graded quick-checks per
 * step feeding ChallengeFlow's JUDGMENT CHECKS section, prompt deliverables
 * feeding SQUAD DELIVERABLES).
 */
const { v4: uuidv4 } = require('uuid');

const MC_POINTS = 10;
const BLANK_POINTS = 10;

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

function refNote(text) {
  return [`MODEL ANSWER (reference only — grade against the must-include list, not exact wording): ${text}`];
}

function prompt(text, keyElements, points, commonErrors = null) {
  return {
    id: uuidv4(),
    kind: 'prompt',
    points,
    text,
    rubric: { keyElements, ...(commonErrors ? { commonErrors } : {}) },
  };
}

const LAUNCH_BRIEFING = `Harlow Dental Group, a small dental practice, paid a 0.85 BTC ransom demand after a ransomware incident. The victim's own exchange account shows the outbound payment. Below is the trace record as your squad has assembled it so far — work through it exactly as the checklist from this afternoon's lecture says to: capture, classify, trace, identify the exchange and match legal process, document provenance, and know when to escalate.

Each step opens with a quick comprehension check, then a task your squad drafts together.

This scenario (Harlow Dental Group, TumbleCore, Vantex, and all addresses/hashes) is fictional, built to exercise every stage of this lecture's workflow with clean, internally consistent data. It is not based on a real case and does not reference your case file.`;

const DESCRIPTION = 'Squad workshop running a fictional ransomware-payment trace (Harlow Dental Group) through the afternoon lecture\'s six-step cryptocurrency-tracing checklist — capture, classify, trace, identify the exchange and match legal process, document provenance, and escalate — independent of any case-file materials.';

/* ── Framework quick check ── */
const FRAMEWORK_CHECKS = [
  mc('An address on a public blockchain is best understood as:', ['A verified real-world identity', 'An alphanumeric label that is not an identity until something else ties a person to it', 'A bank account number issued by a government', 'Proof of ownership on its own'], 1, 'the framework quick check'),
  mc('Which asset type is built so a centralized issuer may be able to freeze funds?', ['A privacy coin like Monero', 'A stablecoin like USDC or Tether', 'Bitcoin specifically', 'None — no crypto can be frozen'], 1, 'the framework quick check'),
  blank('Funds held by a third-party platform on a user\'s behalf, rather than by the user directly, is called ______ custody.', ['custodial'], 'the framework quick check'),
  blank('A regulated company that generally performs KYC on its crypto customers is called a ______ (acronym).', ['VASP'], 'the framework quick check'),
];

/* ── Six-step trace ── */
const STEPS = [
  {
    name: 'Step 1 — Capture',
    checks: [
      mc('Per the checklist, what should happen before anything else once a crypto payment is reported?', ['Wait for a complete trace', 'Capture the exact address, transaction hash, amount, and timestamp', 'Immediately contact the exchange\'s CEO', 'Convert the amount to USD for the report'], 1, 'Step 1'),
    ],
    prompt: prompt(
      'Step 1 — Write down, in a clean evidentiary format, the four data points your squad has for this first transaction.',
      [
        'States the sending and receiving addresses distinctly — notes the victim\'s own (Coinbase-controlled) sending address is already in the case file rather than treating it as missing',
        'States the transaction hash and the amount/timestamp as two separate, specific data points, not folded together',
      ],
      15,
      refNote('Sending address: Harlow Dental\'s Coinbase-controlled address (already in case file). Receiving address: Address A. Transaction hash: 9f2c…a41d. Amount and timestamp: 0.85 BTC, Day 0, 14:02 UTC.'),
    ),
  },
  {
    name: 'Step 2 — Classify',
    checks: [
      mc('Which category does Bitcoin fall into for tracing purposes?', ['Privacy coin', 'Transparent ledger', 'Stablecoin', 'None of these categories apply'], 1, 'Step 2'),
      blank('If this ransom had instead been paid in Monero, tracing would be significantly ______ and often require specialized capability.', ['harder', 'more difficult'], 'Step 2'),
    ],
    prompt: prompt(
      'Step 2 — State, in one sentence, what this classification means for whether basic tracing is realistically possible here.',
      [
        'Correctly identifies Bitcoin as a transparent-ledger asset',
        'States that this means the address history is publicly visible and basic tracing is realistically possible — not guaranteed to succeed, but not blocked by asset type the way a privacy coin would be',
      ],
      15,
      refNote('Bitcoin is a transparent-ledger asset, so the full transaction history for these addresses is publicly visible and basic hop-by-hop tracing is realistically possible here — unlike a privacy coin, where tracing would likely require specialized capability from the start.'),
    ),
  },
  {
    name: 'Step 3 — Trace the hops',
    checks: [
      mc('What technique does TX2 (splitting into 0.03 BTC and 0.82 BTC) demonstrate?', ['Chain-hopping', 'A peel chain', 'Privacy coin conversion', 'A stablecoin freeze'], 1, 'Step 3'),
      mc('What technique does TX3–TX4 demonstrate?', ['A peel chain', 'Chain-hopping into a different cryptocurrency', 'Mixing/tumbling', 'Nothing unusual'], 2, 'Step 3'),
      blank('The amount changes from 0.82 BTC going into TumbleCore to 0.79 BTC coming out — this difference is consistent with a ______ charged by the mixing service.', ['fee'], 'Step 3'),
    ],
    // Facilitator guide flags this as "the single most important judgment
    // call in the whole exercise" — weighted accordingly.
    prompt: prompt(
      'Step 3 — State your confidence that the 0.79 BTC arriving at Vantex (TX5) is the same money that entered TumbleCore in TX3, and explain why a mixer changes that confidence level compared to TX2\'s peel chain.',
      [
        'Does not claim certainty that TX4\'s funds are definitively the same funds as TX3 — a mixer is specifically designed to break deterministic address-to-address linkage',
        'Contrasts this with TX2, where the split is directly observable on-chain and the two resulting amounts can be followed with much higher confidence',
        'States the confidence level for the post-mixer link as something like "consistent with, but not proven to be" the original funds — not "confirmed"',
      ],
      25,
      refNote('Moderate confidence, at best, that TX4\'s 0.79 BTC is the same money that entered TumbleCore — the amount and timing are consistent with it, but a mixer is specifically designed to break the deterministic link a normal address-to-address hop preserves. This is categorically different from TX2\'s peel chain, where both resulting addresses are directly, publicly observable outputs of the same transaction — that link is confirmed by the ledger itself, not inferred from a pattern.'),
    ),
  },
  {
    name: 'Step 4 — Identify the exchange and match legal process',
    checks: [
      mc('What must be true of a VASP for KYC records to exist to request in the first place?', ['It must be a privacy-coin platform', 'It must be regulated and generally perform KYC on its customers', 'It must be a hardware wallet manufacturer', 'Nothing — all platforms keep identical records'], 1, 'Step 4'),
    ],
    prompt: prompt(
      'Step 4 — For each of the three asks below, name the specific legal process tier that fits, and briefly say why.\n\nAsk 1: name, address, and ID on file for the account controlling the receiving cluster.\nAsk 2: full transaction history and login IP/device logs for that account.\nAsk 3: any stored messages the account holder exchanged with Vantex support.',
      [
        'Ask 1 → subpoena (basic subscriber/KYC information)',
        'Ask 2 → court order / 2703(d)-type order (non-content records)',
        'Ask 3 → search warrant (content — the highest evidentiary bar)',
        'Does not use the same process tier for all three — that\'s the error this task is built to catch',
      ],
      25,
      refNote('Ask 1 (name/address/ID): a subpoena — basic subscriber and KYC information. Ask 2 (transaction history, IP/device logs): a court order or 2703(d)-type order — non-content records that need more than a subpoena but not full content-level authority. Ask 3 (stored messages/content): a search warrant — content always requires the highest bar available here.'),
    ),
  },
  {
    name: 'Step 5 — Provenance',
    checks: [
      blank('Provenance documentation for a crypto record requires the wallet/account identifier, the platform, the transaction/block reference, the date/time of the query, the method used, and the ______ of the export.', ['preservation'], 'Step 5'),
    ],
    prompt: prompt(
      'Step 5 — Draft the six-element provenance record for your TX5 pull, using today\'s date as the query date.',
      [
        'Names all six elements: identifier, platform/ledger, transaction/block reference, date/time of query, method used, and preservation of the export',
        'Applies them specifically to TX5 (the Vantex deposit) rather than writing generic placeholders with no case-specific content',
      ],
      20,
      refNote('(1) Identifier: Address C / receiving hot-wallet cluster at Vantex. (2) Platform: Bitcoin blockchain, viewed via the office\'s licensed platform. (3) Transaction/block reference: txid 22f0…d5c8. (4) Date/time of query: today\'s date, per the squad\'s actual pull. (5) Method: licensed blockchain-analysis platform export (not a public block explorer alone, if that\'s what was used). (6) Preservation: exported file saved to the case evidence system, with a hash value recorded for the export file itself.'),
    ),
  },
  {
    name: 'Step 6 — Escalate',
    checks: [
      mc('Per the deck, what\'s the right move when a trace hits a mixer?', ['Force the trace through by guessing likely output addresses', 'Document the pattern and escalate to a specialist team', 'Stop the investigation entirely', 'Ignore the mixer and treat the pre- and post-mixer addresses as definitively linked'], 1, 'Step 6'),
      blank('The specialized FBI team for cryptocurrency tracing and seizure support is the ______ (acronym).', ['VCRT'], 'Step 6'),
    ],
    prompt: prompt(
      'Step 6 — Draft the one-sentence escalation request your squad would send to your office\'s crypto resource, given everything above.',
      [
        'Names the specific trigger (a known mixer in the trail) rather than a vague "this case involves crypto"',
        'Asks for something specific and actionable (e.g., help resolving the post-mixer linkage, or confirming the Vantex cluster identification) rather than an open-ended request for help',
      ],
      15,
      refNote('"We have a ransomware-payment trace (Harlow Dental Group) that passes through a known mixing service (TumbleCore) before funds reappear at Vantex exchange — requesting VCRT support to assess confidence in the post-mixer linkage before we finalize legal process on the Vantex account."'),
    ),
  },
];

/* ── Trial-readiness check ── */
const TRIAL_READINESS = prompt(
  'Trial-readiness check — Opposing counsel will ask five questions about a trace like this one. Answer each one, specifically, using your own work above — not in the abstract.\n\n1. What tool or method produced this trace?\n2. What was the exact address and transaction hash?\n3. When did you run the query?\n4. How was the output preserved?\n5. Who else had access to the wallet or keys?',
  [
    'Answers questions 1–4 using specifics from the squad\'s own work above (their platform/method from Step 5, the actual txid and addresses, the query date they used)',
    'For question 5 ("who else had access to the wallet or keys"): this is NOT established anywhere in the packet — a squad that notices that gap and says so explicitly should get full credit; a squad that invents an answer to avoid an awkward blank should not',
  ],
  25,
);

/* ── Squad synthesis ── */
const SYNTHESIS = [
  prompt(
    'Squad synthesis — Where in this trace did your squad\'s confidence drop, and how did you reflect that in what you wrote rather than just in how you felt about it?',
    [
      'Names a specific point in the trace (most likely the TumbleCore mixer at Step 3)',
      'Points to a specific place in the squad\'s own written answers where that lower confidence was actually reflected in the language used, not just asserted here after the fact',
    ],
    15,
  ),
  prompt(
    'Squad synthesis — If Vantex had been incorporated in a foreign country instead of the U.S., what would change about Step 4 — and which earlier lecture does that connect to?',
    [
      'Recognizes that a foreign-incorporated VASP would take the request out of direct U.S. subpoena/court-order/warrant process and into an international-cooperation mechanism (e.g. MLAT)',
      'Connects this explicitly to the international evidence lecture',
    ],
    15,
  ),
  prompt(
    'Squad synthesis — What\'s the single most avoidable mistake your squad could have made in this exercise, per the deck\'s pitfalls list?',
    [
      'Names one specific pitfall (e.g. treating an address as a person\'s identity; waiting for a complete trace before starting Vantex legal process; genericizing the Step 5 provenance record; trying to resolve the mixer link itself instead of escalating)',
      'Explains briefly why it\'s a mistake, not just naming it',
    ],
    15,
  ),
];

function buildQuestions() {
  const questions = [...FRAMEWORK_CHECKS];
  for (const step of STEPS) {
    questions.push(...step.checks, step.prompt);
  }
  questions.push(TRIAL_READINESS, ...SYNTHESIS);
  return questions;
}

module.exports = {
  // Renamed from the pre-existing stub's title ("Day 4 PM Workshop:
  // Toolbox-to-Attribution Synthesis") — that title described the old
  // BROKERED EXIT-tied content this replaces, not this workshop.
  TITLE: 'Day 4 PM Workshop: Investigating Cryptocurrency',
  PRIOR_TITLE: 'Day 4 PM Workshop: Toolbox-to-Attribution Synthesis',
  EXISTING_ID: '33d0427a-9b30-463a-9c3b-40abe4da60f8',
  LAUNCH_BRIEFING,
  DESCRIPTION,
  FRAMEWORK_CHECKS,
  STEPS,
  TRIAL_READINESS,
  SYNTHESIS,
  buildQuestions,
};
