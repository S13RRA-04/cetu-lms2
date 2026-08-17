/*
  Case File — "The Meadowbrook Escrow Diversion" (Cyber Crime / Business
  Email Compromise). Pure case data — see caseFileCaseUtils.js for shared
  helpers. Grounded in real BEC prosecution patterns: inbox monitoring
  ahead of a live transaction, a lookalike-domain instruction swap timed to
  the moment of payment, and a money-mule account that moves funds before
  the fraud is even noticed (see realWorldContext, below).
*/

export const caseMeta = {
  title: 'The Meadowbrook Escrow Diversion',
  category: 'Cyber Crime',
  blurb: 'A title company\'s six-figure closing wire vanishes into a mule account — after weeks of someone silently reading the email thread.',
  premise:
    'Meadowbrook Title & Escrow closed on a residential sale and wired the seller\'s $340,000 in proceeds ' +
    'exactly as instructed by an email that arrived the morning of closing. The seller never sent it. The ' +
    'real wiring instructions, on file for weeks, were quietly swapped at the last possible moment for ' +
    'ones leading to an account that had been opened days earlier and was empty again within hours.',
  initialComplaint:
    'Complainant: Closing Officer, Meadowbrook Title & Escrow. Nature of complaint: a $340,000 seller ' +
    'disbursement wire, sent per emailed instructions received the morning of closing, went to an account ' +
    'that does not match the seller\'s verified banking information on file. The seller states they never ' +
    'sent updated wiring instructions. Referred for investigation.',
};

export const centralFacts = [
  {
    id: 'inbox_compromise',
    title: 'Silent Inbox Access',
    summary:
      'Attackers gained silent, ongoing access to closing officer Deborah Ruiz\'s email inbox weeks before ' +
      'the closing, via a credential-harvesting link disguised as a routine document-signing notification.',
  },
  {
    id: 'spoofed_instructions',
    title: 'Spoofed Wiring Instructions',
    summary:
      'A lookalike-domain email, injected into the live closing thread the morning of the wire, replaced ' +
      'the seller\'s real bank details with attacker-controlled ones — timed to arrive right when Ruiz ' +
      'expected final instructions.',
  },
  {
    id: 'mule_network',
    title: 'Mule Account Network',
    summary:
      'The stolen funds landed in a business account opened days earlier by Marcus Whitlow using a shell ' +
      'company registration, then were split and forwarded out before Meadowbrook noticed the fraud.',
  },
  {
    id: 'overseas_layering',
    title: 'Overseas Layering',
    summary:
      'A share of the diverted funds moved through international wire transfers and a cryptocurrency ' +
      'exchange to break the domestic paper trail before it could be frozen.',
  },
  {
    id: 'repeat_infrastructure',
    title: 'Repeat Infrastructure',
    summary:
      'The same lookalike domain and mule-account pattern match at least two other unresolved ' +
      'title-company fraud complaints in neighboring counties — this was not a one-time operation.',
  },
];

export const factMatrix = [
  { factId: 'inbox_compromise', categoryA: 'digital', categoryB: 'interviews', grandJury: true, caseDefiningEligible: true },
  { factId: 'spoofed_instructions', categoryA: 'digital', categoryB: 'documents', grandJury: true, caseDefiningEligible: true },
  { factId: 'mule_network', categoryA: 'financial', categoryB: 'physical', grandJury: true, caseDefiningEligible: true },
  { factId: 'overseas_layering', categoryA: 'financial', categoryB: 'intelligence', grandJury: true, caseDefiningEligible: true },
  { factId: 'repeat_infrastructure', categoryA: 'intelligence', categoryB: 'documents', grandJury: true, caseDefiningEligible: false },
];

