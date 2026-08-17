/*
  Case File — "The Ridgeview Wireless Hijack" (Cyber Crime / SIM-Swap
  Cryptocurrency Theft). Pure case data — see caseFileCaseUtils.js for
  shared helpers. Grounded in real DOJ SIM-swap prosecutions: a paid
  carrier-store insider processes the unauthorized port, the stolen crypto
  moves through a rapid wallet chain, and a share is cashed out through an
  online casino account (see realWorldContext, below).
*/

export const caseMeta = {
  title: 'The Ridgeview Wireless Hijack',
  category: 'Cyber Crime',
  blurb: 'A crypto investor\'s phone number is silently ported to a stranger\'s SIM — his six-figure wallet is empty within the hour.',
  premise:
    'Cryptocurrency investor Daniel Osei lost cellular service without warning on a Tuesday afternoon. ' +
    'Within the hour, password-reset and two-factor recovery messages for his exchange account followed, ' +
    'and $210,000 in holdings were gone. What looks like a single unlucky victim increasingly resembles a ' +
    'coordinated crew: a retail employee at his mobile carrier processed the unauthorized port for a cut ' +
    'of the proceeds, and the stolen funds moved through a rapid chain of wallets before cashing out ' +
    'through an online casino account.',
  initialComplaint:
    'Complainant: victim, cryptocurrency investor Daniel Osei. Nature of complaint: cellular service was ' +
    'silently transferred to an unknown device; password-reset and two-factor authentication messages for ' +
    'a cryptocurrency exchange account followed within the hour, and $210,000 in holdings were withdrawn ' +
    'without authorization. Referred for investigation.',
};

export const centralFacts = [
  {
    id: 'carrier_insider',
    title: 'Carrier Store Insider',
    summary:
      'A retail employee at Ridgeview Wireless, Bryce Halloran, processed an unauthorized SIM swap on ' +
      'Daniel Osei\'s line in exchange for payment, bypassing the carrier\'s standard identity-verification ' +
      'steps entirely.',
  },
  {
    id: 'rapid_2fa_takeover',
    title: 'Real-Time 2FA Takeover',
    summary:
      'Within minutes of the swap, the attackers used the hijacked phone number to intercept SMS-based ' +
      'recovery codes and drain Osei\'s exchange account before he even noticed his phone had gone silent.',
  },
  {
    id: 'wallet_layering',
    title: 'Wallet Layering',
    summary:
      'The stolen cryptocurrency moved through a rapid chain of wallets, each holding the funds only ' +
      'briefly, before consolidating into a single destination wallet.',
  },
  {
    id: 'casino_cashout',
    title: 'Casino Cash-Out',
    summary:
      'The consolidated funds were deposited into an online casino account and withdrawn as gambling ' +
      '"winnings," breaking the on-chain trail at the point of cash-out.',
  },
  {
    id: 'crew_coordination',
    title: 'Crew Coordination',
    summary:
      'Recovered chat logs tie together the person who recruited and paid Bryce Halloran and a separate ' +
      '"wallet manager" who handled the layering — an organized crew, not a lone actor.',
  },
];

export const factMatrix = [
  { factId: 'carrier_insider', categoryA: 'interviews', categoryB: 'digital', grandJury: true, caseDefiningEligible: true },
  { factId: 'rapid_2fa_takeover', categoryA: 'digital', categoryB: 'financial', grandJury: true, caseDefiningEligible: true },
  { factId: 'wallet_layering', categoryA: 'financial', categoryB: 'intelligence', grandJury: true, caseDefiningEligible: true },
  { factId: 'casino_cashout', categoryA: 'financial', categoryB: 'documents', grandJury: true, caseDefiningEligible: true },
  { factId: 'crew_coordination', categoryA: 'intelligence', categoryB: 'digital', grandJury: true, caseDefiningEligible: false },
];

