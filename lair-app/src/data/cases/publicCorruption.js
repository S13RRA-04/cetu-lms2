/*
  Case File — "The Harbor District Rezoning" (Public Corruption).
  Pure case data — see caseFileCaseUtils.js for shared helpers.
*/

export const caseMeta = {
  title: 'The Harbor District Rezoning',
  category: 'Public Corruption',
  blurb: 'A city councilman takes bribes to steer a waterfront rezoning vote and the contracts that follow it.',
  premise:
    'The city council just approved a controversial rezoning of the Harbor District that cleared the way ' +
    'for a large mixed-use development. A losing bidder on the project\'s subcontracts files a complaint ' +
    'alleging the winning developer paid off the councilman who championed the rezoning, and that the ' +
    'competitive bidding process for the follow-on city contracts was quietly rigged in the developer\'s favor.',
  initialComplaint:
    'Complainant: losing bidder, via written complaint to City Procurement. Nature of complaint: awarded ' +
    'subcontractor\'s bid specification matches a proprietary construction method used exclusively by that ' +
    'subcontractor. Complainant alleges the specification was written around a predetermined winner. ' +
    'Referred for investigation rather than administrative rebid.',
};

export const centralFacts = [
  {
    id: 'bribery_payments',
    title: 'Bribery Payments',
    summary:
      'Councilman Martin Cole received cash and gifts from developer Priya Anand in exchange for his ' +
      'vote and advocacy on the Harbor District rezoning.',
  },
  {
    id: 'shell_consulting',
    title: 'Shell Consulting Firm',
    summary:
      'The bribes were disguised as legitimate payments by routing them through a sham "consulting" LLC, ' +
      'Coastal Advisory Partners, with no real clients or work product.',
  },
  {
    id: 'rigged_bid_specs',
    title: 'Rigged Bid Specifications',
    summary:
      'The city\'s subcontractor bid specifications were quietly tailored, before the RFP was ever ' +
      'publicly posted, to match Anand\'s preferred subcontractor\'s proprietary construction method.',
  },
  {
    id: 'staffer_intimidation',
    title: 'Staffer Intimidation',
    summary:
      'City planning staffer Marcus Whitfield flagged the bid specification irregularities internally ' +
      'and was abruptly reassigned after raising the issue.',
  },
  {
    id: 'offshore_transfer',
    title: 'Offshore Kickback',
    summary:
      'A portion of the laundered proceeds was moved to an offshore account through a co-conspirator, ' +
      'Iris Delgado, separating a share of the money from the domestic paper trail entirely.',
  },
];

export const factMatrix = [
  { factId: 'bribery_payments', categoryA: 'financial', categoryB: 'interviews', grandJury: true, caseDefiningEligible: true },
  { factId: 'shell_consulting', categoryA: 'documents', categoryB: 'financial', grandJury: true, caseDefiningEligible: true },
  { factId: 'rigged_bid_specs', categoryA: 'documents', categoryB: 'digital', grandJury: true, caseDefiningEligible: true },
  { factId: 'staffer_intimidation', categoryA: 'interviews', categoryB: 'intelligence', grandJury: true, caseDefiningEligible: true },
  { factId: 'offshore_transfer', categoryA: 'financial', categoryB: 'intelligence', grandJury: true, caseDefiningEligible: true },
];

