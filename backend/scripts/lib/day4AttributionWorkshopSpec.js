'use strict';
/**
 * Definitions for the Day 4, 1030 "Attribution Workshop" — squads work five
 * real, public evidence categories (persona, infrastructure, affiliate
 * structure, real-world identity, foreign partner threads) from the May 2024
 * unmasking of "LockBitSupp" as Dmitry Khoroshev, applying the morning
 * lecture's confidence-language framework and five-category structure, then
 * write three final calibrated confidence statements. Transcribed from
 * "PACT Challenges"/Attribution_Workshop_Squad_Packet.docx and its
 * _Facilitator_Guide.docx counterpart.
 *
 * Deliberately NOT tied to Operation BROKERED EXIT or any packet-heist/
 * packet-heist-v2 drop — per the facilitator guide, this uses a different,
 * fully public case specifically so the exercise doesn't depend on any
 * case-file materials.
 *
 * Pure data — no database access — so seed-pact-day4-attribution-workshop.js
 * and its tests share it, same pattern as day3RoleSpecs.js/day4RoleSpecs.js.
 * This is the first squad WORKSHOP (not individual role assessment) built
 * with the mixed shape (auto-graded quick-checks per category feeding
 * ChallengeFlow's JUDGMENT CHECKS section, prompt deliverables feeding
 * SQUAD DELIVERABLES).
 */
const { v4: uuidv4 } = require('uuid');

const MC_POINTS = 10;
const BLANK_POINTS = 10;
const CATEGORY_PROMPT_POINTS = 25;
const FINAL_STATEMENT_POINTS = 20;
const SYNTHESIS_POINTS = 15;

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

const LAUNCH_BRIEFING = `On May 7, 2024, the U.S. Department of Justice unsealed a 26-count indictment identifying Dmitry Yuryevich Khoroshev, 31, of Voronezh, Russia, as the real-world identity behind "LockBitSupp" — the persona that had run the LockBit ransomware-as-a-service operation since 2019 while staying anonymous, including through a public $10 million bounty LockBitSupp himself had once offered for anyone who unmasked him. The U.S. Treasury, the UK's Foreign, Commonwealth and Development Office, and Australia's Department of Foreign Affairs jointly sanctioned him the same day.

This case is independent of your case file — a real, fully public attribution case, used here to practice this morning's lecture on a fresh fact pattern. Work through the five evidence categories together, applying the structure from the whiteboard: what we know, how we know it, confidence level, and what would change the assessment. Each category opens with a quick comprehension check before your squad drafts its attribution statement. End by writing three final calibrated confidence statements in the lecture's exact format.

Nothing below states an investigative method that isn't public — where the record is silent on how something was learned, that's noted as a gap, not filled in.`;

const DESCRIPTION = 'Squad workshop applying the morning lecture\'s five-category attribution framework and confidence-language format to a real, fully public case (the May 2024 unmasking of "LockBitSupp" as Dmitry Khoroshev) — independent of any case-file materials.';

/* ── Framework quick check ── */
const FRAMEWORK_CHECKS = [
  mc('Per the lecture\'s framework, what must always accompany a stated confidence level?', ['A dollar figure', 'The documented basis for that confidence', 'A classification marking', 'Nothing else is needed'], 1, 'the framework quick check'),
  mc('What\'s wrong with briefing a supervisor that "it\'s probably them"?', ['Nothing — it\'s a fine way to brief', 'It uses unanchored probabilistic language that different listeners interpret differently', 'It\'s overconfident', 'It needs to be classified'], 1, 'the framework quick check'),
  blank('Information sourced from sensitive collection that may not be disclosable, and cannot directly support charging without re-derivation, is called ______-quality information.', ['intelligence'], 'the framework quick check'),
  blank('Building a separate, lawful evidentiary record for facts originally surfaced through other means is called ______ ______.', ['parallel construction'], 'the framework quick check'),
];

