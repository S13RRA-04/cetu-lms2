'use strict';
/**
 * Definitions for PACKET HEIST v2 Drop 3's role assessments: 7 individual
 * role assessments plus 1 cohort-wide Squad Synthesis Quiz — transcribed
 * from "PACT Challenges"/PACT_Day3_Role_Assignments_Student.docx and its
 * _InstructorKey.docx counterpart.
 *
 * Unlike Day 1/Day 2 (day1VictimRoleSpecs.js / day2VictimRoleSpecs.js),
 * Drop 3's evidence ("The Broker" — the Black Harbor marketplace listings,
 * the CyberDyne appliance, the crypto trace, RestonIT's banking return) is
 * cohort-wide, not per-victim: every squad works the same single case file
 * today. So there is exactly ONE set of 7 role assessments (not 4), each
 * victim_name: null, plus one victim_name: null squad quiz — same shape
 * Day 2's Cross-Squad Sync used for its cohort-wide item.
 *
 * Role codes/labels/roleFilters are identical to Day 1/Day 2's
 * (SA/IA/DA/FoA/SOS/TFO/CS) — reused verbatim so role_filters continue to
 * match backend/src/config/constants.js's PROFESSIONAL_ROLES.
 *
 * Run: node backend/scripts/seed-pact-day3-role-assignments.js
 */
const { v4: uuidv4 } = require('uuid');