export const evidenceCards = [
  // Interviews
  { id: 'int-01', category: 'interviews', factId: 'bribery_payments', name: 'Person of Interest Interview', flavor: '"I don\'t recall the specifics of that arrangement — you\'d have to ask my staff." — Councilman Cole\'s voluntary interview, on the Coastal Advisory payments.', caseDefining: false },
  { id: 'int-02', category: 'interviews', factId: 'bribery_payments', name: 'Co-worker Statement', flavor: '"He called three colleagues personally the night before the vote — I\'d never seen him lobby that hard for anything." — a council aide, on Councilman Cole\'s push for the Harbor District rezoning.', caseDefining: false },
  { id: 'int-03', category: 'interviews', factId: 'shell_consulting', name: 'Former Employee Interview', flavor: '"We paid Coastal Advisory $15,000 a month flat and I never once saw a deliverable — I asked what we were paying for and got told not to worry about it." — a former Anand Development employee.', caseDefining: false },
  { id: 'int-04', category: 'interviews', factId: 'staffer_intimidation', name: 'Witness Interview', flavor: '"Three days after I sent that memo, I was moved to permit intake — a demotion in everything but title." — city planning staffer Marcus Whitfield.', caseDefining: false },
  { id: 'int-05', category: 'interviews', factId: 'staffer_intimidation', name: 'Conflicting Statement', flavor: 'In his first interview, planning staffer Marcus Whitfield called the bid specification "obviously written for one bidder." A week later, after a conversation with his new supervisor, he calls it "a routine technical requirement."', caseDefining: true },
  { id: 'int-06', category: 'interviews', factId: 'rigged_bid_specs', name: 'Confidential Informant', flavor: '"A city contact told me flat out not to bother bidding seriously — it was already decided." — a competing subcontractor on the Harbor District bid.', caseDefining: false },

  // Documents
  { id: 'doc-01', category: 'documents', factId: 'bribery_payments', name: 'Meeting Minutes', flavor: 'Council session minutes for the rezoning vote show no recusal filed by Councilman Cole, despite his brother-in-law\'s name appearing on a related LLC formed six weeks earlier.', caseDefining: false },
  { id: 'doc-02', category: 'documents', factId: 'shell_consulting', name: 'Corporate Filing', flavor: 'Formation documents for "Coastal Advisory Partners LLC," filed by Councilman Cole\'s brother-in-law nine days before the rezoning vote, listing a UPS Store as its business address.', caseDefining: true },
  { id: 'doc-03', category: 'documents', factId: 'shell_consulting', name: 'Signed Contract', flavor: 'A signed "consulting services" agreement between Anand Development and shell firm Coastal Advisory Partners LLC — no scope of work, no deliverables, a flat $15,000 monthly retainer.', caseDefining: false },
  { id: 'doc-04', category: 'documents', factId: 'bribery_payments', name: 'Licensing/Permit Records', flavor: 'Developer Priya Anand\'s zoning permits were approved in 11 days — city records show the average review time for comparable projects is 90.', caseDefining: false },
  { id: 'doc-05', category: 'documents', factId: 'rigged_bid_specs', name: 'Civil Court Filing', flavor: 'The posted bid specification requires a patented construction method held exclusively by developer Priya Anand\'s preferred subcontractor — no other firm in the region is licensed to use it.', caseDefining: true },
  { id: 'doc-06', category: 'documents', factId: 'staffer_intimidation', name: 'Internal Memo', flavor: 'A planning department memo calls the bid specification "unusually narrow, worth a second look" — stamped received, never logged as reviewed, buried three folders deep in the project file.', caseDefining: false },

  // Digital
  { id: 'dig-01', category: 'digital', factId: 'rigged_bid_specs', name: 'Email Header', flavor: 'Email headers show Councilman Cole\'s chief of staff exchanging four messages with Anand Development about "bid language" eleven days before the RFP was ever posted publicly.', caseDefining: false },
  { id: 'dig-02', category: 'digital', factId: 'bribery_payments', name: 'Text Messages', flavor: 'A text from developer Priya Anand to Councilman Cole: "Same as last time, usual arrangement, my guy will reach out." Cole replies with a thumbs-up.', caseDefining: true },
  { id: 'dig-03', category: 'digital', factId: 'rigged_bid_specs', name: 'Deleted File Recovery', flavor: 'A deleted draft of the bid specification, recovered from a city laptop, shows three separate edit passes narrowing the language until only one subcontractor could qualify.', caseDefining: false },
  { id: 'dig-04', category: 'digital', factId: 'staffer_intimidation', name: 'Metadata Analysis', flavor: 'Document metadata shows planning staffer Marcus Whitfield\'s "unusually narrow" memo was edited twice after his reassignment — both edits soften the original language.', caseDefining: false },
  { id: 'dig-05', category: 'digital', factId: 'shell_consulting', name: 'Cloud Storage Files', flavor: 'A shared drive folder containing shell firm Coastal Advisory\'s books is shared with exactly one outside address — Councilman Cole\'s personal Gmail.', caseDefining: false },
  { id: 'dig-06', category: 'digital', factId: 'shell_consulting', name: 'Account Registration', flavor: 'Coastal Advisory Partners LLC\'s bank account registration lists Councilman Cole\'s home address as its official place of business.', caseDefining: true },

  // Physical
  { id: 'phy-01', category: 'physical', factId: 'bribery_payments', name: 'Photographs', flavor: 'Photographs show developer Priya Anand handing Councilman Cole a sealed envelope at a private dinner, six days before the rezoning vote.', caseDefining: true },
  { id: 'phy-02', category: 'physical', factId: 'bribery_payments', name: 'Surveillance Footage', flavor: 'Parking garage footage timestamps Councilman Cole\'s car and developer Priya Anand\'s car arriving four minutes apart, both leaving within the hour, the night of the dinner.', caseDefining: false },
  { id: 'phy-03', category: 'physical', factId: 'rigged_bid_specs', name: 'Discarded Item Recovery', flavor: 'A notebook page pulled from a city trash bin has handwritten bid numbers penciled in — they match developer Priya Anand\'s eventual submission to the dollar.', caseDefining: false },
  { id: 'phy-04', category: 'physical', factId: 'bribery_payments', name: 'Access Log', flavor: 'City hall\'s badge log shows developer Priya Anand visiting Councilman Cole\'s office seven times in the six weeks before the vote — more than any other visitor that quarter.', caseDefining: false },
  { id: 'phy-05', category: 'physical', factId: 'bribery_payments', name: 'Inventory Record', flavor: 'An inventory of items in Councilman Cole\'s office: a set of golf clubs still in the box, and a watch with a jeweler\'s tag reading "P. Anand — gift."', caseDefining: false },
  { id: 'phy-06', category: 'physical', factId: 'staffer_intimidation', name: 'Physical Evidence', flavor: 'A torn Coastal Advisory Partners business card, found taped inside planning staffer Marcus Whitfield\'s old desk drawer — he says he doesn\'t remember putting it there.', caseDefining: false },

  // Financial
  { id: 'fin-01', category: 'financial', factId: 'shell_consulting', name: 'Vendor Invoice', flavor: 'Coastal Advisory Partners\' monthly invoices to Anand Development all read "strategic consulting services rendered" — same wording, same $15,000 amount, every month for a year.', caseDefining: false },
  { id: 'fin-02', category: 'financial', factId: 'shell_consulting', name: 'Wire Transfer Record', flavor: 'A wire transfer: Anand Development → shell firm Coastal Advisory Partners LLC, $15,000, memo line reads "Q3 consulting retainer."', caseDefining: false },
  { id: 'fin-03', category: 'financial', factId: 'bribery_payments', name: 'Wire Transfer Record', flavor: 'A wire transfer: shell firm Coastal Advisory Partners LLC → an account held by Councilman Cole\'s brother-in-law, $12,000, four days before the rezoning vote.', caseDefining: false },
  { id: 'fin-04', category: 'financial', factId: 'offshore_transfer', name: 'Offshore Account Record', flavor: 'A $9,000 share of Coastal Advisory\'s funds moved to an offshore account tied to co-conspirator Iris Delgado, routed through a currency exchange with no other client history.', caseDefining: true },
  { id: 'fin-05', category: 'financial', factId: 'bribery_payments', name: 'Suspicious Activity Report', flavor: 'The bank\'s own SAR flags the Coastal Advisory-to-relative transfer as matching the exact profile of a structured payment — flagged without any customer complaint.', caseDefining: false },
  { id: 'fin-06', category: 'financial', factId: 'offshore_transfer', name: 'Currency Exchange Record', flavor: 'Co-conspirator Iris Delgado\'s offshore transfer passed through a currency exchange that has processed no other client transactions in the past two years.', caseDefining: false },

  // Intelligence
  { id: 'intel-01', category: 'intelligence', factId: 'bribery_payments', name: 'Confidential Source Report', flavor: '"Everyone at city hall already knew — his vote on anything zoning-related came with a price, we just never had proof." — a confidential source, on Councilman Cole.', caseDefining: false },
  { id: 'intel-02', category: 'intelligence', factId: 'offshore_transfer', name: 'Prior Case Cross-Reference', flavor: 'Anand Development\'s shell-consulting-firm pattern matches, almost line for line, a public-corruption case prosecuted in a different state three years ago.', caseDefining: false },
  { id: 'intel-03', category: 'intelligence', factId: 'offshore_transfer', name: 'Asset Forfeiture Record', flavor: 'Co-conspirator Iris Delgado\'s offshore holdings were already flagged in an unrelated federal forfeiture action eighteen months before this case opened.', caseDefining: true },
  { id: 'intel-04', category: 'intelligence', factId: 'bribery_payments', name: 'Pattern Analysis', flavor: 'A pattern analysis of Councilman Cole\'s committee votes over three years shows every favorable vote landing within two weeks of a developer Priya Anand project milestone.', caseDefining: false },
  { id: 'intel-05', category: 'intelligence', factId: 'staffer_intimidation', name: 'Behavioral Assessment', flavor: 'A behavioral assessment notes planning staffer Marcus Whitfield\'s abrupt shift from detailed, specific answers to vague, rehearsed-sounding ones — consistent with pressure, not a change of heart.', caseDefining: true },
  { id: 'intel-06', category: 'intelligence', factId: 'offshore_transfer', name: 'Watchlist Match', flavor: 'Co-conspirator Iris Delgado\'s name is flagged on an interagency financial watchlist, tied to offshore shell activity in two other unrelated cases.', caseDefining: false },
];

