/*
  Case File — "The Bartholomew & Kline Extortion" (Cyber Crime /
  Extortion-Only Data Breach). Pure case data — see caseFileCaseUtils.js
  for shared helpers. Grounded in real "no ransomware" extortion group
  tactics: a phone-based social-engineering entry point, exclusive use of
  legitimate remote-access tools to evade detection, quiet exfiltration
  over weeks, and an escalating extortion campaign with an in-person
  pressure visit (see realWorldContext, below).
*/

export const caseMeta = {
  title: 'The Bartholomew & Kline Extortion',
  category: 'Cyber Crime',
  blurb: 'A law firm\'s systems still work fine — no ransomware, no encryption — but someone has thousands of privileged client files and wants to be paid to keep them quiet.',
  premise:
    'Bartholomew & Kline LLP, a regional law firm, received a message including a sample of confidential ' +
    'client files and a demand for payment to prevent full publication. Nothing was encrypted; no ' +
    'ransomware is present; IT can find no unauthorized software currently running. Weeks earlier, a ' +
    'paralegal had installed remote-access software after a phone call from someone claiming to be the ' +
    'firm\'s IT helpdesk — the intruders spent that whole time quietly copying files out using tools the ' +
    'firm\'s own systems already trusted.',
  initialComplaint:
    'Complainant: Managing Partner, Bartholomew & Kline LLP. Nature of complaint: the firm received an ' +
    'anonymous message including a sample of confidential client files and a demand for payment to ' +
    'prevent full publication. No ransomware or system encryption is present; IT staff can find no ' +
    'unauthorized software currently running. Referred for investigation.',
};

export const centralFacts = [
  {
    id: 'vishing_entry',
    title: 'Vishing Entry Point',
    summary:
      'Paralegal Carla Beaumont was tricked by a phone call from someone identifying himself as ' +
      '"Nathaniel Cross" of the firm\'s IT helpdesk into installing remote-access software for a ' +
      '"critical security update" that never existed.',
  },
  {
    id: 'living_off_land',
    title: 'Living-Off-the-Land Tools',
    summary:
      'The intruders used only legitimate remote-management software already trusted by the firm\'s real ' +
      'IT vendor — nothing that antivirus or standard monitoring would ever flag as malicious.',
  },
  {
    id: 'silent_exfiltration',
    title: 'Silent Exfiltration',
    summary:
      'Client files were copied out gradually, in small batches spread over several weeks, well before ' +
      'any extortion contact was made — timed specifically to stay under data-loss alert thresholds.',
  },
  {
    id: 'proof_of_life_sample',
    title: 'Proof-of-Life Sample',
    summary:
      'The extortion message included a small sample of stolen files — including material from one ' +
      'privileged, high-profile client matter — as proof before a payment demand was ever made.',
  },
  {
    id: 'followup_pressure',
    title: 'Follow-Up Pressure Campaign',
    summary:
      'After the firm delayed responding, the group escalated with repeated contact and an unannounced ' +
      'in-person visit to a firm office by someone posing as IT support — a known escalation tactic, not ' +
      'an empty threat.',
  },
];

export const factMatrix = [
  { factId: 'vishing_entry', categoryA: 'interviews', categoryB: 'digital', grandJury: true, caseDefiningEligible: true },
  { factId: 'living_off_land', categoryA: 'digital', categoryB: 'documents', grandJury: true, caseDefiningEligible: true },
  { factId: 'silent_exfiltration', categoryA: 'digital', categoryB: 'intelligence', grandJury: true, caseDefiningEligible: true },
  { factId: 'proof_of_life_sample', categoryA: 'documents', categoryB: 'digital', grandJury: true, caseDefiningEligible: true },
  { factId: 'followup_pressure', categoryA: 'interviews', categoryB: 'intelligence', grandJury: true, caseDefiningEligible: false },
];