/* ── Five evidence categories ── */
const CATEGORIES = [
  {
    name: 'Category 1 — Persona / forum identity',
    checks: [
      mc('What aliases does the indictment name together with LockBitSupp?', ['putinkrab and LockBit', 'DarkSide and REvil', 'Conti and Ryuk', 'No other aliases are named'], 0, 'Category 1'),
      mc('By itself, what does years of consistent persona activity establish?', ['The real-world identity behind the persona', 'That one persona has been operated consistently over time — not who operates it', 'Nothing usable at all', 'A criminal conviction'], 1, 'Category 1'),
      blank('LockBitSupp had previously offered a $______ bounty to anyone who could unmask his real identity.', ['10 million', '$10 million', '10,000,000'], 'Category 1'),
    ],
    prompt: prompt(
      'Category 1 — Draft the attribution statement for this category: what the persona\'s public track record establishes, at what confidence, and what it does NOT establish on its own.',
      [
        'Names a confidence level no higher than moderate — a consistent persona doesn\'t by itself prove who\'s behind it',
        'States the specific basis: multiple aliases (LockBitSupp, LockBit, putinkrab) named together in the indictment; years of consistent public activity',
        'States what\'s missing: the indictment doesn\'t say how the persona was tied to a real name — that linkage is the actual attribution question this category can\'t answer alone',
      ],
      CATEGORY_PROMPT_POINTS,
      refNote('Moderate confidence that LockBitSupp represents a single, consistent operator identity, based on years of public activity, negotiation conduct, and multiple linked aliases (LockBitSupp, LockBit, putinkrab) named together in the indictment. This category establishes persona consistency, not real-world identity — that requires the other four categories.'),
    ),
  },
  {
    name: 'Category 2 — Infrastructure',
    checks: [
      mc('Who led the February 2024 operation that seized LockBit\'s infrastructure?', ['The FBI, acting alone', 'The UK\'s National Crime Agency (NCA)', 'Europol', 'The Australian Federal Police'], 1, 'Category 2'),
      mc('What did investigators find in the seized infrastructure regarding victim data?', ['It had been fully deleted as promised', 'Copies were retained despite promises of deletion', 'It was unreadable due to encryption', 'No victim data was ever present'], 1, 'Category 2'),
      blank('The February infrastructure seizure was code-named Operation ______.', ['Cronos'], 'Category 2'),
    ],
    prompt: prompt(
      'Category 2 — Draft the attribution statement for this category, and separately answer: was the February server seizure itself a U.S. criminal-process action?',
      [
        'States a confidence level for what the infrastructure seizure establishes — administrator-level access to LockBit\'s operational back end — likely high confidence given direct server access',
        'Correctly identifies that the seizure was executed by the NCA under UK authority, not directly by the FBI/DOJ',
        'Flags the intelligence-vs-evidence question: UK-seized material has to come to the U.S. through a lawful sharing mechanism before it\'s usable the way domestically-seized evidence would be',
      ],
      CATEGORY_PROMPT_POINTS,
      refNote('High confidence that whoever controlled this infrastructure had administrator-level access to LockBit\'s operational back end, based on direct seizure of admin-facing servers and websites. Gap/process note: this seizure was executed by the NCA under UK legal authority — for U.S. charging purposes, the resulting material needs to reach American prosecutors through a lawful international-sharing channel (direct law-enforcement cooperation or MLAT). It is not automatically U.S. trial-ready simply because a partner agency seized it.'),
    ),
  },
  {
    name: 'Category 3 — Customer / affiliate relationships',
    checks: [
      mc('Under LockBit\'s RaaS model, what share did affiliates keep of each ransom?', ['50%', '80%', '20%', '100%'], 1, 'Category 3'),
      mc('What was Khoroshev\'s alleged role, distinct from the affiliates?', ['A victim', 'Creator, developer, and primary operator', 'A negotiator only, with no technical role', 'An unrelated bystander'], 1, 'Category 3'),
      blank('At least ______ people had been charged as LockBit members across the related indictments.', ['seven', '7'], 'Category 3'),
    ],
    prompt: prompt(
      'Category 3 — Draft the attribution statement distinguishing Khoroshev\'s alleged role from the affiliates\' roles, and state your confidence that LockBit was an organized service rather than a loose collection of individuals.',
      [
        'States a confidence level for "organized service vs. individual brokerage," with the 80/20 revenue split and multiple separately-charged affiliates as the basis',
        'Explicitly separates Khoroshev\'s alleged administrator/developer role from the affiliates\' deployment role — conflating them is a real error to avoid',
        'Names what would strengthen or weaken this specific claim (e.g., evidence of Khoroshev personally directing specific attacks would strengthen; evidence the affiliates operated with total technical independence would weaken)',
      ],
      CATEGORY_PROMPT_POINTS,
      refNote('Moderate-to-high confidence that LockBit operated as an organized ransomware-as-a-service enterprise rather than an individual\'s freelance activity, based on the structured 80/20 revenue split and at least seven separately identified and charged participants. Khoroshev is alleged to be the platform\'s creator, developer, and primary operator — a distinct role from the affiliates who used his tooling to attack individual victims. This category supports an enterprise-level charge; it does not by itself prove Khoroshev personally directed any single attack.'),
    ),
  },
  {
    name: 'Category 4 — Real-world identity',
    checks: [
      mc('Which countries jointly announced sanctions against Khoroshev?', ['U.S., UK, and Australia', 'U.S. only', 'UK and Canada', 'U.S. and Russia'], 0, 'Category 4'),
      mc('What is Khoroshev\'s custody status as of the indictment\'s unsealing?', ['Convicted and imprisoned', 'Arrested and awaiting trial', 'Not arrested; remains at large', 'Extradited to the U.S.'], 2, 'Category 4'),
      blank('Khoroshev is a resident of ______, Russia.', ['Voronezh'], 'Category 4'),
    ],
    prompt: prompt(
      'Category 4 — Draft the attribution statement for the real-name-to-persona link specifically, and separately state what this category does NOT include (the reward and remaining-at-large status).',
      [
        'Names a confidence level for the real-name attribution specifically — reasoning about what a joint indictment-plus-sanctions action from three governments implies about the underlying confidence, not just restating that a name was announced',
        'Explicitly notes that the public record does not disclose the specific evidence (financial records, OPSEC failures, technical forensics) that ties Khoroshev personally to the persona — a real, named gap',
        'Does not conflate "indicted" with "convicted" or "in custody"',
      ],
      CATEGORY_PROMPT_POINTS,
      refNote('High confidence that Khoroshev is LockBitSupp, based on a coordinated, simultaneous action by three governments (U.S. indictment, and sanctions from U.S. Treasury, UK FCDO, and Australian DFAT) — that level of coordinated commitment is not undertaken on weak attribution. Documented gap: the public record does not disclose the specific evidence (financial tracing, technical forensics, OPSEC failures) underlying this conclusion. Separately: Khoroshev has not been arrested or convicted; the $10 million reward reflects that he remains at large, which is a custody fact, not an attribution fact.'),
    ),
  },
  {
    name: 'Category 5 — Foreign partner threads',
    checks: [
      mc('Which U.S. agency\'s sanctions arm joined the joint action?', ['Department of Commerce', 'Treasury\'s Office of Foreign Assets Control (OFAC)', 'Department of Labor', 'The SEC'], 1, 'Category 5'),
      mc('Why might three countries\' agreement NOT represent fully independent confirmation?', ['They didn\'t actually agree', 'They may substantially share the same underlying seized material from one joint operation', 'International law forbids independent investigations', 'There\'s no reason to doubt it'], 1, 'Category 5'),
      blank('The UK counterpart body that joined the sanctions action was the ______.', ['Foreign, Commonwealth and Development Office', 'FCDO', 'Foreign, Commonwealth and Development Office (FCDO)'], 'Category 5'),
    ],
    prompt: prompt(
      'Category 5 — Draft the attribution statement for what the multi-country coordination itself contributes to confidence — separate from any single piece of technical evidence.',
      [
        'Recognizes that independently-arrived-at agreement across three countries\' governments is itself a form of corroboration, distinct from and additive to the technical evidence in the other categories',
        'Notes the specific mechanism (NCA-led operation, DOJ/FBI cooperation, joint OFAC/FCDO/DFAT sanctions) rather than a vague "international cooperation happened"',
        'Avoids overclaiming: three governments agreeing doesn\'t mean they all had access to the same underlying evidence — it could reflect shared analysis of the same NCA-seized material rather than fully independent confirmation',
      ],
      CATEGORY_PROMPT_POINTS,
      refNote('Moderate-to-high confidence that this attribution reflects genuine multi-government corroboration, based on the NCA-led seizure, DOJ/FBI cooperation, and simultaneous joint sanctions from three countries\' treasury/foreign-affairs bodies. Documented caveat: shared participation in one joint operation (Cronos) means these countries may be largely relying on the same underlying seized material rather than fully independent evidence bases — three governments agreeing is meaningfully stronger than one, but it is not the same as three fully independent investigations reaching the same conclusion.'),
    ),
  },
];