export const evidenceCards = [
  // Interviews
  { id: 'int-01', category: 'interviews', ref: 'ref-int-person-of-interest', factId: 'mule_network', flavor: '"That account was for my logistics side business — I don\'t know anything about a title company." — Marcus Whitlow\'s voluntary interview.', caseDefining: false },
  { id: 'int-02', category: 'interviews', ref: 'ref-int-coworker-statement', factId: 'inbox_compromise', flavor: '"Deb mentioned clicking a DocuSign link that looked off, maybe three weeks before the closing — she didn\'t think much of it at the time." — a Meadowbrook coworker, on closing officer Deborah Ruiz.', caseDefining: true },
  { id: 'int-03', category: 'interviews', ref: 'ref-int-witness', factId: 'spoofed_instructions', flavor: '"I never sent updated wiring instructions — I didn\'t even know the closing had happened yet when they called me." — the seller, on the fraudulent email.', caseDefining: false },
  { id: 'int-04', category: 'interviews', ref: 'ref-int-financial-advisor', factId: 'overseas_layering', flavor: '"The transfer pattern is textbook — domestic mule account, then straight offshore within 48 hours, every time." — a bank fraud investigator, on the Meadowbrook wire.', caseDefining: false },
  { id: 'int-05', category: 'interviews', ref: 'ref-int-confidential-informant', factId: 'repeat_infrastructure', flavor: '"Same fake domain hit a title company two counties over last spring — same account-opening pattern too." — a confidential source with financial-crimes contacts.', caseDefining: false },
  { id: 'int-06', category: 'interviews', ref: 'ref-int-conflicting-statement', factId: 'mule_network', flavor: 'In his first interview, Marcus Whitlow said he opened the account for "consulting income." He later can\'t name a single client or describe what the consulting work was.', caseDefining: false },

  // Documents
  { id: 'doc-01', category: 'documents', ref: 'ref-doc-official-record', factId: 'spoofed_instructions', flavor: 'The closing file\'s final wiring instructions list an account number one digit off from the seller\'s verified account on file — the routing number is entirely different.', caseDefining: true },
  { id: 'doc-02', category: 'documents', ref: 'ref-doc-corporate-filing', factId: 'mule_network', flavor: 'Formation filing for "Whitlow Logistics LLC," registered nine days before the closing, listing a residential address with no business license on record.', caseDefining: false },
  { id: 'doc-03', category: 'documents', ref: 'ref-doc-internal-memo', factId: 'inbox_compromise', flavor: 'Meadowbrook\'s internal IT memo confirms closing officer Deborah Ruiz reported a suspicious "document ready for signature" email three weeks before the closing — the memo shows no follow-up action was ever logged.', caseDefining: false },
  { id: 'doc-04', category: 'documents', ref: 'ref-doc-civil-court-filing', factId: 'repeat_infrastructure', flavor: 'A civil complaint filed by a title company in a neighboring county describes an identical lookalike-domain wire diversion four months earlier.', caseDefining: false },
  { id: 'doc-05', category: 'documents', ref: 'ref-doc-business-ledger', factId: 'overseas_layering', flavor: 'The mule account\'s bank ledger shows the full $340,000 arriving at 9:14 AM and $290,000 of it wired to an overseas account by 11:40 AM the same day.', caseDefining: false },
  { id: 'doc-06', category: 'documents', ref: 'ref-doc-signed-contract', factId: 'mule_network', flavor: 'The mule account\'s signature card is signed "M. Whitlow," but the handwriting doesn\'t match samples from his known employment records.', caseDefining: false },

  // Digital
  { id: 'dig-01', category: 'digital', ref: 'ref-dig-email-header', factId: 'spoofed_instructions', flavor: 'The fraudulent wiring-instructions email came from "meadowbrook-title-escrow.com" — one hyphen different from Meadowbrook\'s real domain, registered six days before it was used.', caseDefining: true },
  { id: 'dig-02', category: 'digital', ref: 'ref-dig-authentication-logs', factId: 'inbox_compromise', flavor: 'Login logs show closing officer Deborah Ruiz\'s inbox was accessed from a foreign IP address eleven times over three weeks, always outside business hours.', caseDefining: true },
  { id: 'dig-03', category: 'digital', ref: 'ref-dig-metadata-analysis', factId: 'spoofed_instructions', flavor: 'Metadata on the fraudulent email shows it was drafted two days in advance and scheduled to send at 8:00 AM the morning of closing — timed, not opportunistic.', caseDefining: false },
  { id: 'dig-04', category: 'digital', ref: 'ref-dig-account-registration', factId: 'mule_network', flavor: 'The mule account\'s online banking registration was completed from the same IP address used to access closing officer Deborah Ruiz\'s inbox two weeks earlier.', caseDefining: true },
  { id: 'dig-05', category: 'digital', ref: 'ref-dig-cloud-storage-files', factId: 'repeat_infrastructure', flavor: 'A shared cloud folder contains a reusable phishing template — subject line "Signature Required" — pre-filled with placeholder fields for a title company\'s name and closing amount.', caseDefining: false },
  { id: 'dig-06', category: 'digital', ref: 'ref-dig-deleted-file-recovery', factId: 'inbox_compromise', flavor: 'Recovered deleted inbox rules from closing officer Deborah Ruiz\'s account silently forwarded any email containing "wiring instructions" to an outside address — deleted the same day the fraud was discovered.', caseDefining: false },

  // Physical
  { id: 'phy-01', category: 'physical', ref: 'ref-phy-digital-storage-media', factId: 'mule_network', flavor: 'A laptop seized from Marcus Whitlow has a banking app installed for the mule account, alongside three other business accounts opened in the same six-month window.', caseDefining: true },
  { id: 'phy-02', category: 'physical', ref: 'ref-phy-access-log', factId: 'overseas_layering', flavor: 'A currency exchange\'s in-person visitor log shows an individual matching Marcus Whitlow\'s description picking up cash the same week the offshore transfer cleared.', caseDefining: false },
  { id: 'phy-03', category: 'physical', ref: 'ref-phy-inventory-record', factId: 'mule_network', flavor: 'An inventory of items recovered from Marcus Whitlow: two prepaid phones activated the week the mule account opened, and $4,000 in gift cards purchased in cash.', caseDefining: false },
  { id: 'phy-04', category: 'physical', ref: 'ref-phy-surveillance-footage', factId: 'mule_network', flavor: 'Bank branch footage shows Marcus Whitlow making three cash withdrawals from the mule account within 48 hours of the wire landing.', caseDefining: false },
  { id: 'phy-05', category: 'physical', ref: 'ref-phy-discarded-item-recovery', factId: 'repeat_infrastructure', flavor: 'A printed copy of the same "Signature Required" phishing template, discarded in a shared mailroom trash bin, is dated to a period matching the neighboring-county complaint.', caseDefining: false },
  { id: 'phy-06', category: 'physical', ref: 'ref-phy-handwriting-sample', factId: 'mule_network', flavor: 'A handwriting comparison shows the mule account\'s signature card was filled out by someone other than Marcus Whitlow — suggesting he was recruited, not the organizer.', caseDefining: false },

  // Financial
  { id: 'fin-01', category: 'financial', ref: 'ref-fin-wire-transfer', factId: 'spoofed_instructions', flavor: 'The fraudulent wire: Meadowbrook Title & Escrow → the mule account, $340,000, sent at 9:14 AM the morning of closing.', caseDefining: true },
  { id: 'fin-02', category: 'financial', ref: 'ref-fin-suspicious-activity-report', factId: 'mule_network', flavor: 'The bank\'s own SAR flags the mule account\'s pattern — dormant for months, then a single $340,000 inbound deposit followed by rapid, near-total outbound transfers within hours.', caseDefining: false },
  { id: 'fin-03', category: 'financial', ref: 'ref-fin-offshore-account', factId: 'overseas_layering', flavor: 'An offshore account received $290,000 of the diverted funds by wire, routed through an intermediary bank with no other connection to either party.', caseDefining: true },
  { id: 'fin-04', category: 'financial', ref: 'ref-fin-currency-exchange-record', factId: 'overseas_layering', flavor: 'A cryptocurrency exchange record shows $65,000 of the offshore funds converted within a week of arrival, then moved to a wallet with no prior transaction history.', caseDefining: false },
  { id: 'fin-05', category: 'financial', ref: 'ref-fin-financial-record', factId: 'mule_network', flavor: 'The mule account\'s full history shows one deposit ever made — the $340,000 — and zero legitimate business transactions in its six months open.', caseDefining: false },
  { id: 'fin-06', category: 'financial', ref: 'ref-fin-merchant-account-records', factId: 'repeat_infrastructure', flavor: 'A merchant account tied to the same shell-registration pattern as Whitlow Logistics LLC processed a separate title company\'s diverted funds four months earlier.', caseDefining: false },

  // Intelligence
  { id: 'intel-01', category: 'intelligence', ref: 'ref-intel-prior-case-cross-reference', factId: 'repeat_infrastructure', flavor: 'A cross-reference search finds two other title-company fraud complaints in the past year matching this case\'s lookalike-domain and mule-account signature.', caseDefining: false },
  { id: 'intel-02', category: 'intelligence', ref: 'ref-intel-osint-summary', factId: 'spoofed_instructions', flavor: 'Open-source domain registration data shows "meadowbrook-title-escrow.com" was registered through a privacy-shielded registrar six days before the fraudulent email was sent.', caseDefining: false },
  { id: 'intel-03', category: 'intelligence', ref: 'ref-intel-pattern-analysis', factId: 'inbox_compromise', flavor: 'A pattern analysis of the inbox-access timestamps shows the intrusions clustered tightly around closing dates for high-value properties — this account was being watched for a reason.', caseDefining: false },
  { id: 'intel-04', category: 'intelligence', ref: 'ref-intel-network-mapping', factId: 'mule_network', flavor: 'Network mapping ties the mule account to at least four other accounts opened using the same shell-registration template in the past eight months.', caseDefining: true },
  { id: 'intel-05', category: 'intelligence', ref: 'ref-intel-criminal-history-summary', factId: 'mule_network', flavor: 'Marcus Whitlow\'s record includes a prior conviction for acting as a money mule in an unrelated fraud case three years ago.', caseDefining: false },
  { id: 'intel-06', category: 'intelligence', ref: 'ref-intel-interagency-data-match', factId: 'overseas_layering', flavor: 'A federal financial-crimes database match links the offshore account to two other business-email-compromise cases under investigation in different states.', caseDefining: false },
];