export const evidenceCards = [
  // Interviews
  { id: 'int-01', category: 'interviews', ref: 'ref-int-person-of-interest', factId: 'vishing_entry', flavor: '"He knew my extension, my supervisor\'s name, everything — I had no reason to think it wasn\'t really IT." — paralegal Carla Beaumont, on the call from "Nathaniel Cross."', caseDefining: false },
  { id: 'int-02', category: 'interviews', ref: 'ref-int-coworker-statement', factId: 'followup_pressure', flavor: '"A man came to the front desk asking for \'the IT contact\' by name — when I said no one by that name worked here, he left without another word." — the firm\'s receptionist.', caseDefining: true },
  { id: 'int-03', category: 'interviews', ref: 'ref-int-witness', factId: 'vishing_entry', flavor: '"We never called about a security update that week — we don\'t even do phone-based installs, ever, for any client." — the firm\'s actual contracted IT vendor.', caseDefining: false },
  { id: 'int-04', category: 'interviews', ref: 'ref-int-expert-consultation', factId: 'living_off_land', flavor: '"There was nothing to catch — the tool they used is the exact same one your real IT vendor already had installed and whitelisted firm-wide." — an incident-response consultant.', caseDefining: true },
  { id: 'int-05', category: 'interviews', ref: 'ref-int-confidential-informant', factId: 'followup_pressure', flavor: '"This group doesn\'t encrypt anything — sample, wait, escalate, send someone in person if you go quiet. That\'s their whole playbook." — a confidential source tracking the group.', caseDefining: false },
  { id: 'int-06', category: 'interviews', ref: 'ref-int-conflicting-statement', factId: 'vishing_entry', flavor: 'In her first interview, Carla Beaumont said she "just clicked a link." In the follow-up, she recalls being walked through a full software installation, step by step, over the phone.', caseDefining: false },

  // Documents
  { id: 'doc-01', category: 'documents', ref: 'ref-doc-internal-memo', factId: 'vishing_entry', flavor: 'The firm\'s IT ticket system has no record of any "critical security update" ticket opened on the date Carla Beaumont says she received the call.', caseDefining: false },
  { id: 'doc-02', category: 'documents', ref: 'ref-doc-official-record', factId: 'proof_of_life_sample', flavor: 'The extortion message, logged as evidence, includes twelve sample documents and a demand: payment within seven days or the "full set" — described as thousands of files — will be published.', caseDefining: true },
  { id: 'doc-03', category: 'documents', ref: 'ref-doc-civil-court-filing', factId: 'proof_of_life_sample', flavor: 'One of the twelve sample documents matches a sealed filing from an active, high-profile client matter — confirming the sample wasn\'t random.', caseDefining: false },
  { id: 'doc-04', category: 'documents', ref: 'ref-doc-corporate-filing', factId: 'followup_pressure', flavor: 'A breach-disclosure filing from a different regional law firm, six months earlier, describes an identical no-ransomware extortion demand and a matching in-person follow-up visit.', caseDefining: false },
  { id: 'doc-05', category: 'documents', ref: 'ref-doc-insurance-policy', factId: 'living_off_land', flavor: 'Bartholomew & Kline\'s cyber insurance policy explicitly excludes coverage for incidents with "no malware or ransomware present" — complicating the firm\'s claim.', caseDefining: false },
  { id: 'doc-06', category: 'documents', ref: 'ref-doc-business-ledger', factId: 'silent_exfiltration', flavor: 'The remote-access vendor\'s own usage ledger shows session hours for Carla Beaumont\'s account nearly triple its historical monthly average, spread across five separate weeks.', caseDefining: false },

  // Digital
  { id: 'dig-01', category: 'digital', ref: 'ref-dig-authentication-logs', factId: 'vishing_entry', flavor: 'The remote-access software\'s own login log shows the installation session originating from Carla Beaumont\'s workstation at 2:41 PM, matching the call\'s timestamp on her office phone record.', caseDefining: true },
  { id: 'dig-02', category: 'digital', ref: 'ref-dig-metadata-analysis', factId: 'living_off_land', flavor: 'Software metadata confirms the remote-access tool used is the identical, digitally-signed application the firm\'s real IT vendor already had deployed — not a lookalike or modified copy.', caseDefining: false },
  { id: 'dig-03', category: 'digital', ref: 'ref-dig-cloud-storage-files', factId: 'silent_exfiltration', flavor: 'Cloud transfer logs show client files copied out in batches of under 200 megabytes, spread across seventeen separate sessions over five weeks — each batch small enough to avoid the firm\'s data-loss alert threshold.', caseDefining: true },
  { id: 'dig-04', category: 'digital', ref: 'ref-dig-email-header', factId: 'proof_of_life_sample', flavor: 'Header analysis on the extortion email traces it through three relay servers in three different countries before reaching the firm\'s inbox.', caseDefining: false },
  { id: 'dig-05', category: 'digital', ref: 'ref-dig-dark-web-listing', factId: 'followup_pressure', flavor: 'A dark web posting, made after the firm\'s initial silence, displays a countdown timer and previews three additional sample documents not included in the original message.', caseDefining: false },
  { id: 'dig-06', category: 'digital', ref: 'ref-dig-deleted-file-recovery', factId: 'living_off_land', flavor: 'Recovered deleted session logs show an attempt to clear the remote-access tool\'s activity history the day before the extortion message was sent.', caseDefining: false },

  // Physical
  { id: 'phy-01', category: 'physical', ref: 'ref-phy-digital-storage-media', factId: 'vishing_entry', flavor: 'A forensic image of Carla Beaumont\'s workstation confirms the remote-access software was installed during an active phone call, based on the machine\'s own timestamp logs.', caseDefining: false },
  { id: 'phy-02', category: 'physical', ref: 'ref-phy-access-log', factId: 'followup_pressure', flavor: 'The firm\'s lobby visitor log shows an unidentified man signed in as "IT Support — Follow-up Visit" nine days after the extortion message was sent, with no callback number provided.', caseDefining: true },
  { id: 'phy-03', category: 'physical', ref: 'ref-phy-surveillance-footage', factId: 'followup_pressure', flavor: 'Lobby camera footage shows the same visitor waiting eleven minutes, watching the reception desk closely, before leaving without further contact.', caseDefining: false },
  { id: 'phy-04', category: 'physical', ref: 'ref-phy-discarded-item-recovery', factId: 'vishing_entry', flavor: 'A sticky note in Carla Beaumont\'s desk trash lists a callback number "in case IT needs to reach me" — the number traces to a disposable internet-calling service.', caseDefining: false },
  { id: 'phy-05', category: 'physical', ref: 'ref-phy-inventory-record', factId: 'silent_exfiltration', flavor: 'An inventory of accessed client-matter folders during the intrusion window shows a clear focus on the firm\'s highest-value litigation files, not a random sweep.', caseDefining: false },
  { id: 'phy-06', category: 'physical', ref: 'ref-phy-physical-evidence', factId: 'followup_pressure', flavor: 'A business card left at the front desk by the in-person visitor lists a computer-support company that does not exist in any state business registry.', caseDefining: false },

  // Financial
  { id: 'fin-01', category: 'financial', ref: 'ref-fin-crypto-wallet', factId: 'proof_of_life_sample', flavor: 'The extortion demand specifies a cryptocurrency wallet address for payment, included directly alongside the twelve sample files.', caseDefining: true },
  { id: 'fin-02', category: 'financial', ref: 'ref-fin-wire-transfer', factId: 'followup_pressure', flavor: 'A bank record shows the firm initiated, then cancelled within the hour, a cryptocurrency purchase the same day as the in-person follow-up visit.', caseDefining: false },
  { id: 'fin-03', category: 'financial', ref: 'ref-fin-suspicious-activity-report', factId: 'followup_pressure', flavor: 'The bank\'s own SAR flags the cancelled cryptocurrency purchase as consistent with a client under active extortion pressure.', caseDefining: false },
  { id: 'fin-04', category: 'financial', ref: 'ref-fin-currency-exchange-record', factId: 'proof_of_life_sample', flavor: 'The demanded wallet address has previously received payments from at least one other confirmed extortion victim, all cashed out through the same overseas exchange.', caseDefining: false },
  { id: 'fin-05', category: 'financial', ref: 'ref-fin-financial-record', factId: 'living_off_land', flavor: 'The remote-access vendor\'s billing record shows the intrusion-window sessions were never separately invoiced to the firm — a ghost login riding silently on the firm\'s existing, paid license.', caseDefining: false },
  { id: 'fin-06', category: 'financial', ref: 'ref-fin-merchant-account-records', factId: 'vishing_entry', flavor: 'The callback number given to Carla Beaumont traces to a prepaid internet-calling merchant account, paid in cryptocurrency, active for only nine days around the call.', caseDefining: false },

  // Intelligence
  { id: 'intel-01', category: 'intelligence', ref: 'ref-intel-osint-summary', factId: 'followup_pressure', flavor: 'Public security reporting on a known no-ransomware extortion group describes an identical playbook: phone-based social engineering, legitimate remote-access tools, and in-person follow-up visits to professional-services firms.', caseDefining: false },
  { id: 'intel-02', category: 'intelligence', ref: 'ref-intel-prior-case-cross-reference', factId: 'followup_pressure', flavor: 'A cross-reference finds three other law firms hit by an identical vishing-plus-in-person-visit pattern in the past year, none of which resulted in a completed payment.', caseDefining: true },
  { id: 'intel-03', category: 'intelligence', ref: 'ref-intel-pattern-analysis', factId: 'silent_exfiltration', flavor: 'A pattern analysis of the seventeen transfer sessions shows each one deliberately sized just under the firm\'s data-loss alert threshold — this was tuned to the firm\'s specific defenses, not generic.', caseDefining: false },
  { id: 'intel-04', category: 'intelligence', ref: 'ref-intel-network-mapping', factId: 'living_off_land', flavor: 'Network mapping traces the remote-access sessions\' outbound connections to infrastructure previously attributed to the same extortion group in two other reported cases.', caseDefining: false },
  { id: 'intel-05', category: 'intelligence', ref: 'ref-intel-watchlist-match', factId: 'proof_of_life_sample', flavor: 'A blockchain-analytics watchlist flags the demanded payment wallet as tied to at least three other extortion campaigns against professional-services firms in the past year.', caseDefining: false },
  { id: 'intel-06', category: 'intelligence', ref: 'ref-intel-behavioral-assessment', factId: 'vishing_entry', flavor: 'A behavioral assessment of the caller\'s script — using Carla Beaumont\'s supervisor\'s name, her extension, and firm-specific jargon — matches a documented social-engineering playbook built on prior reconnaissance, not a cold call.', caseDefining: false },
];