/* ── Final calibrated statements ── */
const FINAL_STATEMENT_KEY_ELEMENTS = [
  'Uses the lecture\'s exact format: states a confidence level, a claim, a basis, and a documented gap',
  'The stated confidence level is genuinely supported by the basis given, at the level named (high/moderate/low as assigned)',
  'Synthesizes across categories rather than reusing a single category\'s model answer verbatim',
];
const FINAL_STATEMENTS = [
  prompt(
    'Final calibrated statements — HIGH confidence. Using the lecture\'s exact format ("[Confidence] confidence that [claim] based on [basis], with documented gaps in [gap].") write your squad\'s final HIGH-confidence calibrated statement for this case. Synthesize across categories — do not reuse a single category\'s model answer verbatim.',
    FINAL_STATEMENT_KEY_ELEMENTS,
    FINAL_STATEMENT_POINTS,
    refNote('Example only, not to be copied: High confidence that Khoroshev is LockBitSupp, based on coordinated indictment and sanctions from three governments acting simultaneously — a level of joint commitment inconsistent with weak attribution, with documented gaps in the specific technical/financial evidence underlying that conclusion, which is not public.'),
  ),
  prompt(
    'Final calibrated statements — MODERATE confidence. Using the same format, write your squad\'s final MODERATE-confidence calibrated statement for this case, synthesizing across categories.',
    FINAL_STATEMENT_KEY_ELEMENTS,
    FINAL_STATEMENT_POINTS,
    refNote('Example only, not to be copied: Moderate-to-high confidence that LockBit functioned as an organized enterprise rather than individual freelance activity, based on the 80/20 affiliate revenue structure and at least seven separately charged participants, with documented gaps in exactly how much operational control Khoroshev personally exercised over any single affiliate\'s attacks.'),
  ),
  prompt(
    'Final calibrated statements — LOW confidence. Using the same format, write your squad\'s final LOW-confidence calibrated statement for this case, synthesizing across categories.',
    FINAL_STATEMENT_KEY_ELEMENTS,
    FINAL_STATEMENT_POINTS,
    refNote('Example only, not to be copied: Low confidence in the precise boundary between Khoroshev\'s role and his affiliates\' independent technical decisions, based on fragmentary public information about internal LockBit operations, with the gap being that this distinction likely matters more to sentencing and individual charges than to the core attribution question.'),
  ),
];

