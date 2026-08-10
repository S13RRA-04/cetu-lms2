/*
  Case File — "Learn to Play" tour script, consumed by useCaseFileTour.js.

  Each beat spotlights one `data-tour="..."` element on the real board and
  is either:
    - 'narrate': pure copy, advanced by the tour's own Next/Back buttons.
      Carries its own full `state` snapshot (and optionally `lastResult`,
      e.g. to pop open the real Pending Injects panel via the board's
      existing effect that watches lastResult.result.injects).
    - 'action': spotlights a real control that calls sendAction() (the d20,
      a Develop button, Advance Round, an inject's Apply button). Whatever
      the real click handler sends is answered with this beat's canned
      `result`/`stateAfter` by useCaseFileTour, then the tour auto-advances.

  State snapshots follow the server's publicState() shape exactly
  (backend/src/realtime/caseFileCoordinator.js:83-106) so the real board
  JSX renders them with zero changes. Numbers are illustrative, not a real
  simulation — 2 tokens per category matches live play's starting amount,
  giving the demo room to show Consolidate / Develop / a second roll
  without needing awkward "recovered a token off-screen" hand-waving.

  Uses The Meridian Consulting Skim's real card names so the demo Play Area
  reads like an actual case, not placeholder text.
*/

import { CATEGORIES } from './caseFileTheme.js';
import { evidenceCards, defenseCounterplayCards } from './cases/meridianSkim.js';
import { POSITIVE_INJECTS, NEGATIVE_INJECTS } from './caseFileInjectDecks.js';

function freshDeckCounts() {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  evidenceCards.forEach((c) => { counts[c.category] += 1; });
  return counts;
}
function freshTokens(n) {
  return Object.fromEntries(CATEGORIES.map((c) => [c, n]));
}

const BASE_STATE = {
  round: 1,
  caseStrength: 0,
  commandPressure: 'green',
  consolidateRemaining: 8,
  consolidateCap: 8,
  consolidateUsedThisRound: false,
  professionalJudgmentUsed: false,
  tokens: freshTokens(2),
  resolvedEvidence: [],
  pendingReturns: [],
  indicted: false,
  gameOver: false,
  outcome: null,
  deckCounts: freshDeckCounts(),
  positiveInjectRemaining: POSITIVE_INJECTS.length,
  negativeInjectRemaining: NEGATIVE_INJECTS.length,
  defenseCounterplayRemaining: defenseCounterplayCards.length,
  playerRoster: [],
  activePlayerId: null,
};

// ---------------------------------------------------------------------------
// Facilitator tour
// ---------------------------------------------------------------------------

let cur = BASE_STATE;
const step = (patch) => { cur = { ...cur, ...patch }; return cur; };
const withTokens = (patch) => step({ tokens: { ...cur.tokens, ...patch } });
const withDeckCounts = (patch) => step({ deckCounts: { ...cur.deckCounts, ...patch } });