export const evidenceByThreshold = {
  vishing_entry: {
    intake: 'An employee recalls a phone call from "IT" shortly before the intrusion began — nothing confirmed yet.',
    relevance: 'The firm\'s real IT vendor confirms they never made that call, and no ticket exists for the claimed "security update."',
    specific_and_articulable_facts: 'The caller knew the employee\'s supervisor\'s name, her extension, and firm-specific terminology — not generic script, but researched targeting.',
    probable_cause: 'A forensic image of her workstation confirms the software was installed live, during the call, matching the phone record\'s timestamp exactly.',
    beyond_a_reasonable_doubt: 'The vendor\'s denial, the researched script, the live-install timestamp match, and a traceable disposable callback number together rule out any innocent misunderstanding — this was a targeted, planned social-engineering call.',
  },
  living_off_land: {
    intake: 'IT can\'t find any malicious software on the firm\'s systems, despite a confirmed intrusion.',
    relevance: 'The remote-access tool used turns out to be the same, legitimate application the firm\'s real IT vendor already had deployed and trusted.',
    specific_and_articulable_facts: 'Software metadata confirms it\'s a genuine, digitally-signed copy — not a modified or lookalike version — explaining why nothing was ever flagged.',
    probable_cause: 'Billing records show the intrusion-window sessions were never separately invoiced — a ghost login hidden inside the firm\'s own paid license.',
    beyond_a_reasonable_doubt: 'The unmodified legitimate tool, the invisible billing, and a deliberate attempt to clear the session logs before the extortion message went out together describe a calculated evasion strategy, not luck.',
  },
  silent_exfiltration: {
    intake: 'Client files appear to have left the firm\'s systems at some point before the extortion contact.',
    relevance: 'Transfer logs show the files moved out gradually, in small batches, rather than all at once.',
    specific_and_articulable_facts: 'Each batch was sized just under the firm\'s own data-loss alert threshold — a deliberate, not accidental, choice.',
    probable_cause: 'An inventory of the accessed files shows a clear focus on the firm\'s highest-value litigation matters, not a random sweep.',
    beyond_a_reasonable_doubt: 'The threshold-tuned batch sizes, the targeted file selection, and the five-week span together describe a patient, deliberate collection operation built specifically around this firm\'s defenses.',
  },
  proof_of_life_sample: {
    intake: 'The firm received a message claiming to hold stolen client files, with a small sample attached.',
    relevance: 'One of the sample documents matches a sealed filing from an active, high-profile client matter — the sample wasn\'t random.',
    specific_and_articulable_facts: 'The payment wallet included in the demand has previously received funds from at least one other confirmed victim.',
    probable_cause: 'That same wallet is flagged on a blockchain-analytics watchlist tied to several other extortion campaigns against similar firms.',
    beyond_a_reasonable_doubt: 'The targeted sample, the reused payment wallet, and its documented history across multiple other victims together confirm this is an operating extortion enterprise, not an isolated bluff.',
  },
  followup_pressure: {
    intake: 'The firm delayed responding to the extortion demand — nothing further has happened yet, as far as anyone knows.',
    relevance: 'An unidentified visitor appeared at the firm\'s front desk asking for "the IT contact" by a name that doesn\'t match any real employee.',
    specific_and_articulable_facts: 'A confidential source describes this exact escalation sequence — sample, wait, follow-up contact, in-person visit — as this specific group\'s known playbook.',
    probable_cause: 'A breach disclosure from another regional law firm describes an identical pattern, down to the in-person visit, months earlier.',
    beyond_a_reasonable_doubt: 'The matching playbook, the cross-firm pattern, and network infrastructure tied to the same group across multiple cases together confirm a coordinated, repeat-offending extortion operation.',
  },
};