export const evidenceCards = [
  // Interviews
  { id: 'int-01', category: 'interviews', ref: 'ref-int-person-of-interest', factId: 'carrier_insider', flavor: '"I followed the normal process, I swear — I don\'t remember anything unusual about that port request." — Bryce Halloran\'s voluntary interview.', caseDefining: false },
  { id: 'int-02', category: 'interviews', ref: 'ref-int-witness', factId: 'rapid_2fa_takeover', flavor: '"My phone just said \'No Service\' out of nowhere. By the time I got to a computer forty minutes later, the exchange emails were already sitting in my inbox." — victim Daniel Osei.', caseDefining: false },
  { id: 'int-03', category: 'interviews', ref: 'ref-int-coworker-statement', factId: 'carrier_insider', flavor: '"Bryce processed that port alone at the end of his shift — normally two of us sign off on anything without the customer physically in store." — a fellow Ridgeview Wireless associate.', caseDefining: true },
  { id: 'int-04', category: 'interviews', ref: 'ref-int-confidential-informant', factId: 'crew_coordination', flavor: '"That handle pays $500 to $1,000 a swap, cash or crypto, no questions — he\'s recruited three or four store employees I know of." — a confidential source on a SIM-swap forum.', caseDefining: false },
  { id: 'int-05', category: 'interviews', ref: 'ref-int-financial-advisor', factId: 'casino_cashout', flavor: '"That deposit-then-immediate-withdrawal pattern is exactly what we train staff to flag — nobody actually gambles like that." — an online casino\'s compliance officer.', caseDefining: false },
  { id: 'int-06', category: 'interviews', ref: 'ref-int-conflicting-statement', factId: 'carrier_insider', flavor: 'In his first interview, Bryce Halloran said he didn\'t recall the port at all. In a follow-up, he claims the customer "showed valid ID" — a claim the store\'s own camera footage doesn\'t support.', caseDefining: false },

  // Documents
  { id: 'doc-01', category: 'documents', ref: 'ref-doc-official-record', factId: 'carrier_insider', flavor: 'Ridgeview Wireless\'s port-out record for Daniel Osei\'s line shows the mandatory secondary-ID-verification field left blank, overridden by employee ID matching Bryce Halloran.', caseDefining: true },
  { id: 'doc-02', category: 'documents', ref: 'ref-doc-internal-memo', factId: 'carrier_insider', flavor: 'Ridgeview Wireless\'s internal fraud-review memo flags the Osei port as "verification bypass — escalate," dated the day after the theft, with no escalation ever logged.', caseDefining: false },
  { id: 'doc-03', category: 'documents', ref: 'ref-doc-civil-court-filing', factId: 'rapid_2fa_takeover', flavor: 'Daniel Osei\'s exchange dispute filing documents the exact sequence: SIM swap completed at 2:47 PM, password reset requested at 2:51 PM, full withdrawal completed by 3:20 PM.', caseDefining: false },
  { id: 'doc-04', category: 'documents', ref: 'ref-doc-corporate-filing', factId: 'casino_cashout', flavor: 'Account-opening documentation for the online casino account lists a name that doesn\'t match any known crew member — likely a purchased or stolen identity.', caseDefining: false },
  { id: 'doc-05', category: 'documents', ref: 'ref-doc-business-ledger', factId: 'wallet_layering', flavor: 'The exchange\'s own ledger of the account drain shows the full balance converted and withdrawn in a single transaction, 33 minutes after the password reset.', caseDefining: false },
  { id: 'doc-06', category: 'documents', ref: 'ref-doc-employment-records', factId: 'carrier_insider', flavor: 'Bryce Halloran\'s timesheet confirms he was clocked in and alone at the register for the eleven-minute window the port was processed.', caseDefining: false },

  // Digital
  { id: 'dig-01', category: 'digital', ref: 'ref-dig-authentication-logs', factId: 'rapid_2fa_takeover', flavor: 'Exchange authentication logs show a password-reset request four minutes after the SIM swap completed, followed by a 2FA code sent via SMS to the now-hijacked number.', caseDefining: true },
  { id: 'dig-02', category: 'digital', ref: 'ref-dig-account-registration', factId: 'carrier_insider', flavor: 'Ridgeview Wireless\'s internal system log records employee ID "BH-2214" — Bryce Halloran — as the sole staff account that touched the Osei port.', caseDefining: false },
  { id: 'dig-03', category: 'digital', ref: 'ref-dig-text-messages', factId: 'crew_coordination', flavor: 'Recovered texts: "he\'s in, port\'s going through in 10" followed twenty minutes later by "wallet\'s moving, tell B his cut\'s coming."', caseDefining: false },
  { id: 'dig-04', category: 'digital', ref: 'ref-dig-chat-application-backup', factId: 'crew_coordination', flavor: 'A recovered chat backup shows a payment of $800 in cryptocurrency sent to a wallet address matching one later linked to Bryce Halloran, timestamped the evening of the port.', caseDefining: true },
  { id: 'dig-05', category: 'digital', ref: 'ref-dig-crypto-exchange-records', factId: 'wallet_layering', flavor: 'Blockchain records trace the stolen funds through six separate wallets in under two hours, each holding the balance for less than fifteen minutes before forwarding it onward.', caseDefining: true },
  { id: 'dig-06', category: 'digital', ref: 'ref-dig-wallet-transaction', factId: 'casino_cashout', flavor: 'The final on-chain transaction in the wallet chain deposits the consolidated funds directly into the online casino\'s designated crypto deposit address.', caseDefining: false },

  // Physical
  { id: 'phy-01', category: 'physical', ref: 'ref-phy-digital-storage-media', factId: 'carrier_insider', flavor: 'A phone seized from Bryce Halloran shows a cryptocurrency payment app with an incoming transaction the evening of the port — the app\'s transaction memo reads "thx."', caseDefining: true },
  { id: 'phy-02', category: 'physical', ref: 'ref-phy-surveillance-footage', factId: 'carrier_insider', flavor: 'Store camera footage shows Bryce Halloran processing the port alone at the register — no customer, in person or on a video call, is ever visible on screen.', caseDefining: false },
  { id: 'phy-03', category: 'physical', ref: 'ref-phy-access-log', factId: 'carrier_insider', flavor: 'The store\'s system access log timestamps Bryce Halloran\'s login to the port-processing terminal at 1:58 PM — 49 minutes before Daniel Osei\'s phone lost service.', caseDefining: false },
  { id: 'phy-04', category: 'physical', ref: 'ref-phy-inventory-record', factId: 'crew_coordination', flavor: 'An inventory of items recovered from a separate person of interest includes three prepaid phones and a notebook with handwritten wallet addresses matching the layering chain.', caseDefining: false },
  { id: 'phy-05', category: 'physical', ref: 'ref-phy-tool-recovery', factId: 'wallet_layering', flavor: 'A hardware cryptocurrency wallet, seized during a related search, holds a balance matching one of the six intermediate wallets in the layering chain.', caseDefining: false },
  { id: 'phy-06', category: 'physical', ref: 'ref-phy-discarded-item-recovery', factId: 'carrier_insider', flavor: 'A discarded burner phone, recovered from a trash receptacle near the Ridgeview Wireless store, contains texts matching the crew\'s coordination language.', caseDefining: false },

  // Financial
  { id: 'fin-01', category: 'financial', ref: 'ref-fin-crypto-wallet', factId: 'rapid_2fa_takeover', flavor: 'Daniel Osei\'s exchange wallet record shows a balance of $210,000 at 2:50 PM and a balance of $0 by 3:20 PM the same day.', caseDefining: true },
  { id: 'fin-02', category: 'financial', ref: 'ref-fin-wire-transfer', factId: 'carrier_insider', flavor: 'A peer-to-peer cryptocurrency transfer of $800 lands in a wallet linked to Bryce Halloran within hours of the port — the payment for processing it.', caseDefining: false },
  { id: 'fin-03', category: 'financial', ref: 'ref-fin-suspicious-activity-report', factId: 'casino_cashout', flavor: 'The online casino\'s own compliance report flags the account for depositing a large crypto sum and withdrawing it as "winnings" within 24 hours, with no gameplay activity logged in between.', caseDefining: false },
  { id: 'fin-04', category: 'financial', ref: 'ref-fin-currency-exchange-record', factId: 'wallet_layering', flavor: 'Currency exchange records show a portion of the layered funds converted at two different exchanges within the same hour, both transactions just under standard reporting thresholds.', caseDefining: false },
  { id: 'fin-05', category: 'financial', ref: 'ref-fin-merchant-account-records', factId: 'casino_cashout', flavor: 'The casino account\'s full history shows one deposit, minimal gameplay, and a withdrawal request filed nine minutes after the deposit cleared.', caseDefining: false },
  { id: 'fin-06', category: 'financial', ref: 'ref-fin-financial-record', factId: 'crew_coordination', flavor: 'A financial record ties a share of the casino withdrawal to an account controlled by the same person identified as the crew\'s recruiter in the chat logs.', caseDefining: false },

  // Intelligence
  { id: 'intel-01', category: 'intelligence', ref: 'ref-intel-osint-summary', factId: 'crew_coordination', flavor: 'Open-source research identifies the recruiter\'s forum handle as active across three SIM-swap discussion boards, openly soliciting "store guys" for ports.', caseDefining: false },
  { id: 'intel-02', category: 'intelligence', ref: 'ref-intel-network-mapping', factId: 'wallet_layering', flavor: 'Network mapping of the six-wallet layering chain shows two of the intermediate wallets were also used in an unrelated cryptocurrency theft reported the previous month.', caseDefining: true },
  { id: 'intel-03', category: 'intelligence', ref: 'ref-intel-pattern-analysis', factId: 'carrier_insider', flavor: 'A pattern analysis of Bryce Halloran\'s port-processing history shows four other ports in the past year that skipped the same verification step — all four numbers were later linked to reported fraud.', caseDefining: false },
  { id: 'intel-04', category: 'intelligence', ref: 'ref-intel-interagency-data-match', factId: 'casino_cashout', flavor: 'A federal financial-crimes database match links this casino account to two other SIM-swap cryptocurrency theft cases under investigation in different jurisdictions.', caseDefining: true },
  { id: 'intel-05', category: 'intelligence', ref: 'ref-intel-criminal-history-summary', factId: 'crew_coordination', flavor: 'The recruiter identified in the chat logs has a prior arrest for an unrelated SIM-swap scheme that did not result in charges.', caseDefining: false },
  { id: 'intel-06', category: 'intelligence', ref: 'ref-intel-watchlist-match', factId: 'wallet_layering', flavor: 'A blockchain-analytics watchlist flags one of the six layering wallets as previously associated with at least four other reported SIM-swap thefts.', caseDefining: false },
];