export const evidenceByThreshold = {
  bribery_payments: {
    intake: 'A losing bidder alleges the councilman\'s rezoning vote was bought — no corroboration yet.',
    relevance: 'City hall badge logs show the developer visiting the councilman\'s office repeatedly before the vote, far more than any other stakeholder.',
    specific_and_articulable_facts: 'Recovered texts reference "the usual arrangement" days before the vote, and a wire transfer moves from the consulting LLC to a relative\'s account on the same timeline.',
    probable_cause: 'Photographs place the councilman and developer together accepting an envelope, corroborated by the same-week wire transfer and a gift inventory found in his office.',
    beyond_a_reasonable_doubt: 'The full timeline — visits, cash, gifts, the wire transfer, and the vote itself — lines up too precisely to be coincidence; the councilman\'s own texts remove any doubt about what was being arranged.',
  },
  shell_consulting: {
    intake: 'A "consulting" LLC with no public footprint shows up in the developer\'s vendor records.',
    relevance: 'Corporate filings show the LLC was formed by the councilman\'s brother-in-law shortly before the first invoice was issued.',
    specific_and_articulable_facts: 'The LLC\'s invoices describe no actual deliverable — just vague "strategic consulting services" billed in round numbers.',
    probable_cause: 'The LLC\'s bank account registration lists the councilman\'s own home address, and a shared drive folder ties its accountant directly to his personal email.',
    beyond_a_reasonable_doubt: 'Every dollar the developer paid the LLC can be traced onward to the councilman or his relatives — the "consulting firm" never did a single hour of real work.',
  },
  rigged_bid_specs: {
    intake: 'A rival contractor notes the winning bid specification matches one firm\'s proprietary method unusually closely.',
    relevance: 'A confidential informant says competitors were told the outcome was "already decided" before they even submitted.',
    specific_and_articulable_facts: 'Emails between the councilman\'s staff and the developer discuss the bid language weeks before the RFP was ever posted publicly.',
    probable_cause: 'A recovered deleted draft of the specification shows edits narrowing it specifically toward the developer\'s subcontractor.',
    beyond_a_reasonable_doubt: 'The publicly posted bid specification and the pre-RFP draft are functionally identical — the "competition" was decided before it began.',
  },
  staffer_intimidation: {
    intake: 'A planning staffer who flagged the bid specs as unusually narrow was reassigned shortly afterward.',
    relevance: 'His interview describes the reassignment as abrupt and unexplained, immediately following his internal memo.',
    specific_and_articulable_facts: 'Document metadata shows that memo was quietly edited after his reassignment, softening its original language.',
    probable_cause: 'A behavioral assessment and a follow-up interview show his account changing noticeably after a conversation with his new supervisor.',
    beyond_a_reasonable_doubt: 'Between the timing of the reassignment, the edited memo, and his walked-back statement, the pattern of retaliation is clear and internally consistent.',
  },
  offshore_transfer: {
    intake: 'A portion of the consulting LLC\'s funds cannot be traced past a currency exchange with no other client history.',
    relevance: 'That exchange converted funds into an offshore account tied to a previously unknown associate, Iris Delgado.',
    specific_and_articulable_facts: 'Delgado is already flagged on an interagency watchlist for offshore shell activity unrelated to this case.',
    probable_cause: 'Her offshore assets were separately flagged in a prior forfeiture action, establishing a pattern rather than a one-off transfer.',
    beyond_a_reasonable_doubt: 'The offshore account\'s inflow amounts match the consulting LLC\'s outflows almost exactly — this was a deliberate channel to move a share of the bribe beyond the reach of a routine domestic trace.',
  },
};