export const evidenceByThreshold = {
  inbox_compromise: {
    intake: 'A closing officer recalls clicking a suspicious document-signing link roughly a month before the fraud — no one connected it to anything at the time.',
    relevance: 'IT logs confirm the click, and login records show the officer\'s inbox was accessed from an unfamiliar IP address in the weeks that followed.',
    specific_and_articulable_facts: 'The unauthorized logins cluster tightly around closing dates for high-value properties, and recovered inbox rules show silent auto-forwarding of anything mentioning wiring instructions.',
    probable_cause: 'The forwarding rule was deleted the same day the fraud was discovered — someone was actively covering their tracks, not just opportunistically reading mail.',
    beyond_a_reasonable_doubt: 'The full timeline — the click, the recurring foreign logins, the targeted forwarding rule, and its same-day deletion — describes deliberate, sustained surveillance of this specific closing, not a random phishing hit.',
  },
  spoofed_instructions: {
    intake: 'A wire went to an account that doesn\'t match the seller\'s verified banking information — could be a simple clerical error.',
    relevance: 'The instructions arrived from a domain that differs from the title company\'s real one by a single hyphen.',
    specific_and_articulable_facts: 'That lookalike domain was registered less than a week before it was used, and the email itself was drafted two days in advance and scheduled to send at a specific time.',
    probable_cause: 'The scheduled send time lines up exactly with when the closing officer expected final instructions — this was timed to the transaction, not sent at random.',
    beyond_a_reasonable_doubt: 'Domain registration, draft timing, scheduled delivery, and the one-digit-off account number together rule out coincidence — this was built specifically to intercept this wire.',
  },
  mule_network: {
    intake: 'The account that received the funds was opened under a business name with no real operating history.',
    relevance: 'That business was registered only nine days before the closing, to a residential address with no business license on file.',
    specific_and_articulable_facts: 'Bank records show the account\'s only-ever deposit was the stolen wire, followed by rapid, near-total withdrawals within 48 hours.',
    probable_cause: 'The account holder\'s laptop, phones, and cash-out pattern tie him directly to the withdrawals, and network mapping links the same shell-account template to several other victims.',
    beyond_a_reasonable_doubt: 'Between the shell formation, the single-purpose account activity, the physical cash-out trail, and a prior mule conviction on record, the account was knowingly built and used to launder this exact theft.',
  },
  overseas_layering: {
    intake: 'A share of the missing funds cannot be traced past a wire that left the country.',
    relevance: 'That international wire moved through an intermediary bank with no other connection to either party in the case.',
    specific_and_articulable_facts: 'A portion of the offshore funds was further converted through a cryptocurrency exchange within a week of arrival.',
    probable_cause: 'The converted funds moved into a wallet with no prior transaction history — a fresh, single-use destination built for exactly this purpose.',
    beyond_a_reasonable_doubt: 'A federal financial-crimes match ties this same offshore account to other business-email-compromise cases — this was a reusable laundering channel, not an isolated transfer.',
  },
  repeat_infrastructure: {
    intake: 'A source mentions a similar fraud may have hit a title company elsewhere in the region.',
    relevance: 'A civil complaint from a neighboring county describes an identical lookalike-domain wire diversion months earlier.',
    specific_and_articulable_facts: 'A shared phishing template, pre-filled with placeholder fields for a title company\'s name and closing amount, is recovered from cloud storage tied to this case.',
    probable_cause: 'A merchant account using the same shell-registration pattern processed a separate victim\'s stolen funds four months before Meadowbrook was hit.',
    beyond_a_reasonable_doubt: 'The domain pattern, the reusable template, and the repeated shell-account structure across multiple victims describe an operating criminal enterprise, not a single opportunistic theft.',
  },
};