export const evidenceByThreshold = {
  carrier_insider: {
    intake: 'The victim\'s phone number was ported without his knowledge — could be an internal carrier error.',
    relevance: 'The port-out record shows the mandatory secondary-identity-verification step was left blank, overridden by a single employee\'s login.',
    specific_and_articulable_facts: 'That employee, Bryce Halloran, processed the port alone, without the second-signoff his store normally requires for a remote request.',
    probable_cause: 'A cryptocurrency payment matching a "cut" for the port lands in a wallet linked to Halloran within hours, and store footage shows no customer was ever actually present.',
    beyond_a_reasonable_doubt: 'The blank verification field, the solo processing, the payment, the footage, and a pattern of four prior similarly-processed ports all tied to reported fraud — together these rule out an honest mistake.',
  },
  rapid_2fa_takeover: {
    intake: 'The victim\'s cryptocurrency exchange account was drained shortly after he lost cell service — could be unrelated.',
    relevance: 'Exchange authentication logs show a password-reset request just minutes after the SIM swap completed.',
    specific_and_articulable_facts: 'The 2FA recovery code for that reset was sent via SMS — straight to the now-hijacked phone number.',
    probable_cause: 'The full account balance was converted and withdrawn in a single transaction just over half an hour after the reset request — a deliberate, immediate drain, not a delayed or exploratory one.',
    beyond_a_reasonable_doubt: 'The minute-by-minute timeline — swap, reset, SMS code, full withdrawal, all within 33 minutes — describes a rehearsed, real-time takeover, not an opportunistic afterthought.',
  },
  wallet_layering: {
    intake: 'The stolen cryptocurrency can\'t be traced past a handful of transfers.',
    relevance: 'Those transfers moved through several different wallets in a short window, each holding the funds only briefly.',
    specific_and_articulable_facts: 'A hardware wallet seized in a related search holds a balance matching one of those intermediate wallets.',
    probable_cause: 'A blockchain-analytics watchlist ties two of the intermediate wallets to a separate, unrelated cryptocurrency theft the previous month.',
    beyond_a_reasonable_doubt: 'The rapid multi-wallet chain, the seized hardware wallet holding a matching balance, and the cross-case watchlist match together describe a reusable laundering pipeline, not a one-off transfer.',
  },
  casino_cashout: {
    intake: 'A share of the layered funds ends up at an online casino for no clear reason.',
    relevance: 'The casino account was opened under a name that doesn\'t match any known person tied to this case.',
    specific_and_articulable_facts: 'The account\'s history shows one deposit, minimal or no actual gameplay, and a withdrawal filed within minutes of the deposit clearing.',
    probable_cause: 'The casino\'s own compliance team already flagged this exact deposit-then-immediate-withdrawal pattern internally, before this investigation ever contacted them.',
    beyond_a_reasonable_doubt: 'A federal financial-crimes match ties this same casino account to two other SIM-swap theft cases — this was a known, reusable cash-out channel, not this crew\'s one-time idea.',
  },
  crew_coordination: {
    intake: 'A source mentions the carrier employee may not have acted alone.',
    relevance: 'Open-source research finds a forum handle openly recruiting "store guys" to process fraudulent ports for payment.',
    specific_and_articulable_facts: 'Recovered chat logs show real-time coordination between that recruiter and someone managing the stolen wallet\'s movement.',
    probable_cause: 'Items recovered from a separate person of interest — burner phones, handwritten wallet addresses — match the layering chain used in this specific theft.',
    beyond_a_reasonable_doubt: 'The recruiter\'s own prior SIM-swap arrest, the chat logs coordinating this exact theft, and physical evidence tying a second person to the wallet chain together describe an organized, repeat-offending crew.',
  },
};