const SCENARIO = 'packet-heist-v2';
const DROP = 3;
const TITLE_PREFIX = 'PACKET HEIST v2 — Drop 3:';

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
    task: `Own the probable-cause package end to end and decide go/no-go for the afternoon search operation.`,
    mc: [
      mc('What operation obtained the Black Harbor marketplace material?', ['A search warrant executed on a suspect\'s home', 'An authorized online covert employee (OCE) collection', 'A public web crawl', 'A confidential human source inside RestonIT'], 1, 'the Black Harbor collection cover'),
      mc('How many access listings by seller BRKR_AL match the four victims\' characteristics?', ['Two', 'Three', 'Four', 'Five'], 2, 'the Black Harbor listings (BRKR_AL)'),
      mc('Does any Black Harbor file name the four victims directly?', ['Yes, all four are named explicitly', 'No — listings are described by characteristics only, never named', 'Only CyberDyne is named', 'Only the hospital is named'], 1, 'the Black Harbor listings (BRKR_AL)'),
    ],
    blanks: [
      blank('The appliance\'s discovery record attributes the original install to NOC technician ______, but draws no conclusion about intent.', ['D. Voss'], 'the appliance provenance record'),
      blank('Your probable-cause package must be ready before the ______ brief, since it predicates the afternoon\'s field operation.', ['pre-operation'], 'today\'s Command Post'),
    ],
    shortAnswer: prompt('State your go/no-go recommendation for this afternoon\'s search and the single strongest element supporting it.', ['States a clear go/no-go recommendation', 'Cites a specific, well-chosen supporting element — e.g. the appliance\'s tool-signature match to the account-creation identity, or the marketplace listings\' characteristic match to all four victims']),
  },
  {
    code: 'IA', label: 'Intelligence Analyst', roleFilter: 'intelligence_analyst',
    task: `Correlate the Black Harbor listings' described characteristics to the four victims' known compromise profiles.`,
    mc: [
      mc('The BRKR_AL listing described as a "regional hospital AD service account" characteristic-matches which victim?', ['CyberDyne', 'Pixel Play Arcade', 'Dogwood Hotel', 'Redstone Memorial Hospital'], 3, 'the Black Harbor listings (BRKR_AL)'),
      mc('The listing described as "hospitality O365 global admin" matches which victim?', ['Dogwood Hotel', 'Redstone Memorial', 'CyberDyne', 'Pixel Play'], 0, 'the Black Harbor listings (BRKR_AL)'),
      mc('The listing described as "SMB entertainment local-admin/RDP" matches which victim?', ['CyberDyne', 'Pixel Play Arcade', 'Dogwood', 'Redstone Memorial'], 1, 'the Black Harbor listings (BRKR_AL)'),
    ],
    blanks: [
      blank('The remaining listing, "DC/colo management-plane" access, matches ______.', ['CyberDyne Data Center', 'CyberDyne'], 'the Black Harbor listings (BRKR_AL)'),
      blank('The captured BRKR_AL/BRKR_RU messages show the timing sequence as provision → ______ → intrusion.', ['sale'], 'the Black Harbor transaction messages'),
    ],
    shortAnswer: prompt('State your confidence level (low/medium/high) that the four BRKR_AL listings correspond to the four victims, and justify it using the characteristic match alone (not the account-creation dates).', ['States a confidence level, "high" being well-supported', 'Justifies it via the four distinct, non-overlapping characteristic matches', 'Acknowledges this is inference from characteristics, not a stated fact in any file']),
  },
  {
    code: 'DA', label: 'Data Analyst', roleFilter: 'operational_support_da',
    task: `Parse the raw crypto transaction export and quantify the fund flow across wallets w1, w2, w3, and the exchange.`,
    mc: [
      mc('What does wallet w1 represent in the crypto cluster analysis?', ['The buyer\'s payment wallet', 'The seller\'s proceeds wallet', 'The ransom wallet from Pixel Play\'s demand', 'RestonIT\'s business account'], 2, 'the crypto cluster analysis'),
      mc('What does the cluster analysis show about wallets w2 and w3?', ['No relationship', 'w2 (buyer) pays w3 (seller)', 'w3 pays w2', 'They are the same wallet'], 1, 'the crypto cluster analysis'),
      mc('Where do funds from wallet w3 ultimately flow, per the cluster analysis?', ['Back to wallet w1', 'To an offline cold wallet', 'To the CoinBridge exchange', 'To a second ransomware wallet'], 2, 'the crypto cluster analysis'),
    ],
    blanks: [
      blank('The blockchain analytics platform used clusters and traces flows, but does ______ attribute identity on its own.', ['not'], 'the crypto cluster analysis'),
    ],
    dualBlankPrompt: prompt('State the flow direction you can support today, using wallet labels only: ______ → ______ → ______.', ['w2', 'w3', 'CoinBridge'], BLANK_POINTS),
    shortAnswer: prompt('Quantify, in your own words, what today\'s crypto analysis adds to the case that yesterday\'s wallet-correlation (shared wallet for VeilStream and the lookalike domain) did not.', ['Notes today\'s analysis shows an actual fund flow between buyer and seller wallets to a named exchange', 'Distinguishes this financial link from yesterday\'s shared-payment-method correlation']),
  },
  {
    code: 'FoA', label: 'Forensic Accountant', roleFilter: 'forensic_accountant',
    task: `Review RestonIT's business banking return and transaction ledger for income inconsistent with a legitimate MSP.`,
    mc: [
      mc('What does RestonIT\'s banking return show, beyond legitimate MSP client payments?', ['Nothing unusual', 'Recurring crypto-exchange inbound deposits and unusually large owner draws', 'A large bank loan', 'Frequent overdraft fees only'], 1, 'the RestonIT business banking return'),
      mc('What does the transaction ledger confirm about RestonIT\'s client base?', ['No client payments on record', 'It includes payments from all four victim businesses, corroborating the vendor tie', 'Payments from only one victim', 'RestonIT paying the victims'], 1, 'the RestonIT bank transactions ledger'),
      mc('What personal-finance question does this return leave open for Thursday?', ['Whether Reston has a criminal record', 'Whether his personal spending, not just the business\'s, is inconsistent with income', 'Whether he owns a car', 'Whether he has a mortgage'], 1, 'the RestonIT business banking return'),
    ],
    blanks: [
      blank('The banking return shows deposits linked to a ______ exchange, the same one named in the crypto cluster analysis.', ['CoinBridge'], 'the RestonIT business banking return'),
      blank('Reston\'s owner draws from the business account are described as unusually ______ relative to stated MSP income.', ['large'], 'the RestonIT business banking return'),
    ],
    shortAnswer: prompt('Based on the business banking return alone, describe the financial inconsistency you\'d want to raise in today\'s probable-cause package.', ['Describes the mismatch between legitimate small-MSP income and the presence of crypto-exchange deposits plus outsized draws', 'Frames it as a lifestyle/discrepancy indicator, not proof by itself']),
  },
  {
    code: 'SOS', label: 'Staff Operations/Tactical Specialist', roleFilter: 'operational_support_sos',
    task: `Coordinate the afternoon field search operation — review the command post's search-mechanics briefing and confirm role assignments.`,
    mc: [
      mc('What two locations does today\'s search operation cover?', ['Two RestonIT client sites', 'RestonIT LLC\'s business office and Alex Reston\'s residence', 'Only the RestonIT office', 'A storage unit and the RestonIT office'], 1, 'today\'s Command Post'),
      mc('What must happen before the search operation can proceed?', ['Nothing, it\'s already authorized', 'A probable-cause package sufficient to support it must be completed', 'Only a verbal briefing', 'The Friday moot court'], 1, 'today\'s Command Post'),
      mc('What is a Staff Operations/Tactical Specialist\'s core responsibility heading into a field operation like this?', ['Interviewing the subject', 'Coordinating logistics, safety planning, and role assignments for the operation', 'Drafting the charging document', 'Performing digital forensics'], 1, 'today\'s Command Post'),
    ],
    blanks: [
      blank('The search operation is scheduled for this ______, following the morning\'s probable-cause development.', ['afternoon'], 'today\'s Command Post'),
      blank('Before departure, your squad should confirm each member\'s ______ for the operation.', ['role assignment'], 'today\'s Command Post'),
    ],
    shortAnswer: prompt('List the operational/safety considerations your squad should confirm before departing for today\'s search.', ['Confirming roles', 'A safety briefing', 'Evidence documentation supplies/procedure', 'A communication plan with the Command Post']),
  },
  {
    code: 'TFO', label: 'Task Force Officer', roleFilter: 'task_force_officer',
    task: `Maintain custody of the appliance-forensics production and confirm no local-agency conflict before today's search.`,
    mc: [
      mc('Where was the concealed network appliance physically found?', ['In CyberDyne\'s parking garage', 'Concealed in Rack C3', 'In Marcus Iyer\'s office', 'At RestonIT\'s office'], 1, 'the appliance provenance record'),
      mc('Who does the appliance\'s access-history review list as having reach to that rack/segment?', ['Only D. Voss', 'Voss and the MSP engagement (RestonIT) — no conclusion drawn', 'Only Marcus Iyer', 'An unnamed contractor'], 1, 'the appliance provenance record'),
      mc('As TFO, before today\'s search, what should you confirm with any local agency with prior contact with the subject or address?', ['Nothing — deconfliction was already done Tuesday', 'That there is no conflicting operation or officer presence expected at the search locations', 'Ask them to conduct the search instead', 'Request they seal the property early'], 1, 'today\'s Command Post'),
    ],
    blanks: [
      blank('The appliance was found physically concealed, which is why the provenance record states facts and draws no ______ about who placed it or why.', ['conclusion'], 'the appliance provenance record'),
      blank('Today\'s productions (appliance forensics, banking return, marketplace collection) should each be logged with source, date received, and ______.', ['how obtained'], 'today\'s evidence'),
    ],
    shortAnswer: prompt('Describe your final deconfliction check before this afternoon\'s search and what you\'d do if a local agency reported an open interest in the same address.', ['Describes contacting relevant local agencies once more before the operation', 'Escalating to the Command Post before proceeding if a conflict surfaces']),
  },
  {
    code: 'CS', label: 'Computer Scientist', roleFilter: 'cyber_analyst',
    task: `Technically analyze the appliance configuration and session log for the "two eras" pattern, and confirm the tool-signature match to Tuesday's account-creation records.`,
    mc: [
      mc('What does the appliance\'s configuration export show, technically?', ['A single, one-time setup with no changes', 'An original 2025-05 shadow-IT setup, plus an added persistent tunnel and remote-management enrollment from 2025-09', 'A factory-default configuration', 'Evidence of a full wipe'], 1, 'the appliance config export'),
      mc('What management-login signature appears in the appliance\'s session log?', ['RMM-Agent/4.7', 'BRKR-Tool/2.0', 'VeilStream-Client/1.1', 'CoinBridge-API/3.0'], 0, 'the appliance session log'),
      mc('How does that signature relate to Tuesday\'s evidence?', ['It\'s unrelated', 'It matches the signature associated with the account-creation activity at the other three victims', 'It only appears at CyberDyne', 'It proves Voss\'s innocence conclusively'], 1, 'the appliance session log'),
    ],
    blanks: [
      blank('The appliance sat dormant from September 2025 until it was used for exfiltration in ______ 2026.', ['June'], 'the appliance session log'),
    ],
    dualBlankPrompt: prompt('The appliance\'s exfiltration tunnel flows recorded in the session log run from June ___ through June ___. State both dates.', ['June 15', 'June 18'], BLANK_POINTS),
    shortAnswer: prompt('Explain, technically, why finding the same tool signature on the CyberDyne appliance and on the three other victims\' account-creation records is significant.', ['Identifies this as evidence the same provisioning tool/actor touched all four victims\' access', 'Calls it the strongest technical thread tying the appliance to the broader pattern, without yet naming a person']),
  },
];