export const legalRouting = {
  documents: { routed: true, note: 'Subpoena for the firm\'s IT tickets and insurance records; Court Order if a vendor resists production.' },
  digital: { routed: true, note: 'Subpoena for remote-access vendor logs and email headers; Search Warrant for device imaging.' },
  physical: { routed: true, note: 'Search Warrant typically required for seized devices; visitor logs and footage are usually voluntarily produced.' },
  financial: { routed: true, note: 'Subpoena for bank records; International Requests for the payment wallet and exchange.' },
  interviews: { routed: false, note: 'Facilitator judgment call — voluntary interviews unless a witness becomes uncooperative.' },
  intelligence: { routed: false, note: 'Facilitator judgment call — OSINT and watchlist work rarely needs compulsory process.' },
};

export const grandJuryRubric = {
  citableFacts: centralFacts.map((f) => f.id),
  threshold: 3,
  guidance:
    'The team must be able to cite specific, evidence-backed facts for at least 3 of the 5 central facts ' +
    'to secure indictment. Vishing Entry Point and Silent Exfiltration are the structural core of the case ' +
    '— a presentation missing both should not pass even if it clears the numeric threshold on the other ' +
    'three.',
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
  { id: 'def-01', name: 'Motion to Suppress — Digital Evidence', effect: 'Challenges the chain of custody on the remote-access vendor logs; if unresolved, treat Living-Off-the-Land Tools as uncorroborated going forward.', corroborationImmune: 'living_off_land' },
  { id: 'def-02', name: 'Competing IT Forensics Expert', effect: 'Defense expert argues the remote sessions could reflect legitimate, authorized vendor maintenance; contest with a second corroborating Digital or Documents card.', corroborationImmune: 'living_off_land' },
  { id: 'def-03', name: 'Witness Recantation — Beaumont', effect: 'Carla Beaumont, under pressure, downplays what she remembers of the call; independent log/phone-record evidence resists this if already developed.', corroborationImmune: 'vishing_entry' },
  { id: 'def-04', name: 'Discovery Demand', effect: 'Defense demands early production of your working files; costs the team 1 round of delay across the Pending Returns Queue.', corroborationImmune: null },
  { id: 'def-05', name: 'Change of Venue Motion', effect: 'Procedural delay; advance Command Pressure one level unless resolved.', corroborationImmune: null },
  { id: 'def-06', name: 'Chain-of-Custody Challenge — Digital Evidence', effect: 'Contests handling of the forensic workstation image and recovered logs; needs a second independent category to corroborate.', corroborationImmune: 'silent_exfiltration' },
  { id: 'def-07', name: 'Attribution Dispute — Extortion Wallet', effect: 'Defense disputes that the payment wallet can be reliably tied to this specific incident; the watchlist and exchange-history evidence resist this if already developed.', corroborationImmune: 'proof_of_life_sample' },
  { id: 'def-08', name: 'Unrelated Visitor Defense', effect: 'Defense argues the in-person lobby visitor was unconnected to the extortion campaign; the fake business card and cross-firm pattern match directly rebut this.', corroborationImmune: 'followup_pressure' },
  { id: 'def-09', name: 'Character/Reputation Evidence Motion', effect: 'Attempts to introduce unrelated favorable character evidence for a person of interest; facilitator judgment on relevance, generally low-impact if the technical trail is solid.', corroborationImmune: null },
  { id: 'def-10', name: 'Speedy Trial Pressure', effect: 'Defense pushes for an accelerated timeline; advance Command Pressure one level unless the team has already reached Probable Cause (16+).', corroborationImmune: null },
];