export const legalRouting = {
  documents: { routed: true, note: 'Subpoena for carrier and casino records; Court Order if either resists production.' },
  digital: { routed: true, note: 'Subpoena for exchange/authentication logs; Search Warrant for device imaging of seized phones.' },
  physical: { routed: true, note: 'Search Warrant typically required for seized devices, hardware wallets, and cash.' },
  financial: { routed: true, note: 'Subpoena for exchange and casino account records; International Requests where funds cross borders.' },
  interviews: { routed: false, note: 'Facilitator judgment call — voluntary interviews unless a witness becomes uncooperative.' },
  intelligence: { routed: false, note: 'Facilitator judgment call — OSINT and watchlist work rarely needs compulsory process.' },
};

export const grandJuryRubric = {
  citableFacts: centralFacts.map((f) => f.id),
  threshold: 3,
  guidance:
    'The team must be able to cite specific, evidence-backed facts for at least 3 of the 5 central facts ' +
    'to secure indictment. Carrier Store Insider and Real-Time 2FA Takeover are the structural core of the ' +
    'case — a presentation missing both should not pass even if it clears the numeric threshold on the ' +
    'other three.',
  failurePenalty:
    'A failed presentation does not end the game — Case Strength holds where it is and the team may ' +
    'continue investigating, but Command Pressure escalates one level (facilitator discretion) to reflect ' +
    'lost institutional confidence.',
};

