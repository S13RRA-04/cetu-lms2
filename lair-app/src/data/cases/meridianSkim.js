/*
  Case File — "The Meridian Consulting Skim" (White-Collar Crime / Fraud).
  Pure case data — see caseFileCaseUtils.js for the shared helpers that
  operate on this shape, and CaseFileFacilitator.jsx for how it's consumed.
  Card names are drawn from the official Evidence Card Reference
  (../caseFileEvidenceReference.js); `flavor` is this case's specific spin
  on a generic reference title.
*/

export const caseMeta = {
  title: 'The Meridian Consulting Skim',
  category: 'White-Collar Crime',
  blurb: 'A federal contractor bills for phantom staff while its CFO launders the overpayments through shell companies.',
  premise:
    'Meridian Consulting Group holds a federal staffing subcontract supporting a regional agency ' +
    'IT modernization project. An anonymous tip alleges Meridian has been billing the government ' +
    'for technical staff who were never actually assigned to the contract, and that a portion of ' +
    'the resulting overpayments has been quietly funneled out of the company through entities that ' +
    'do not appear to do any real business at all.',
  initialComplaint:
    'Complainant: Contracting Officer, regional agency IT Modernization Program. Nature of complaint: ' +
    'routine invoice audit found three billed "Senior Systems Analyst" positions with no matching ' +
    'entries in the agency\'s building access log for the billing period. Referred for investigation — ' +
    'discrepancy could not be resolved administratively.',
};

export const centralFacts = [
  {
    id: 'phantom_staffing',
    title: 'Phantom Staffing',
    summary:
      'Meridian invoiced the government for hours worked by employees who were not actually ' +
      'performing (or in some cases, not employed to perform) the billed work.',
  },
  {
    id: 'shell_companies',
    title: 'Shell Company Layering',
    summary:
      'CFO Elena Voss set up two shell entities used to receive and launder a share of the ' +
      'inflated invoice proceeds before they reached her personally.',
  },
  {
    id: 'silenced_accountant',
    title: 'Silenced Internal Witness',
    summary:
      'A Meridian staff accountant, Raymond Okafor, noticed the billing irregularities internally ' +
      'and was pressured into staying quiet rather than reporting them.',
  },
  {
    id: 'altered_timesheets',
    title: 'Altered Digital Timesheets',
    summary:
      'Timesheet records in Meridian\'s HR system were edited after the fact to make phantom hours ' +
      'match the fraudulent invoices already sent to the government.',
  },
  {
    id: 'personal_enrichment',
    title: 'Personal Enrichment',
    summary:
      'A portion of the laundered proceeds was used by Voss for personal real estate purchases, ' +
      'tying the scheme directly to personal financial gain rather than corporate slush funding.',
  },
];

export const factMatrix = [
  { factId: 'phantom_staffing', categoryA: 'documents', categoryB: 'digital', grandJury: true, caseDefiningEligible: true },
  { factId: 'shell_companies', categoryA: 'financial', categoryB: 'documents', grandJury: true, caseDefiningEligible: true },
  { factId: 'silenced_accountant', categoryA: 'interviews', categoryB: 'intelligence', grandJury: true, caseDefiningEligible: false },
  { factId: 'altered_timesheets', categoryA: 'digital', categoryB: 'physical', grandJury: true, caseDefiningEligible: true },
  { factId: 'personal_enrichment', categoryA: 'financial', categoryB: 'physical', grandJury: true, caseDefiningEligible: false },
];