// Shown at a successful indictment — a fictional composite, not a
// dramatization of one real prosecution, but every mechanic here (a
// phone-based social-engineering entry point, exclusive use of legitimate
// remote-access tools, slow threshold-tuned exfiltration, and an escalating
// extortion campaign with an in-person visit) reflects a real, documented
// and growing category of cyber extortion.
export const realWorldContext = {
  heading: 'The Real-World Pattern Behind This Case',
  paragraphs: [
    'Data extortion without ransomware is a real, fast-growing category, distinct from traditional ransomware — the attacker skips encryption entirely and relies purely on the threat of publishing stolen data. One real group has focused specifically on U.S. law firms since 2023, stealing sensitive data and threatening to publish or sell it unless paid, using phone calls, phishing emails, and — when remote approaches fail — in-person visits by operatives posing as IT support staff, exactly as this case dramatizes.',
    'That same real group relies on legitimate system-management tools throughout an intrusion specifically so that traditional antivirus products are unlikely to ever flag the activity — the "living off the land" approach this case is built around is not a narrative convenience, it\'s the actual reason these intrusions go undetected for weeks.',
    'The financial stakes are real too: one documented case study, built on a leaked negotiation chat and the blockchain trail the payment left, found a U.S. government entity paid roughly $1 million to a separate data-extortion group to keep stolen files from being published.',
  ],
  sources: [
    { title: 'Silent Ransom Group Sends Operatives Into Law Firm Offices: 38 Firms Already Leaked (Tech Times)', url: 'https://www.techtimes.com/articles/317293/20260527/silent-ransom-group-sends-operatives-law-firm-offices-38-firms-already-leaked.htm' },
    { title: 'U.S. Government Entity Paid Kairos $1 Million in Data-Theft Extortion Case (The Hacker News)', url: 'https://thehackernews.com/2026/07/us-government-entity-paid-kairos-group.html' },
    { title: 'World Leaks Data Extortion: What You Need to Know (Fortra)', url: 'https://www.fortra.com/blog/world-leaks-data-extortion-what-you-need-know' },
  ],
};
