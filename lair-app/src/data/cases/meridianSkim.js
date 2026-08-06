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
    'A federal contracting officer flags a routine invoice audit anomaly: three "senior systems ' +
    'analysts" billed at full time on the modernization contract do not appear in the agency\'s own ' +
    'building access logs for the audit period. The contracting officer refers the matter for ' +
    'investigation rather than resolving it administratively.',
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
  { id: 'int-01', category: 'interviews', factId: 'silenced_accountant', name: 'Former Employee Interview', flavor: 'Raymond Okafor, on his time as Meridian\'s staff accountant.', caseDefining: false },
  { id: 'int-02', category: 'interviews', factId: 'silenced_accountant', name: 'Co-worker Statement', flavor: 'An HR staffer describes the complaint Okafor filed and withdrew.', caseDefining: true },
  { id: 'int-03', category: 'interviews', factId: 'phantom_staffing', name: 'Witness Interview', flavor: 'The agency\'s building-access supervisor, on the badge log discrepancy.', caseDefining: false },
  { id: 'int-04', category: 'interviews', factId: 'shell_companies', name: 'Former Employee Interview', flavor: 'A former Meridian bookkeeper describes the vendor onboarding process.', caseDefining: false },
  { id: 'int-05', category: 'interviews', factId: 'silenced_accountant', name: 'Conflicting Statement', flavor: 'Okafor\'s follow-up account no longer matches his first.', caseDefining: false },
  { id: 'int-06', category: 'interviews', factId: 'personal_enrichment', name: 'Witness Interview', flavor: 'The closing agent on the Lakeview property purchase.', caseDefining: false },

  // Documents
  { id: 'doc-01', category: 'documents', factId: 'phantom_staffing', name: 'Employment Records', flavor: 'Contract staffing roster listing the three "senior systems analysts."', caseDefining: false },
  { id: 'doc-02', category: 'documents', factId: 'phantom_staffing', name: 'Official Record', flavor: 'Submitted federal invoices for Q2–Q3 billing the phantom positions.', caseDefining: true },
  { id: 'doc-03', category: 'documents', factId: 'shell_companies', name: 'Corporate Filing', flavor: 'Shell entity formation filings for two newly-registered vendors.', caseDefining: true },
  { id: 'doc-04', category: 'documents', factId: 'shell_companies', name: 'Signed Contract', flavor: 'Vendor services agreement between Meridian and Shell Co.', caseDefining: false },
  { id: 'doc-05', category: 'documents', factId: 'silenced_accountant', name: 'Internal Memo', flavor: 'An audit memo about billing discrepancies, marked "Do Not Escalate."', caseDefining: false },
  { id: 'doc-06', category: 'documents', factId: 'altered_timesheets', name: 'Business Ledger', flavor: 'Original vs. revised timesheet printouts, side by side.', caseDefining: false },

  // Digital
  { id: 'dig-01', category: 'digital', factId: 'altered_timesheets', name: 'Metadata Analysis', flavor: 'HR system edit-history log for the phantom analysts\' timesheets.', caseDefining: true },
  { id: 'dig-02', category: 'digital', factId: 'phantom_staffing', name: 'VPN Activity Log', flavor: 'Login records for the three "billed" analyst accounts — empty.', caseDefining: true },
  { id: 'dig-03', category: 'digital', factId: 'altered_timesheets', name: 'Deleted File Recovery', flavor: 'An email recovered from backup after deletion.', caseDefining: false },
  { id: 'dig-04', category: 'digital', factId: 'shell_companies', name: 'Cloud Storage Files', flavor: "A shared drive folder linked to Voss's personal email.", caseDefining: false },
  { id: 'dig-05', category: 'digital', factId: 'silenced_accountant', name: 'Chat Application Backup', flavor: 'Slack messages between Voss and Okafor.', caseDefining: true },
  { id: 'dig-06', category: 'digital', factId: 'phantom_staffing', name: 'Authentication Logs', flavor: "Badge reader database export for the agency's front doors.", caseDefining: false },

  // Physical
  { id: 'phy-01', category: 'physical', factId: 'altered_timesheets', name: 'Handwriting Sample', flavor: 'A printed timesheet with handwritten corrections.', caseDefining: false },
  { id: 'phy-02', category: 'physical', factId: 'personal_enrichment', name: 'Inventory Record', flavor: "A listing of Voss's recently acquired assets, including a Lakeview property.", caseDefining: false },
  { id: 'phy-03', category: 'physical', factId: 'personal_enrichment', name: 'Photographs', flavor: "A photographed copy of a cashier's check found in Voss's files.", caseDefining: false },
  { id: 'phy-04', category: 'physical', factId: 'phantom_staffing', name: 'Access Log', flavor: "The agency front desk's physical sign-in binder.", caseDefining: false },
  { id: 'phy-05', category: 'physical', factId: 'altered_timesheets', name: 'Discarded Item Recovery', flavor: 'A discarded notepad with timesheet math matching the altered entries.', caseDefining: true },
  { id: 'phy-06', category: 'physical', factId: 'shell_companies', name: 'Physical Evidence', flavor: "A mailbox rental agreement for one of the shell companies.", caseDefining: false },

  // Financial
  { id: 'fin-01', category: 'financial', factId: 'shell_companies', name: 'Wire Transfer Record', flavor: 'Meridian → Shell Co. A.', caseDefining: false },
  { id: 'fin-02', category: 'financial', factId: 'shell_companies', name: 'Suspicious Activity Report', flavor: 'A bank-flagged pass-through: Shell Co. A → Shell Co. B.', caseDefining: true },
  { id: 'fin-03', category: 'financial', factId: 'personal_enrichment', name: 'Wire Transfer Record', flavor: "Shell Co. B → Voss's personal account.", caseDefining: true },
  { id: 'fin-04', category: 'financial', factId: 'personal_enrichment', name: 'Escrow Record', flavor: 'Closing statement for the Lakeview property purchase.', caseDefining: false },
  { id: 'fin-05', category: 'financial', factId: 'phantom_staffing', name: 'Financial Record', flavor: 'Federal payment disbursement records for the modernization contract.', caseDefining: false },
  { id: 'fin-06', category: 'financial', factId: 'shell_companies', name: 'Shell Company Registration', flavor: "Shell Co.'s bank account opening documents.", caseDefining: false },

  // Intelligence
  { id: 'intel-01', category: 'intelligence', factId: 'silenced_accountant', name: 'Confidential Source Report', flavor: 'A follow-up on the original whistleblower tip.', caseDefining: false },
  { id: 'intel-02', category: 'intelligence', factId: 'shell_companies', name: 'Prior Case Cross-Reference', flavor: "Corporate registry cross-reference on the shell companies' officers.", caseDefining: false },
  { id: 'intel-03', category: 'intelligence', factId: 'phantom_staffing', name: 'Criminal History Summary', flavor: 'Background check discrepancy on one of the "billed" analysts.', caseDefining: false },
  { id: 'intel-04', category: 'intelligence', factId: 'personal_enrichment', name: 'Asset Forfeiture Record', flavor: 'An asset search on Elena Voss.', caseDefining: false },
  { id: 'intel-05', category: 'intelligence', factId: 'silenced_accountant', name: 'Pattern Analysis', flavor: 'A pattern of prior complaints at Meridian from other employees.', caseDefining: false },
  { id: 'intel-06', category: 'intelligence', factId: 'shell_companies', name: 'Watchlist Match', flavor: 'A registered-agent cross-filing alert.', caseDefining: false },
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