export const evidenceCards = [
  // Interviews
  // Four-tier proof-of-concept (see caseFileEvidenceDeck.js / caseFileCaseUtils.js):
  // ref replaces inline name, tiers replaces the static flavor. ref-int-former-employee's
  // maxTier is 3, so this card's Develop button stops offering Search Warrant.
  {
    id: 'int-01', category: 'interviews', ref: 'ref-int-former-employee', factId: 'silenced_accountant', caseDefining: false,
    tiers: [
      { tier: 1, narrative_entry: 'Raymond Okafor describes a routine three years as Meridian\'s staff accountant — nothing unusual, nothing worth mentioning.' },
      { tier: 2, narrative_entry: 'Under a subpoenaed follow-up interview, Okafor is more specific: he flagged a billing discrepancy to his supervisor months before the invoices in question were even sent.' },
      { tier: 3, narrative_entry: 'Compelled by court order to answer directly, Okafor confirms he was told the discrepancy was "handled" and that pursuing it further would jeopardize his upcoming performance review.' },
    ],
  },
  { id: 'int-02', category: 'interviews', factId: 'silenced_accountant', name: 'Co-worker Statement', flavor: '"He came to me about the billing thing in March, then a week later told me to forget he\'d ever said anything." — an HR staffer, on the complaint staff accountant Raymond Okafor filed and withdrew.', caseDefining: true },
  { id: 'int-03', category: 'interviews', factId: 'phantom_staffing', name: 'Witness Interview', flavor: '"Those three badge numbers were never issued — I checked twice." — the agency\'s building-access supervisor, on the three billed "Senior Systems Analyst" positions.', caseDefining: false },
  { id: 'int-04', category: 'interviews', factId: 'shell_companies', name: 'Former Employee Interview', flavor: '"Elena set up two new vendors herself that quarter — usually the CFO doesn\'t handle onboarding personally." — a former Meridian bookkeeper.', caseDefining: false },
  { id: 'int-05', category: 'interviews', factId: 'silenced_accountant', name: 'Conflicting Statement', flavor: 'In his first interview, staff accountant Raymond Okafor said he "never really looked into" the billing numbers. In the follow-up, he can\'t explain how he already knew the exact invoice totals.', caseDefining: false },
  { id: 'int-06', category: 'interviews', factId: 'personal_enrichment', name: 'Witness Interview', flavor: '"The down payment came as a cashier\'s check — unusual for a purchase this size." — the closing agent on CFO Elena Voss\'s recent lakeside property purchase.', caseDefining: false },

  // Documents
  { id: 'doc-01', category: 'documents', factId: 'phantom_staffing', name: 'Employment Records', flavor: 'The Q1–Q3 staffing roster bills three "Senior Systems Analyst" positions — Priya Chen, Marcus Webb, and David Tran — at 40 hours a week apiece since January.', caseDefining: false },
  { id: 'doc-02', category: 'documents', factId: 'phantom_staffing', name: 'Official Record', flavor: 'Meridian\'s Q2–Q3 invoices bill the government $187,000 for the three "Senior Systems Analyst" positions — Chen, Webb, and Tran — named on the staffing roster.', caseDefining: true },
  { id: 'doc-03', category: 'documents', factId: 'shell_companies', name: 'Corporate Filing', flavor: 'Formation filings for two shell vendors, "Beacon Advisory Group" and "Crestline Solutions LLC," registered nine days apart, sharing the same registered agent — neither with a business address that isn\'t a UPS Store.', caseDefining: true },
  { id: 'doc-04', category: 'documents', factId: 'shell_companies', name: 'Signed Contract', flavor: 'A signed "strategic advisory" services agreement between Meridian and shell vendor Beacon Advisory Group — no scope of work attached, no deliverables specified, just a flat monthly fee.', caseDefining: false },
  { id: 'doc-05', category: 'documents', factId: 'silenced_accountant', name: 'Internal Memo', flavor: 'An internal audit memo flags the three phantom analyst billings as "unusual." A handwritten note in the margin reads "Do Not Escalate," initialed but not dated.', caseDefining: false },
  { id: 'doc-06', category: 'documents', factId: 'altered_timesheets', name: 'Business Ledger', flavor: 'Two printed timesheet versions for the same pay period — the revised copy adds 120 hours across the three phantom analyst names that don\'t appear on the original.', caseDefining: false },

  // Digital
  { id: 'dig-01', category: 'digital', factId: 'altered_timesheets', name: 'Metadata Analysis', flavor: 'The HR system\'s edit log shows the three phantom analysts\' timesheets were all modified 61 days after the pay period closed — well past the 30-day correction window.', caseDefining: true },
  { id: 'dig-02', category: 'digital', factId: 'phantom_staffing', name: 'VPN Activity Log', flavor: 'VPN login records for the three billed "Senior Systems Analyst" accounts — Chen, Webb, and Tran — show zero authentication events for the entire billing period.', caseDefining: true },
  { id: 'dig-03', category: 'digital', factId: 'altered_timesheets', name: 'Deleted File Recovery', flavor: 'A deleted email recovered from backup: Okafor to himself, subject line "billing question — don\'t send yet," sent the same week as his withdrawn complaint.', caseDefining: false },
  { id: 'dig-04', category: 'digital', factId: 'shell_companies', name: 'Cloud Storage Files', flavor: 'A shared drive folder holding both shell vendors\' formation paperwork is shared with exactly one external address — CFO Elena Voss\'s personal Gmail.', caseDefining: false },
  { id: 'dig-05', category: 'digital', factId: 'silenced_accountant', name: 'Chat Application Backup', flavor: 'Recovered Slack messages: CFO Elena Voss tells staff accountant Raymond Okafor "it\'s handled, don\'t make this a thing" three days after his internal complaint, then asks if he\'s "still good for the promotion conversation next month."', caseDefining: true },
  { id: 'dig-06', category: 'digital', factId: 'phantom_staffing', name: 'Authentication Logs', flavor: 'The agency\'s badge reader database has no entries at all for any of the three billed "Senior Systems Analysts" — not one badge was ever issued in those names.', caseDefining: false },

  // Physical
  { id: 'phy-01', category: 'physical', factId: 'altered_timesheets', name: 'Handwriting Sample', flavor: 'A printed timesheet with hour totals penciled into the margin by hand — the pencil totals match the revised digital numbers exactly; the printed ones don\'t.', caseDefining: false },
  { id: 'phy-02', category: 'physical', factId: 'personal_enrichment', name: 'Inventory Record', flavor: 'An asset inventory lists a $640,000 lakeside property purchased by CFO Elena Voss four months after Meridian\'s first invoice to the shell vendors.', caseDefining: false },
  { id: 'phy-03', category: 'physical', factId: 'personal_enrichment', name: 'Photographs', flavor: 'A photographed cashier\'s check for $95,000, made out to a title company, found in CFO Elena Voss\'s personal files — the purchaser line is blank.', caseDefining: false },
  { id: 'phy-04', category: 'physical', factId: 'phantom_staffing', name: 'Access Log', flavor: 'The agency\'s paper sign-in binder — the backup for when badge readers fail — has no entries for the three phantom analysts either, for the entire audit period.', caseDefining: false },
  { id: 'phy-05', category: 'physical', factId: 'altered_timesheets', name: 'Discarded Item Recovery', flavor: 'A notepad pulled from an office trash bin shows handwritten addition — 40, 40, 40, totaling 120 — matching the exact hours later added to the revised timesheets.', caseDefining: true },
  { id: 'phy-06', category: 'physical', factId: 'shell_companies', name: 'Physical Evidence', flavor: 'A UPS Store mailbox rental agreement for shell vendor Beacon Advisory Group, signed by someone using a name that doesn\'t match any registered officer on file.', caseDefining: false },

  // Financial
  { id: 'fin-01', category: 'financial', factId: 'shell_companies', name: 'Wire Transfer Record', flavor: 'A wire transfer: Meridian Consulting Group → shell vendor Beacon Advisory Group, $62,000, memo line reads "Q2 consulting services."', caseDefining: false },
  // Four-tier proof-of-concept, capped case: ref-fin-suspicious-activity-report's
  // maxTier is 2, so this card's Develop button stops offering Court Order —
  // the SAR narrative has nothing further to reveal past the subpoenaed detail.
  {
    id: 'fin-02', category: 'financial', ref: 'ref-fin-suspicious-activity-report', factId: 'shell_companies', caseDefining: true,
    tiers: [
      { tier: 1, narrative_entry: 'A bank-flagged pass-through, $58,000: shell vendor Beacon Advisory Group → shell vendor Crestline Solutions LLC.' },
      { tier: 2, narrative_entry: 'The bank\'s full SAR narrative shows the same pass-through pattern recurring four times in the audit period, each transfer landing just under the reporting threshold.' },
    ],
  },
  { id: 'fin-03', category: 'financial', factId: 'personal_enrichment', name: 'Wire Transfer Record', flavor: 'A wire transfer: shell vendor Crestline Solutions LLC → an account in CFO Elena Voss\'s name, $58,000, three days after the Beacon-to-Crestline pass-through.', caseDefining: true },
  { id: 'fin-04', category: 'financial', factId: 'personal_enrichment', name: 'Escrow Record', flavor: 'The lakeside property\'s closing statement shows a $95,000 down payment paid by cashier\'s check — the same amount, same day, as the wire that left Crestline Solutions.', caseDefining: false },
  { id: 'fin-05', category: 'financial', factId: 'phantom_staffing', name: 'Financial Record', flavor: 'Federal disbursement records confirm the agency paid Meridian\'s full invoiced amount for the three billed "Senior Systems Analyst" positions — no partial payments, no rejected line items.', caseDefining: false },
  { id: 'fin-06', category: 'financial', factId: 'shell_companies', name: 'Shell Company Registration', flavor: 'Shell vendor Beacon Advisory Group\'s bank account was opened eleven days before its first invoice to Meridian — a $500 opening deposit, no other clients on record.', caseDefining: false },

  // Intelligence
  { id: 'intel-01', category: 'intelligence', factId: 'silenced_accountant', name: 'Confidential Source Report', flavor: 'A follow-up contact with the original tipster: "ask about the two accountants who quit that department in the last year — Okafor isn\'t the first."', caseDefining: false },
  { id: 'intel-02', category: 'intelligence', factId: 'shell_companies', name: 'Prior Case Cross-Reference', flavor: 'A corporate registry cross-reference: the registered agent behind shell vendor Beacon Advisory Group has formed six other shell entities in the past two years, four now under separate state investigation.', caseDefining: false },
  { id: 'intel-03', category: 'intelligence', factId: 'phantom_staffing', name: 'Criminal History Summary', flavor: 'A background check on one of the three billed "Senior Systems Analysts," Marcus Webb, turns up a Social Security number issued to someone else entirely.', caseDefining: false },
  { id: 'intel-04', category: 'intelligence', factId: 'personal_enrichment', name: 'Asset Forfeiture Record', flavor: 'An asset search on CFO Elena Voss finds no other real estate purchases in the five years prior — the lakeside property is a first, and a large one, on a CFO\'s reported salary.', caseDefining: false },
  { id: 'intel-05', category: 'intelligence', factId: 'silenced_accountant', name: 'Pattern Analysis', flavor: 'HR records show two prior internal complaints about "vendor irregularities" in the last 18 months — both closed without action, both predating Okafor\'s.', caseDefining: false },
  { id: 'intel-06', category: 'intelligence', factId: 'shell_companies', name: 'Watchlist Match', flavor: 'An automated registered-agent alert flags shell vendor Crestline Solutions LLC as sharing a filing address with a company already on a state fraud watchlist.', caseDefining: false },
];

