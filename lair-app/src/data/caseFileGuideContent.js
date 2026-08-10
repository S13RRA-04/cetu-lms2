/*
  Case File — in-app rulebook content for both audiences. Adapted from the
  project's Player Rulebook and Facilitator & Case Author's Guide, plus
  practical notes specific to this digital build (room codes, click-to-roll
  dice, the Pending Injects panel, etc.) that don't exist in the physical
  game's paper rules.
*/

export const PLAYER_GUIDE_SECTIONS = [
  {
    heading: 'Objective',
    paragraphs: [
      'Your team is building a federal case from the ground up. Investigate evidence, develop it through ' +
      'the legal process, and grow your Case Strength from 0 to 30. Along the way you\'ll present to a ' +
      'Grand Jury to secure an indictment — after that, the defense pushes back, and you have to hold ' +
      'the case together until you reach 30.',
    ],
  },
  {
    heading: 'The Board, In Brief',
    paragraphs: [
      'The Case Strength Track runs 0–30 across five bands: Intake, Relevance, Specific & Articulable ' +
      'Facts, Probable Cause, and Beyond a Reasonable Doubt. Six Evidence Decks (Interviews, Documents, ' +
      'Digital, Physical, Financial, Intelligence) each hold cards for a Resource Token of that same ' +
      'category. The Play Area is where resolved evidence collects. The Pending Returns Queue holds ' +
      'evidence you\'ve sent through the legal process, counting down until it comes back.',
    ],
  },
  {
    heading: 'Investigating',
    paragraphs: [
      'Spend a Resource Token from a category to Investigate it. Roll a d20 (modified by Command ' +
      'Pressure) against this table:',
    ],
    list: [
      'Natural 20 (Critical Success): pressure ignored, +3 Case Strength, a bonus card via the d6, a Positive Inject, and your token back.',
      '16–19 (Opportunity): +1 Case Strength, a Positive Inject.',
      '11–15 (Success): +1 Case Strength.',
      "6–10 (Partial Success): +1 Case Strength, but the card comes from a category picked by the d6, not the one you armed.",
      '2–5 (Complication): +1 Case Strength, 1 Negative Inject.',
      'Natural 1 (Major Complication): +1 Case Strength, 2 Negative Injects.',
    ],
  },
  {
    heading: 'Developing Evidence & the Legal Instrument Ladder',
    paragraphs: [
      'Some evidence needs to go through formal legal process to deepen — Subpoena, then Court Order, ' +
      'then Search Warrant. Spending a token to Develop a card sends it into the Pending Returns Queue at ' +
      'that instrument\'s delay (in rounds); it resolves automatically when the countdown hits zero, adding ' +
      'to Case Strength and updating that card\'s standing. Not every category routes through the ladder — ' +
      'your facilitator will tell you which ones matter for this case.',
    ],
  },
  {
    heading: 'Positive & Negative Injects',
    paragraphs: [
      'Positive Injects come in four flavors: Momentum (recover a token), Relief (ease Command Pressure), ' +
      'Lead (a free bonus card), and Expedite (push a queued card closer to resolving). Negative Injects: ' +
      'Delay (push a queued card back), Escalation (raise Command Pressure), Setback (lose a token), and ' +
      'Suppression (an already-resolved card loses some of its value). None of these are just flavor text ' +
      'in this digital version — each one has a real, immediate effect on the board.',
    ],
  },
  {
    heading: 'Command Pressure',
    paragraphs: [
      'Command Pressure runs Green → Yellow → Orange → Red → Black, each level subtracting more from your ' +
      'investigation rolls (a Natural 20 always ignores it). Positive Injects ease it; Negative Injects and ' +
      'a failed Grand Jury presentation can raise it.',
    ],
  },
  {
    heading: 'Consolidate the Case & Professional Judgment',
    paragraphs: [
      'Consolidate the Case recovers a token of your choice, but only a limited number of times per game ' +
      '(8, by default) — it\'s your buffer against bad luck, not a resource to rely on constantly. ' +
      'Professional Judgment can be spent once per game to call for a reroll — save it for a roll that ' +
      'really matters.',
    ],
  },
  {
    heading: 'Grand Jury',
    paragraphs: [
      'When your team believes it has enough, present to the Grand Jury. Your facilitator judges whether ' +
      'your citable facts clear the case\'s threshold — this is a judgment call based on what you\'ve ' +
      'actually uncovered and argued, not just a card count. Success secures indictment and unlocks Defense ' +
      'Counterplay; falling short doesn\'t end the game, but it usually costs you — expect Command Pressure ' +
      'to rise.',
    ],
  },
  {
    heading: 'Defense Counterplay',
    paragraphs: [
      'After indictment, roughly half of your Negative Injects become Defense Counterplay cards instead — ' +
      'the other side pushing back. A central fact backed by two independent evidence categories resists ' +
      'most of these automatically. This is exactly why diversifying your investigation across categories ' +
      'pays off twice: once for the Grand Jury, and again here.',
    ],
  },
  {
    heading: 'Winning & Losing',
    paragraphs: [
      'You win by reaching Case Strength 30 after indictment. You lose if your team runs out of Resource ' +
      'Tokens across every category with no Consolidate uses left to recover — the investigation simply ' +
      'stalls out. Play smart, diversify your evidence, and don\'t burn Professional Judgment early.',
    ],
  },
];