export const outcomeTiers = [
  { tier: 'Swift', roundRange: '≤ 15 rounds', description: 'Efficient investigation, minimal complications, strong early Legal Instrument usage.' },
  { tier: 'Solid', roundRange: '16 – 21 rounds', description: 'Typical pacing — the expected median outcome for this case.' },
  { tier: 'Grinding', roundRange: '22+ rounds', description: 'Heavy Command Pressure and/or repeated complications; still winnable but costly.' },
];

export const victoryConditions =
  'The team secures indictment via a successful Grand Jury presentation, then continues investigating ' +
  'post-indictment (surviving any Defense Counterplay) until Case Strength reaches 30.';

export const failureConditions =
  'The team exhausts all Resource Tokens (with Consolidate the Case also exhausted) before securing ' +
  'indictment, or a corroboration failure during Defense Counterplay collapses the case beyond recovery ' +
  '(facilitator discretion, e.g. a successful motion removing a fact the team never corroborated).';

export const defenseCounterplayCards = [
  { id: 'def-01', name: 'Motion to Suppress — Digital Evidence', effect: 'Challenges the chain of custody on the exchange authentication logs; if unresolved, treat Real-Time 2FA Takeover as uncorroborated going forward.', corroborationImmune: 'rapid_2fa_takeover' },
  { id: 'def-02', name: 'Competing Telecom Forensics Expert', effect: 'Defense expert argues the port could reflect a routine system glitch, not employee misconduct; contest with a second corroborating Documents or Physical card.', corroborationImmune: 'carrier_insider' },
  { id: 'def-03', name: 'Witness Recantation — Halloran', effect: 'Bryce Halloran, under pressure, claims he was coerced into his statement; independent footage/log evidence resists this if already developed.', corroborationImmune: 'carrier_insider' },
  { id: 'def-04', name: 'Discovery Demand', effect: 'Defense demands early production of your working files; costs the team 1 round of delay across the Pending Returns Queue.', corroborationImmune: null },
  { id: 'def-05', name: 'Change of Venue Motion', effect: 'Procedural delay; advance Command Pressure one level unless resolved.', corroborationImmune: null },
  { id: 'def-06', name: 'Chain-of-Custody Challenge — Seized Devices', effect: 'Contests handling of phones and hardware wallets seized from persons of interest; needs a second independent category to corroborate.', corroborationImmune: 'wallet_layering' },
  { id: 'def-07', name: 'Casino Account Ownership Dispute', effect: 'Defense claims the casino account belongs to an unrelated third party; the interagency data match resists this if already developed.', corroborationImmune: 'casino_cashout' },
  { id: 'def-08', name: 'Attribution Dispute — Wallet Chain', effect: 'Defense disputes that the layering wallets can be reliably tied to this specific theft; the network mapping and watchlist evidence resist this if already developed.', corroborationImmune: 'wallet_layering' },
  { id: 'def-09', name: 'Character/Reputation Evidence Motion', effect: 'Attempts to introduce unrelated favorable character evidence for Halloran; facilitator judgment on relevance, generally low-impact if the financial trail is solid.', corroborationImmune: null },
  { id: 'def-10', name: 'Speedy Trial Pressure', effect: 'Defense pushes for an accelerated timeline; advance Command Pressure one level unless the team has already reached Probable Cause (16+).', corroborationImmune: null },
];