export const evidenceByThreshold = {
  phantom_staffing: {
    intake: 'Three billed analysts don\'t show up in the agency\'s own access logs for the audit period — could be a records error.',
    relevance: 'The staffing roster lists all three analysts as full-time on-site; badge data shows none of them ever badged in.',
    specific_and_articulable_facts: 'VPN logs show no remote logins from those accounts either — the analysts appear to have done no verifiable work at all during the billed period.',
    probable_cause: 'Federal disbursement records confirm the government paid out in full for all three phantom positions, invoice by invoice.',
    beyond_a_reasonable_doubt: 'Cross-referenced against every available access record, the three positions were never worked in any form — the billing was fabricated from the outset.',
  },
  shell_companies: {
    intake: 'A vendor services agreement references a company with no public web presence and a UPS Store mailing address.',
    relevance: 'Corporate filings show the "vendor" was formed nine days before its first invoice to Meridian, by a registered agent with no other clients.',
    specific_and_articulable_facts: 'A second shell company receives a same-day pass-through transfer from the first, each time in an amount just under a reporting threshold.',
    probable_cause: 'The registered officer of both shell companies is a relative of Elena Voss with no other business activity on record.',
    beyond_a_reasonable_doubt: 'The full transfer chain — Meridian to Shell Co. A to Shell Co. B — accounts for the entire margin between what the government paid and what real staffing would have cost.',
  },
  silenced_accountant: {
    intake: 'An internal audit memo about billing discrepancies is marked "Do Not Escalate" in the file, with no explanation on its face.',
    relevance: 'Staff accountant Raymond Okafor raised the same discrepancy informally weeks before that memo was written.',
    specific_and_articulable_facts: 'HR\'s complaint log shows Okafor filed and then withdrew a formal complaint about the billing within the same week.',
    probable_cause: 'Recovered Slack messages show Voss telling Okafor the discrepancy is "handled" and reminding him about an upcoming performance review.',
    beyond_a_reasonable_doubt: 'Okafor\'s own account, corroborated by the message thread, describes an explicit choice between silence and his job.',
  },
  altered_timesheets: {
    intake: 'A printed timesheet in Meridian\'s files has handwritten corrections that don\'t match the digital system\'s current totals.',
    relevance: 'The HR system\'s edit history shows several timesheet entries were modified more than 60 days after the pay period closed.',
    specific_and_articulable_facts: 'The edits consistently increase billed hours for the three phantom analysts, never for anyone else.',
    probable_cause: 'A discarded notepad recovered from Voss\'s office shows manual arithmetic matching the exact hour totals later entered into the system.',
    beyond_a_reasonable_doubt: 'The original (unedited) timesheet backups, recovered separately, show zero hours logged for the phantom analysts before the after-the-fact edits.',
  },
  personal_enrichment: {
    intake: 'A property deed for a lakeside address lists Elena Voss as owner, purchased around the time of the audit period.',
    relevance: 'The closing statement for that purchase shows a down payment paid by cashier\'s check rather than a traceable personal account.',
    specific_and_articulable_facts: 'The cashier\'s check traces back to funds withdrawn from Shell Co. B days earlier.',
    probable_cause: 'A direct transfer record shows Shell Co. B moving funds into an account in Voss\'s name shortly before the property purchase.',
    beyond_a_reasonable_doubt: 'The dollar amount of the transfer and the down payment match to the cent, closing the loop from federal overpayment to personal asset.',
  },
};