export const INSTRUCTOR_GUIDE_SECTIONS = [
  {
    heading: 'What This Tool Is',
    paragraphs: [
      'Case File is a live, facilitator-run session — you drive every roll and decision from this screen; ' +
      'your players watch a synced, spoiler-free board on their own screens (join code below the case ' +
      'picker). There\'s no grading, no submissions, and nothing is saved once a session ends — click ' +
      '"New Session" any time to reset and pick a different case.',
    ],
  },
  {
    heading: 'Starting a Session',
    paragraphs: [
      'Pick a case from the case picker, read the premise and Initial Complaint aloud to set the scene, ' +
      'then click Start Investigation. A room code appears in the header — give that to your players so ' +
      'they can join from the Case File link in their own sidebar.',
    ],
  },
  {
    heading: 'Running a Round',
    paragraphs: [
      'Click an Evidence Deck to arm that category (it glows), then click the d20 itself to actually roll ' +
      '— nothing happens until you click the die. If the roll draws a bonus card, a d6 appears next to it; ' +
      'click that too to reveal which category the bonus comes from. Any Positive or Negative Inject drawn ' +
      'shows up in the Pending Injects panel below the board — pick a target where needed (a category, a ' +
      'queued card, a resolved card) and click Apply to actually apply its effect, or Dismiss to skip it.',
    ],
    list: [
      'Consolidate on a deck tile recovers one token of that category (limited uses).',
      'Develop → [instrument] on a resolved card in the Play Area sends it through the legal ladder.',
      'Advance Round ticks the Pending Returns Queue down and starts the next round.',
    ],
  },
  {
    heading: 'Judgment Calls You Make',
    paragraphs: [
      'The engine handles token math, dice, and the queue automatically — the following are always yours ' +
      'to call, not the software\'s:',
    ],
    list: [
      'Case-Defining: mark a resolved card Case-Defining (+4 Case Strength) when it\'s a genuine narrative breakthrough, not just to hit a quota — aim for roughly 1-in-4 cards over the course of a case.',
      'Grand Jury: judge whether the team\'s presentation actually clears the case\'s citable-fact threshold, not just whether the number is technically high enough.',
      'Defense Counterplay corroboration: the "Apply" button computes a suggested immunity based on category diversity, but the call is still yours if the narrative doesn\'t support it.',
      'Interviews/Intelligence routing: some categories are marked "facilitator judgment call" in the Case Brief rather than automatically routed through the Legal Instrument Ladder — decide in the moment whether a given lead needs formal process.',
    ],
  },
  {
    heading: 'The Case Brief & Case Notes Panels',
    paragraphs: [
      'Case Brief & Rubric (top of screen) holds the Grand Jury threshold, outcome-tier pacing, and ' +
      'victory/failure conditions for the selected case — read it before you start. Case Notes (below the ' +
      'board) shows the live narrative reveal for each central fact at the team\'s current Case Strength ' +
      'band — read the relevant fact aloud whenever new evidence for it resolves.',
    ],
  },
  {
    heading: 'Ending a Session',
    paragraphs: [
      'The game ends itself automatically on a real win (Case Strength 30 post-indictment) or loss (no ' +
      'tokens left anywhere). You can also click Declare Win/Loss directly if you need to end a session ' +
      'early for time. "New Session" resets everything and returns you to the case picker.',
    ],
  },
  {
    heading: 'Authoring a New Case',
    paragraphs: [
      'Every case follows the same shape: a premise, 4–6 central facts, a themed pool of evidence cards ' +
      'drawn from the shared Evidence Card Reference, a reveal for each fact at each Case Strength band, ' +
      'Case-Defining Developments at roughly 1-in-4 cards, a Grand Jury rubric, and 8–12 Defense ' +
      'Counterplay cards. New cases are added as data files — ask whoever maintains this course to add one ' +
      'if you have a scenario in mind.',
    ],
  },
];