export const legalRouting = {
  documents: { routed: true, note: 'Subpoena for city records/LLC filings; Court Order if the developer or LLC resists production.' },
  digital: { routed: true, note: 'Subpoena for email/communications records; Search Warrant for device imaging.' },
  physical: { routed: true, note: 'Search Warrant typically required for office/on-premises physical evidence.' },
  financial: { routed: true, note: 'Subpoena for bank records; International Requests for the offshore account.' },
  interviews: { routed: false, note: 'Facilitator judgment call — voluntary interviews unless a witness becomes uncooperative.' },
  intelligence: { routed: false, note: 'Facilitator judgment call — watchlist/background work rarely needs compulsory process.' },
};

export const grandJuryRubric = {
  citableFacts: centralFacts.map((f) => f.id),
  threshold: 3,
  guidance:
    'The team must be able to cite specific, evidence-backed facts for at least 3 of the 5 central facts ' +
    'to secure indictment. Bribery Payments and Shell Consulting Firm are the structural core of the case ' +
    '— a presentation missing both should not pass even if it clears the numeric threshold on the other three.',
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
  { id: 'def-01', name: 'Motion to Suppress — Financial Records', effect: 'Challenges the wire-transfer chain between the LLC and the councilman\'s relative; if unresolved, treat Shell Consulting Firm as uncorroborated going forward.', corroborationImmune: 'shell_consulting' },
  { id: 'def-02', name: 'Competing Consulting-Industry Expert', effect: 'Defense expert testifies the consulting fees were plausible market rate for the described work; contest with a second corroborating Financial or Documents card.', corroborationImmune: 'shell_consulting' },
  { id: 'def-03', name: 'Witness Recantation — Whitfield', effect: 'Whitfield, under pressure, further walks back his account; independent metadata/behavioral evidence resists this if already developed.', corroborationImmune: 'staffer_intimidation' },
  { id: 'def-04', name: 'Discovery Demand', effect: 'Defense demands early production of your working files; costs the team 1 round of delay across the Pending Returns Queue.', corroborationImmune: null },
  { id: 'def-05', name: 'Change of Venue Motion', effect: 'Procedural delay; advance Command Pressure one level unless resolved.', corroborationImmune: null },
  { id: 'def-06', name: 'Chain-of-Custody Challenge — Photographic Evidence', effect: 'Contests handling of the dinner-meeting photographs; needs a second independent category to corroborate.', corroborationImmune: 'bribery_payments' },
  { id: 'def-07', name: 'Shell Company Ownership Dispute', effect: 'Defense claims Coastal Advisory was legitimately unrelated to the councilman; the account registration/cloud-storage evidence resists this if already developed.', corroborationImmune: 'shell_consulting' },
  { id: 'def-08', name: 'Good-Faith Procurement Process Defense', effect: 'Frames the bid specification as ordinary technical drafting, not favoritism; the pre-RFP emails and deleted draft directly rebut this.', corroborationImmune: 'rigged_bid_specs' },
  { id: 'def-09', name: 'Character/Reputation Evidence Motion', effect: 'Attempts to introduce unrelated favorable character evidence for the councilman; facilitator judgment on relevance, generally low-impact if the financial trail is solid.', corroborationImmune: null },
  { id: 'def-10', name: 'Speedy Trial Pressure', effect: 'Defense pushes for an accelerated timeline; advance Command Pressure one level unless the team has already reached Probable Cause (16+).', corroborationImmune: null },
];