export const legalRouting = {
  documents: { routed: true, note: 'Subpoena for the closing file and bank records; Court Order if the title company or bank resists production.' },
  digital: { routed: true, note: 'Subpoena for email provider logs; Search Warrant for device imaging of seized hardware.' },
  physical: { routed: true, note: 'Search Warrant typically required for devices and cash seized from a person of interest.' },
  financial: { routed: true, note: 'Subpoena for bank records; International Requests for the offshore account and exchange.' },
  interviews: { routed: false, note: 'Facilitator judgment call — voluntary interviews unless a witness becomes uncooperative.' },
  intelligence: { routed: false, note: 'Facilitator judgment call — cross-reference and OSINT work rarely needs compulsory process.' },
};

export const grandJuryRubric = {
  citableFacts: centralFacts.map((f) => f.id),
  threshold: 3,
  guidance:
    'The team must be able to cite specific, evidence-backed facts for at least 3 of the 5 central facts ' +
    'to secure indictment. Spoofed Wiring Instructions and Mule Account Network are the structural core of ' +
    'the case — a presentation missing both should not pass even if it clears the numeric threshold on the ' +
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
  { id: 'def-01', name: 'Motion to Suppress — Digital Evidence', effect: 'Challenges the chain of custody on the inbox access logs; if unresolved, treat Silent Inbox Access as uncorroborated going forward.', corroborationImmune: 'inbox_compromise' },
  { id: 'def-02', name: 'Competing IT Forensics Expert', effect: 'Defense expert argues the foreign-IP logins could be a VPN service the closing officer used innocently; contest with a second corroborating Digital or Interviews card.', corroborationImmune: 'inbox_compromise' },
  { id: 'def-03', name: 'Witness Recantation — Whitlow', effect: 'Marcus Whitlow, under pressure, claims the account was opened for him without his knowledge; independent physical/financial evidence resists this if already developed.', corroborationImmune: 'mule_network' },
  { id: 'def-04', name: 'Discovery Demand', effect: 'Defense demands early production of your working files; costs the team 1 round of delay across the Pending Returns Queue.', corroborationImmune: null },
  { id: 'def-05', name: 'Change of Venue Motion', effect: 'Procedural delay; advance Command Pressure one level unless resolved.', corroborationImmune: null },
  { id: 'def-06', name: 'Chain-of-Custody Challenge — Seized Devices', effect: 'Contests handling of the laptop and phones seized from Whitlow; needs a second independent category to corroborate.', corroborationImmune: 'mule_network' },
  { id: 'def-07', name: 'Shell Company Ownership Dispute', effect: 'Defense claims Whitlow Logistics LLC was fraudulently registered in Whitlow\'s name by someone else entirely; the account-registration IP match resists this if already developed.', corroborationImmune: 'mule_network' },
  { id: 'def-08', name: 'Jurisdictional Challenge — Offshore Transfer', effect: 'Defense argues the offshore leg falls outside domestic jurisdiction and should be excluded; the interagency data match directly rebuts this.', corroborationImmune: 'overseas_layering' },
  { id: 'def-09', name: 'Character/Reputation Evidence Motion', effect: 'Attempts to introduce unrelated favorable character evidence for Whitlow; facilitator judgment on relevance, generally low-impact if the financial trail is solid.', corroborationImmune: null },
  { id: 'def-10', name: 'Speedy Trial Pressure', effect: 'Defense pushes for an accelerated timeline; advance Command Pressure one level unless the team has already reached Probable Cause (16+).', corroborationImmune: null },
];