export const FACILITATOR_TOUR_BEATS = [
  {
    target: 'case-picker', type: 'narrate', started: false, state: (cur = BASE_STATE),
    title: 'Choosing a Case',
    body: "Every session starts here. Each case is a self-contained mystery — pick one, then read its premise aloud to set the scene for your players.",
  },
  {
    target: 'premise', type: 'narrate', started: false, state: cur,
    title: 'Premise & Initial Complaint',
    body: "The Premise is your setup — read it to the table. The Initial Complaint is the specific tip or referral that opens the investigation. Neither one is evidence yet; it's just the hook.",
  },
  {
    target: 'start-investigation', type: 'narrate', started: false, state: cur,
    title: 'Starting the Session',
    body: 'Click "Start Investigation" and the engine deals out all six Evidence Decks and both Inject Decks behind the scenes. A room code appears next — that\'s what your players use to join.',
  },
  {
    target: 'room-code', type: 'narrate', started: true, state: cur,
    title: 'The Room Code',
    body: 'Give this code to your players. They enter it on their own screen to see a synced, read-only version of this board — they never see card names, only category counts, so the mystery stays yours to reveal.',
  },
  {
    target: 'case-strength-track', type: 'narrate', started: true, state: cur,
    title: 'The Case Strength Track',
    body: 'The whole game is this bar: 0 to 30, across five bands (Intake → Beyond a Reasonable Doubt). Every resolved piece of evidence nudges it forward. Reaching 30 after indictment is how the team wins.',
  },
  {
    target: 'decks', type: 'narrate', started: true, state: cur,
    title: 'Evidence Decks & Tokens',
    body: 'Six categories, each with its own deck and its own pool of Resource Tokens. Spending a token on a category lets the team Investigate it — click a deck to arm it, then roll. Let\'s try it: this Documents deck is about to light up.',
  },
  {
    target: 'dice', type: 'action', started: true, autoArm: 'documents',
    state: (() => cur)(),
    title: 'Rolling the d20',
    body: 'Documents is armed — click the glowing d20 to roll. The result decides what you draw and whether Case Strength moves.',
    result: {
      roll: { nat: 8, modified: 8, band: 'partial_success', categoryDieRoll: null, categoryDiePending: true },
      drawn: [],
      injects: [],
    },
    stateAfter: (() => {
      withTokens({ documents: cur.tokens.documents - 1 });
      return cur;
    })(),
  },
  {
    target: 'dice', type: 'narrate', started: true, state: cur,
    lastResult: { action: 'investigate', requestId: 9000, result: { roll: { nat: 8, modified: 8, band: 'partial_success', categoryDieRoll: null, categoryDiePending: true }, drawn: [], injects: [] } },
    title: 'Reading the Result',
    body: "d20 = 8, a Partial Success (the 6–10 band): nothing is drawn yet. The only card this roll gets comes from a Category Die roll — until that actually happens, not even the category is decided, let alone the card. Higher rolls do more — a natural 20 ignores Command Pressure entirely, nets a flat +3 for your original pick, and still owes its own Category Die roll for a bonus card on top, plus a Positive Inject.",
  },
  {
    target: 'dice', type: 'action', started: true, state: cur,
    lastResult: { action: 'investigate', requestId: 9000, result: { roll: { nat: 8, modified: 8, band: 'partial_success', categoryDieRoll: null, categoryDiePending: true }, drawn: [], injects: [] } },
    title: 'The Category Die',
    body: 'A d6 has appeared next to the d20 — click it to actually roll. This is the real reveal: nothing about the bonus card, not even which category it comes from, exists until this roll happens.',
    result: { categoryDieRoll: 5, drawn: [{ cardId: 'fin-02', category: 'financial' }] },
    stateAfter: (() => {
      withDeckCounts({ financial: cur.deckCounts.financial - 1 });
      step({
        caseStrength: cur.caseStrength + 1,
        resolvedEvidence: [
          ...cur.resolvedEvidence,
          { cardId: 'fin-02', category: 'financial', tier: 'discovered', caseDefining: false, evidenceValue: 1 },
        ],
      });
      return cur;
    })(),
  },
  {
    target: 'play-area', type: 'narrate', started: true,
    state: step({
      caseStrength: cur.caseStrength + 4,
      resolvedEvidence: cur.resolvedEvidence.map((e) => (e.cardId === 'fin-02' ? { ...e, caseDefining: true } : e)),
    }),
    title: 'The Play Area & Case-Defining Evidence',
    body: 'Resolved cards land here face-down, then flip to reveal their name and flavor text. Marking a card Case-Defining (★) is a judgment call worth +4 Case Strength — save it for genuine narrative breakthroughs, roughly 1-in-4 cards over a case, not a quota to hit every round.',
  },
  {
    target: 'play-area', type: 'action', started: true, state: cur,
    title: 'Developing Through the Legal Ladder',
    body: "Some evidence needs formal process to deepen. Click \"→ Subpoena\" on the Suspicious Activity Report card — Financial is routed through the ladder, and Case Strength 5 already clears a Subpoena's minimum of 5.",
    result: { roll: { nat: 14, modified: 14, band: 'success' } },
    stateAfter: (() => {
      withTokens({ financial: cur.tokens.financial - 1 });
      step({ pendingReturns: [...cur.pendingReturns, { cardId: 'fin-02', category: 'financial', targetTier: 'subpoena', roundsRemaining: 1, startingRounds: 1 }] });
      return cur;
    })(),
  },
  {
    target: 'queue', type: 'narrate', started: true, state: cur,
    title: 'The Pending Returns Queue',
    body: "Developed evidence sits here counting down — 1 round for a Subpoena, 2 for a Court Order, 3 for a Search Warrant. It resolves automatically when the countdown hits zero. \"Delay\" on a slot pushes it back a round if you need to.",
  },
  {
    target: 'pending-injects', type: 'action', started: true,
    state: step({ positiveInjectRemaining: cur.positiveInjectRemaining - 1 }),
    lastResult: { action: 'investigate', requestId: 9001, result: { roll: { nat: 16, modified: 16, band: 'opportunity' }, drawn: [], injects: [{ type: 'positive', cardId: 'pos-3' }] } },
    title: 'Positive & Negative Injects',
    body: 'A 16+ roll draws a Positive Inject — here, "Borrowed Equipment" (Momentum: recover a token). It shows up below as a Pending Inject; pick a category and click Apply to actually apply its effect, or Dismiss to skip it. None of these are flavor text — each one has a real, immediate effect on the board.',
    result: {},
    stateAfter: (() => { withTokens({ documents: cur.tokens.documents + 1 }); return cur; })(),
  },
  {
    target: 'command-panel', type: 'narrate', started: true, state: cur,
    title: 'Command Pressure',
    body: 'Runs Green → Yellow → Orange → Red → Black, each level subtracting more from investigation rolls (a natural 20 always ignores it). Positive Injects ease it; Negative Injects and a failed Grand Jury presentation can raise it. Click a cell to set it directly if you need to adjudicate a special situation.',
  },
  {
    target: 'command-panel', type: 'narrate', started: true, state: cur,
    title: 'Consolidate, Professional Judgment & Convert',
    body: 'Consolidate the Case stands in for the round\'s action — no roll, recover 1 token of your choice, but Command Pressure rises a level and it\'s usable once per round (on top of an 8-uses-per-game cap). Professional Judgment forces a reroll, once per game. Convert Tokens trades 2 tokens for 1 in another category — the 2 can be from the same over-invested lane, or one each from two different lanes.',
  },
  {
    target: 'advance-round', type: 'action', started: true, state: cur,
    title: 'Advancing the Round',
    body: 'Click "Advance Round →" to tick the Pending Returns Queue down and start the next round. Watch the Suspicious Activity Report — its countdown is about to hit zero.',
    result: {},
    stateAfter: (() => {
      step({
        round: cur.round + 1,
        pendingReturns: [],
        caseStrength: cur.caseStrength + 2,
        resolvedEvidence: [...cur.resolvedEvidence, { cardId: 'fin-02', category: 'financial', tier: 'subpoena', caseDefining: true, evidenceValue: 1 }],
      });
      return cur;
    })(),
  },
  {
    target: 'case-notes', type: 'narrate', started: true, state: cur,
    title: 'Case Notes',
    body: "Each central fact has narrative reveal text keyed to the team's current Case Strength band. Read the relevant fact aloud whenever new evidence for it resolves — this is how the story unfolds at the table, not just a number going up.",
  },
  {
    target: 'grand-jury', type: 'narrate', started: true, state: cur,
    title: 'Grand Jury Presentation',
    body: "This case needs 3 of 5 central facts citable with evidence. Right now only 1 is (Shell Company Layering) — below threshold. Judging whether a presentation actually clears the bar is yours to call, not just a card count. Let's fast-forward past a successful presentation.",
  },
  {
    target: 'defense-counterplay', type: 'narrate', started: true,
    state: step({ indicted: true, caseStrength: 16 }),
    title: 'Defense Counterplay',
    body: "After indictment, roughly half of drawn Negative Injects become Defense Counterplay cards instead. A central fact backed by two independent evidence categories resists most of these automatically — e.g. Motion to Suppress is immune if Phantom Staffing is corroborated by two categories. Diversifying pays off twice.",
  },
  {
    target: 'declare-outcome', type: 'narrate', started: true, state: cur,
    title: 'Declaring an Outcome',
    body: 'The game ends itself on a real win (Case Strength 30 post-indictment) or loss (no tokens left anywhere, Consolidate exhausted). Declare Win/Loss here if you need to end a session early for time.',
  },
  {
    target: 'case-strength-track', type: 'narrate', started: true,
    state: step({ caseStrength: 30, gameOver: true, outcome: 'win' }),
    title: "You're Ready",
    body: "That's every mechanic — arming and rolling, developing through the ladder, injects, pressure, and the win condition itself. Click Finish to return to a real session.",
  },
];