// Shown at a successful indictment — a fictional composite, not a
// dramatization of one real prosecution, but every mechanic here (a paid
// carrier-store insider, real-time SMS-2FA interception, rapid wallet
// layering, a casino cash-out) reflects documented, real SIM-swap theft
// cases.
export const realWorldContext = {
  heading: 'The Real-World Pattern Behind This Case',
  paragraphs: [
    'SIM swapping is a real, well-documented technique: an attacker tricks or bribes a mobile carrier into transferring a victim\'s phone number to a SIM card the attacker controls, then poses as the victim to request password resets — intercepting the SMS-based two-factor codes that follow and using them to drain accounts. A real federal indictment charged individuals with using exactly this technique to obtain cryptocurrencies and other property through fraud and extortion targeting executives of crypto-related companies.',
    'The casino cash-out in this case mirrors an actual DOJ civil forfeiture action seeking roughly $5 million in Bitcoin stolen through SIM-swap attacks between late 2022 and early 2023 — the real attackers moved the stolen funds through multiple cryptocurrency wallets before consolidating them into an account that funded deposits at an online casino, using gambling withdrawals to break the on-chain trail.',
    'Carrier-store insiders being paid to process unauthorized ports, rather than attackers social-engineering a call center from outside, is likewise a documented real-world variant — SIM hijacking has been facilitated both by bribing mobile-provider employees directly and by impersonating victims to customer service.',
  ],
  sources: [
    { title: 'US Justice Dept. files civil forfeiture complaint for $5 million in bitcoin stolen via SIM swap attacks (The Block)', url: 'https://www.theblock.co/post/370072/us-justice-dept-files-civil-forfeiture-complaint-for-5-million-in-bitcoin-stolen-via-sim-swap-attacks' },
    { title: 'Two Men Indicted In "SIM Swapping" Scheme To Steal Cryptocurrency (DOJ, Northern District of California)', url: 'https://www.justice.gov/usao-ndca/pr/two-men-indicted-sim-swapping-scheme-steal-cryptocurrency' },
    { title: 'International Hacking Group Members Sentenced for SIM Hijacking Conspiracy That Resulted in the Theft of Millions in Cryptocurrency (DOJ, Eastern District of Michigan)', url: 'https://www.justice.gov/usao-edmi/pr/international-hacking-group-members-sentenced-sim-hijacking-conspiracy-resulted-theft' },
  ],
};