// Shown at a successful indictment — a fictional composite, not a
// dramatization of one real prosecution, but every mechanic here (inbox
// surveillance ahead of a live transaction, a lookalike domain timed to the
// moment of payment, a mule account, offshore layering) mirrors real,
// heavily-prosecuted business email compromise cases.
export const realWorldContext = {
  heading: 'The Real-World Pattern Behind This Case',
  paragraphs: [
    'Business email compromise is the single costliest category of cybercrime by real dollar loss reported to the FBI — and title/escrow companies are a favorite target precisely because large, one-time wire transfers are routine there, not suspicious. In one real 12-count federal indictment, defendants monitored victims\' email for financial transactions, then used spoofed emails impersonating internal staff and vendors to redirect payments from construction companies, private equity firms, title companies, and law firms across multiple states.',
    'The money-mule layer in this case is standard, not exaggerated: real BEC networks open accounts under thin shell-company registrations specifically to receive one large deposit and move it out again within hours, often forwarding a share overseas before a victim organization even notices the fraud. A Brooklyn federal case saw a defendant plead guilty to BEC and related schemes responsible for more than $50 million in losses, laundered through shell company accounts in the U.S. and abroad using unsuspecting middlemen to obscure the money\'s source.',
    'Multiple, earlier DOJ cases follow the exact structure this case does: unauthorized access to a victim\'s email inbox to monitor for a pending transaction, followed by a spoofed message with forged sender details sent at precisely the right moment to redirect the wire.',
  ],
  sources: [
    { title: 'Twelve indicted in multimillion dollar business email compromise scheme (IRS Criminal Investigation)', url: 'https://www.irs.gov/compliance/criminal-investigation/twelve-indicted-in-multimillion-dollar-business-email-compromise-scheme' },
    { title: 'Nigerian National Pleads Guilty to Series of Multi-Million Dollar Business Email Compromise Schemes (U.S. Secret Service)', url: 'https://www.secretservice.gov/newsroom/releases/2026/04/nigerian-national-pleads-guilty-series-multi-million-dollar-business' },
    { title: 'Nigerian National Sentenced for His Role in Multi-Million Dollar Business Email Compromise Scheme (DOJ, District of Maryland)', url: 'https://www.justice.gov/usao-md/pr/nigerian-national-sentenced-his-role-multi-million-dollar-business-email-compromise' },
  ],
};