// ---------------------------------------------------------------------------
// Player tour
// ---------------------------------------------------------------------------

cur = BASE_STATE;

export const PLAYER_TOUR_BEATS = [
  {
    target: 'board', type: 'narrate', state: (cur = BASE_STATE),
    title: 'Welcome to the Board',
    body: "This screen is a shared, read-only view — your facilitator drives every roll and decision. It updates live as your team investigates, so watch it together and talk strategy.",
  },
  {
    target: 'case-strength-track', type: 'narrate',
    state: step({ caseStrength: 9 }),
    title: 'The Case Strength Track',
    body: 'The whole game is this bar: 0 to 30 across five bands. Every piece of resolved evidence nudges it forward — reaching 30 after your team secures an indictment is how you win.',
  },
  {
    target: 'decks', type: 'narrate',
    state: (() => { withTokens({ documents: 1 }); withDeckCounts({ documents: 5, financial: 5 }); return cur; })(),
    title: 'Evidence Decks',
    body: "Six categories, each with its own Resource Tokens — the dots show what your team has left to spend. You'll never see card names here, only counts: your facilitator controls the reveal, on purpose.",
  },
  {
    target: 'play-area', type: 'narrate',
    state: step({
      resolvedEvidence: [
        { cardId: 'doc-02', category: 'documents', tier: 'discovered', caseDefining: true, evidenceValue: 1 },
        { cardId: 'fin-02', category: 'financial', tier: 'discovered', caseDefining: false, evidenceValue: 1 },
      ],
    }),
    title: 'The Play Area',
    body: "Resolved evidence collects here, tallied by category. It's the physical record of what your team has actually uncovered so far.",
  },
  {
    target: 'queue', type: 'narrate',
    state: step({ pendingReturns: [{ cardId: 'doc-02', category: 'documents', targetTier: 'subpoena', roundsRemaining: 1, startingRounds: 1 }] }),
    title: 'Pending Returns Queue',
    body: 'Evidence sent through formal legal process — Subpoena, Court Order, Search Warrant — counts down here before it resolves and strengthens the case.',
  },
  {
    target: 'status', type: 'narrate',
    state: step({ commandPressure: 'yellow' }),
    title: 'Command Pressure',
    body: "Runs Green through Black. As it rises, your team's investigation rolls get harder — a real cost of complications piling up. Positive outcomes ease it back down.",
  },
  {
    target: 'turns', type: 'narrate',
    state: step({ round: 4 }),
    title: 'Rounds',
    body: "Tracks pacing across the session. There's no fixed end — the investigation runs until your team wins, loses, or your facilitator calls time.",
  },
  {
    target: 'board', type: 'narrate',
    state: step({ caseStrength: 30, gameOver: true, outcome: 'win' }),
    title: "That's the Board",
    body: 'Case Strength at 30 after indictment means your team won. Sit back, watch it update, and talk through what to investigate next — the board does the rest. Click Finish to return.',
  },
];