// Shown at a successful indictment — a fictional composite, not a
// dramatization of one real prosecution, but every mechanic here (a bribed
// vote, a rigged bid, a shell "consulting" firm, a punished whistleblower)
// mirrors real, recurring public-corruption cases.
export const realWorldContext = {
  heading: 'The Real-World Pattern Behind This Case',
  paragraphs: [
    'Public officials trading votes or contract favoritism for bribes is a persistent, real pattern in U.S. local government, not a rare event. Former Los Angeles City Councilman José Huizar took a $500,000 bribe from a real estate developer to help push a downtown project through the approval process.',
    'A Jackson, Mississippi city councilman served more than a year in federal prison for accepting $25,000 in exchange for his vote on a rezoning change. In Crystal City, Texas, a former councilman pleaded guilty to a bribery and kickback scheme tied to city contracts.',
    'Councilman Cole\'s arc in this case — a bribe, a shell "consulting" firm to launder it, a rigged procurement, and a staffer punished for flagging it — mirrors the recurring shape of these real prosecutions closely enough that none of it is exaggerated for the game.',
  ],
  sources: [
    { title: 'Real estate developer convicted of bribery (DOJ, Northern District of Texas)', url: 'https://www.justice.gov/usao-ndtx/pr/real-estate-developer-convicted-bribery' },
    { title: 'Former Crystal City councilman pleads guilty in bribery and kickback scheme (DOJ, Western District of Texas)', url: 'https://www.justice.gov/usao-wdtx/pr/former-crystal-city-councilman-pleads-guilty-role-bribery-and-kickback-scheme' },
  ],
};