/* ── Squad synthesis ── */
const SYNTHESIS = [
  prompt(
    'Squad synthesis — Which category was your squad least confident writing, and why — is that a gap in the public record, or a gap in your squad\'s reasoning?',
    [
      'Names a specific category, not a vague "all of them"',
      'Distinguishes whether the difficulty was a genuine gap in the public record versus a gap in the squad\'s own reasoning/discussion',
    ],
    SYNTHESIS_POINTS,
  ),
  prompt(
    'Squad synthesis — Identify the one piece of information in this packet that is a public statement or announcement, not itself evidence. What\'s the difference, and why does it matter for how you\'d use it in a briefing?',
    [
      'Identifies a specific public statement/announcement (e.g. U.S. Attorney Sellinger\'s quote, FBI Director Wray\'s statement, or the State Department reward announcement) as distinct from evidence',
      'Explains the statement-versus-evidence distinction in its own terms',
      'Explains why the distinction matters for how it would be used in an actual briefing',
    ],
    SYNTHESIS_POINTS,
  ),
  prompt(
    'Squad synthesis — If you were briefing an AUSA using only what\'s in this packet, what would you tell them still needs to happen before any of this could support a U.S. charge?',
    [
      'Surfaces the international-sharing-mechanism point: UK-seized material needs a lawful channel (MLAT or direct cooperation) before it supports a U.S. charge',
      'Recognizes the gap between an indictment/public case and courtroom-ready evidence',
      'Gives a concrete next step, not a vague "more investigation is needed"',
    ],
    SYNTHESIS_POINTS,
  ),
];

function buildQuestions() {
  const questions = [...FRAMEWORK_CHECKS];
  for (const category of CATEGORIES) {
    questions.push(...category.checks, category.prompt);
  }
  questions.push(...FINAL_STATEMENTS, ...SYNTHESIS);
  return questions;
}

module.exports = {
  TITLE: 'Day 4 AM Workshop: Attribution Synthesis',
  EXISTING_ID: '67797f8c-e0a2-4e04-9a2f-1dc911ca7caa',
  LAUNCH_BRIEFING,
  DESCRIPTION,
  FRAMEWORK_CHECKS,
  CATEGORIES,
  FINAL_STATEMENTS,
  SYNTHESIS,
  buildQuestions,
};