export const legalRouting = {
  documents: { routed: true, note: 'Subpoena for contract/invoice records; Court Order if Meridian resists production.' },
  digital: { routed: true, note: 'Subpoena for system logs; Search Warrant for forensic imaging of workstations.' },
  physical: { routed: true, note: 'Search Warrant typically required for on-premises physical evidence.' },
  financial: { routed: true, note: 'Subpoena for bank records; International Requests if funds move offshore (not used in this case).' },
  interviews: { routed: false, note: 'Facilitator judgment call — voluntary interviews unless a witness becomes uncooperative.' },
  intelligence: { routed: false, note: 'Facilitator judgment call — background/registry work, rarely needs compulsory process.' },
};

export const grandJuryRubric = {
  citableFacts: centralFacts.map((f) => f.id),
  threshold: 3,
  guidance:
    'The team must be able to cite specific, evidence-backed facts (not vague summary) for at least 3 of ' +
    'the 5 central facts to secure indictment. Phantom Staffing and Shell Company Layering are the ' +
    'structural core of the case — a presentation missing both should not pass even if it clears the ' +
    'numeric threshold on the other three.',
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
  '(facilitator discretion, e.g. a successful Motion to Suppress removing a fact the team never corroborated).';

export const defenseCounterplayCards = [
  { id: 'def-01', name: 'Motion to Suppress — Digital Evidence', effect: 'Challenges the VPN/badge-log evidence chain; if unresolved, treat one Digital fact as uncorroborated for Grand Jury purposes going forward.', corroborationImmune: 'phantom_staffing' },
  { id: 'def-02', name: 'Competing Financial Expert', effect: 'Defense expert offers an alternate explanation for the wire transfer pattern; contest with a corroborating second Financial or Documents card.', corroborationImmune: 'shell_companies' },
  { id: 'def-03', name: 'Witness Recantation — Okafor', effect: 'Okafor, under pressure, walks back parts of his statement; the Slack message evidence (dig-05) provides independent corroboration if already developed.', corroborationImmune: 'silenced_accountant' },
  { id: 'def-04', name: 'Discovery Demand', effect: 'Defense demands early production of your working files; costs the team 1 round of delay across the Pending Returns Queue.', corroborationImmune: null },
  { id: 'def-05', name: 'Change of Venue Motion', effect: 'Procedural delay; advance Command Pressure one level unless resolved.', corroborationImmune: null },
  { id: 'def-06', name: 'Chain-of-Custody Challenge — Physical Evidence', effect: 'Contests handling of the notepad/timesheet physical evidence; needs a second independent category to corroborate.', corroborationImmune: 'altered_timesheets' },
  { id: 'def-07', name: 'Shell Company Ownership Dispute', effect: 'Defense claims the shell companies were legitimately unrelated to Voss; the registry cross-reference (intel-02) resists this if already developed.', corroborationImmune: 'shell_companies' },
  { id: 'def-08', name: 'Good-Faith Accounting Error Defense', effect: 'Frames the timesheet edits as innocent correction; the original unedited backups (band: beyond_a_reasonable_doubt reveal) directly rebut this.', corroborationImmune: 'altered_timesheets' },
  { id: 'def-09', name: 'Character/Reputation Evidence Motion', effect: 'Attempts to introduce unrelated favorable character evidence for Voss; facilitator judgment on relevance, generally low-impact if the financial trail is solid.', corroborationImmune: null },
  { id: 'def-10', name: 'Speedy Trial Pressure', effect: 'Defense pushes for an accelerated timeline; advance Command Pressure one level unless the team has already reached Probable Cause (16+).', corroborationImmune: null },
];

// Shown at a successful indictment — this case is a fictional composite, not
// a dramatization of one real prosecution, but every mechanic in it (phantom
// billing, shell-company layering, a silenced internal witness) is a
// documented, recurring pattern in real government-contractor fraud cases.
export const realWorldContext = {
  heading: 'The Real-World Pattern Behind This Case',
  paragraphs: [
    'Billing the government for staff who never actually did the work — "phantom" or "ghost" employees — is a well-documented, recurring fraud pattern, not a rare scheme. In 2023, VJ Associates paid $3.13 million to resolve DOJ charges for billing government-funded infrastructure projects for hours that were never actually worked.',
    'The scale can run far higher: one of the world\'s largest consulting firms paid $337.5 million — among the largest procurement false-claims settlements in DOJ history — after a former employee\'s whistleblower complaint exposed improper government billing that had gone on for more than a decade.',
    'Layering the proceeds through shell companies before they reach an individual, the way CFO Elena Voss does here, is likewise a recurring feature of real contractor-fraud and money-laundering prosecutions — it\'s the same basic playbook investigators look for whenever a corporate vendor with no real staff or operations shows up in a payment chain.',
  ],
  sources: [
    { title: 'Government contractor agrees to plead guilty to fraudulently billing federal and state programs (DOJ, District of Massachusetts)', url: 'https://www.justice.gov/usao-ma/pr/government-contractor-agrees-plead-guilty-fraudulently-billing-federal-and-state' },
  ],
};