const SQUAD_QUIZ = [
  mc('What single tool signature appears both in CyberDyne\'s appliance session log and in the account-creation records at the other three victims?', ['BRKR-Tool/2.0', 'RMM-Agent/4.7', 'CoinBridge-API', 'VeilStream-Client'], 1, 'today\'s evidence'),
  mc('What does the crypto cluster analysis show about fund flow?', ['The victims paid the buyer directly', 'The buyer wallet (w2) paid the seller wallet (w3), which flowed to CoinBridge', 'CoinBridge paid the ransom wallet', 'No flow could be established'], 1, 'the crypto cluster analysis'),
  mc('Do any Black Harbor listings name the four victims directly?', ['Yes', 'No — they\'re described only by characteristics that match', 'Only two are named', 'All are named except CyberDyne'], 1, 'the Black Harbor listings (BRKR_AL)'),
  mc('What must be true before this afternoon\'s search can proceed?', ['A completed, artifact-cited probable-cause package', 'A confession', 'A civil court order', 'Nothing further is needed'], 0, 'today\'s Command Post'),
  mc('Which two dead-end leads should be formally ruled out today, not just ignored?', ['The Hartwell Logistics angle and the twice-failed phishing-test employee', 'Marcus Iyer and D. Voss', 'Sam Smith and Jordan Reston', 'CoinBridge and VeilStream'], 0, 'today\'s Command Post'),
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
// header comment for why Drop 3 differs from Day 1/Day 2's per-victim shape.
function buildAssignmentSpecs() {
  const specs = [];
  for (const role of ROLES) {
    specs.push({
      kind: 'role',
      title: `${TITLE_PREFIX} "The Broker" — ${role.code} (${role.label})`,
      description: `${role.label} individual assessment for Day 3 ("The Broker"): ${role.task}`,
      victimName: null,
      roleFilters: [role.roleFilter],
      gradingMode: 'individual',
      questions: buildRoleQuestions(role),
    });
  }
  specs.push({
    kind: 'squad_quiz',
    title: `${TITLE_PREFIX} "The Broker" — Squad Synthesis Quiz`,
    description: `Squad Synthesis Quiz for Day 3 — complete together, as a squad, after every role has finished its individual assessment.`,
    victimName: null,
    roleFilters: [],
    gradingMode: 'squad',
    questions: SQUAD_QUIZ,
  });
  return specs;
}

module.exports = { SCENARIO, DROP, TITLE_PREFIX, ROLES, SQUAD_QUIZ, buildRoleQuestions, buildAssignmentSpecs };
