/*
  Case File — "The Solace Robotics Exfiltration" (Cyber Crime / Insider
  Trade-Secret Theft). Pure case data — see caseFileCaseUtils.js for shared
  helpers. Grounded in real Economic Espionage Act prosecution patterns: a
  departing engineer's download spike, exfiltration to personal storage, a
  competitor relationship that predates resignation, and a rival product
  that mirrors the stolen work (see realWorldContext, below).
*/

export const caseMeta = {
  title: 'The Solace Robotics Exfiltration',
  category: 'Cyber Crime',
  blurb: 'A senior engineer downloads the company\'s core source code weeks before quitting — then a competitor\'s prototype starts looking very familiar.',
  premise:
    'Solace Robotics, a warehouse-automation startup, ran a routine exit audit after senior engineer Ethan ' +
    'Kowalski resigned — and found he had downloaded thousands of files, including the company\'s core ' +
    'navigation source code, in the two weeks before giving notice. Kowalski has since joined Vantage ' +
    'Autonomy, a well-funded direct competitor. Vantage\'s newly unveiled prototype shows navigation ' +
    'behavior and hardware choices that closely mirror specific, undisclosed elements of Solace\'s ' +
    'proprietary design.',
  initialComplaint:
    'Complainant: General Counsel, Solace Robotics. Nature of complaint: exit-audit review of a departed ' +
    'senior engineer\'s account activity shows bulk downloads of proprietary navigation source code and ' +
    'hardware design files in the two weeks before his resignation, followed by employment at a direct ' +
    'competitor. Referred for investigation.',
};

export const centralFacts = [
  {
    id: 'mass_download',
    title: 'Mass Download Before Resignation',
    summary:
      'Senior engineer Ethan Kowalski downloaded thousands of files, including Solace\'s core navigation ' +
      'source code, in the two weeks before giving notice — far outside his normal access pattern.',
  },
  {
    id: 'personal_cloud_exfil',
    title: 'Personal Cloud Exfiltration',
    summary:
      'The downloaded files were uploaded to a personal cloud storage account, not any Solace-approved ' +
      'system, in the window before Kowalski\'s badge and credentials were deactivated.',
  },
  {
    id: 'competitor_contact_predates',
    title: 'Competitor Contact Predates Resignation',
    summary:
      'Message and payment records show Kowalski was already in contact with, and compensated by, ' +
      'Vantage Autonomy weeks before he gave notice at Solace — contradicting any claim of coincidence.',
  },
  {
    id: 'deleted_evidence',
    title: 'Deleted Evidence',
    summary:
      'Forensic recovery of deleted files and browser history shows Kowalski attempted to erase records ' +
      'of the downloads and uploads before returning his company laptop.',
  },
  {
    id: 'product_overlap',
    title: 'Design Overlap',
    summary:
      'Vantage Autonomy\'s newly unveiled prototype shows navigation logic and hardware choices that ' +
      'closely mirror specific, undisclosed elements of Solace\'s proprietary files.',
  },
];

export const factMatrix = [
  { factId: 'mass_download', categoryA: 'digital', categoryB: 'documents', grandJury: true, caseDefiningEligible: true },
  { factId: 'personal_cloud_exfil', categoryA: 'digital', categoryB: 'physical', grandJury: true, caseDefiningEligible: true },
  { factId: 'competitor_contact_predates', categoryA: 'interviews', categoryB: 'digital', grandJury: true, caseDefiningEligible: true },
  { factId: 'deleted_evidence', categoryA: 'digital', categoryB: 'intelligence', grandJury: true, caseDefiningEligible: false },
  { factId: 'product_overlap', categoryA: 'documents', categoryB: 'intelligence', grandJury: true, caseDefiningEligible: true },
];

export const evidenceCards = [
  // Interviews
  { id: 'int-01', category: 'interviews', ref: 'ref-int-person-of-interest', factId: 'competitor_contact_predates', flavor: '"I only started talking to Vantage after I gave notice — the timing is a coincidence." — Ethan Kowalski\'s exit interview.', caseDefining: false },
  { id: 'int-02', category: 'interviews', ref: 'ref-int-coworker-statement', factId: 'mass_download', flavor: '"He was in the office past midnight three nights that last week — I remember because he never used to stay that late." — a Solace colleague, on Ethan Kowalski\'s final two weeks.', caseDefining: true },
  { id: 'int-03', category: 'interviews', ref: 'ref-int-former-employee', factId: 'product_overlap', flavor: '"The navigation demo just... appeared, fully working, about six weeks after Ethan started. That\'s not normal build time for what they showed." — a former Vantage Autonomy employee.', caseDefining: false },
  { id: 'int-04', category: 'interviews', ref: 'ref-int-witness', factId: 'competitor_contact_predates', flavor: '"Our exit-audit system flags download volume automatically — his numbers were nine times his own historical average." — a Solace IT security analyst.', caseDefining: false },
  { id: 'int-05', category: 'interviews', ref: 'ref-int-expert-consultation', factId: 'product_overlap', flavor: '"Two independent engineering teams don\'t converge on the same obscure sensor-fusion workaround by accident — I\'ve seen this exact solution exactly once before, in Solace\'s own conference talks." — an independent robotics expert.', caseDefining: true },
  { id: 'int-06', category: 'interviews', ref: 'ref-int-conflicting-statement', factId: 'competitor_contact_predates', flavor: 'In his first interview, Ethan Kowalski said he\'d "never spoken to anyone at Vantage" before resigning. Records later show a signed offer letter dated three weeks earlier — he now says he "forgot."', caseDefining: false },

  // Documents
  { id: 'doc-01', category: 'documents', ref: 'ref-doc-employment-records', factId: 'mass_download', flavor: 'Solace\'s IT access summary shows Ethan Kowalski\'s file-download volume for his final two weeks at nine times his own twelve-month average.', caseDefining: true },
  { id: 'doc-02', category: 'documents', ref: 'ref-doc-signed-contract', factId: 'competitor_contact_predates', flavor: 'Ethan Kowalski\'s signed offer letter from Vantage Autonomy is dated three weeks before his resignation letter to Solace.', caseDefining: true },
  { id: 'doc-03', category: 'documents', ref: 'ref-doc-corporate-filing', factId: 'product_overlap', flavor: 'Vantage Autonomy\'s recent patent filing uses phrasing for its "novel" sensor-fusion approach that matches, nearly word for word, an internal Solace design document.', caseDefining: true },
  { id: 'doc-04', category: 'documents', ref: 'ref-doc-internal-memo', factId: 'mass_download', flavor: 'A Solace internal security memo flagged Kowalski\'s download spike as "review within 48 hours" — the review was never opened before his last day.', caseDefining: false },
  { id: 'doc-05', category: 'documents', ref: 'ref-doc-civil-court-filing', factId: 'product_overlap', flavor: 'Solace\'s civil trade-secret complaint against Vantage Autonomy, filed in parallel, identifies the same three design elements this investigation is examining.', caseDefining: false },
  { id: 'doc-06', category: 'documents', ref: 'ref-doc-official-record', factId: 'deleted_evidence', flavor: 'A forensic examiner\'s official report documents a factory reset performed on Kowalski\'s company laptop two days before it was returned — outside Solace\'s standard offboarding procedure.', caseDefining: false },

  // Digital
  { id: 'dig-01', category: 'digital', ref: 'ref-dig-authentication-logs', factId: 'mass_download', flavor: 'VPN access logs show Ethan Kowalski connecting from home between 11 PM and 2 AM on three of his final ten workdays — a pattern with no precedent in his prior eighteen months at Solace.', caseDefining: false },
  { id: 'dig-02', category: 'digital', ref: 'ref-dig-cloud-storage-files', factId: 'personal_cloud_exfil', flavor: 'A personal cloud storage account registered to Kowalski shows upload activity matching, minute for minute, the timestamps of his largest Solace file downloads.', caseDefining: true },
  { id: 'dig-03', category: 'digital', ref: 'ref-dig-email-header', factId: 'competitor_contact_predates', flavor: 'An email from a Vantage Autonomy recruiter to Kowalski\'s personal address — subject line "Let\'s talk terms" — is dated a full month before his Solace resignation.', caseDefining: false },
  { id: 'dig-04', category: 'digital', ref: 'ref-dig-deleted-file-recovery', factId: 'deleted_evidence', flavor: 'Recovered deleted browser history from Kowalski\'s laptop shows searches for "how to permanently delete cloud upload history" two days before he returned the device.', caseDefining: true },
  { id: 'dig-05', category: 'digital', ref: 'ref-dig-metadata-analysis', factId: 'mass_download', flavor: 'File metadata confirms the downloaded set includes Solace\'s core navigation source code repository in its entirety, not the isolated modules Kowalski\'s role required access to.', caseDefining: false },
  { id: 'dig-06', category: 'digital', ref: 'ref-dig-chat-application-backup', factId: 'competitor_contact_predates', flavor: 'A recovered chat backup shows Kowalski telling the Vantage recruiter "I can bring the nav stack knowledge, just need to time my exit right" — five weeks before he resigned.', caseDefining: true },

  // Physical
  { id: 'phy-01', category: 'physical', ref: 'ref-phy-digital-storage-media', factId: 'personal_cloud_exfil', flavor: 'A personal USB drive seized from Ethan Kowalski\'s home contains a complete mirror of the files downloaded from Solace in his final two weeks.', caseDefining: true },
  { id: 'phy-02', category: 'physical', ref: 'ref-phy-access-log', factId: 'mass_download', flavor: 'Solace\'s physical badge log shows Kowalski entering the building after 10 PM on the same three nights his VPN logs show anomalous remote access.', caseDefining: false },
  { id: 'phy-03', category: 'physical', ref: 'ref-phy-surveillance-footage', factId: 'personal_cloud_exfil', flavor: 'Office security footage shows Kowalski connecting a USB drive to his workstation on his second-to-last day, outside any approved IT-transfer procedure.', caseDefining: false },
  { id: 'phy-04', category: 'physical', ref: 'ref-phy-discarded-item-recovery', factId: 'deleted_evidence', flavor: 'A printed checklist found discarded in Kowalski\'s old desk reads "wipe drive, clear history, check cloud" — three items, all checked off.', caseDefining: false },
  { id: 'phy-05', category: 'physical', ref: 'ref-phy-inventory-record', factId: 'personal_cloud_exfil', flavor: 'An inventory of devices seized from Kowalski\'s home lists two external hard drives purchased the same week his Solace download volume spiked.', caseDefining: false },
  { id: 'phy-06', category: 'physical', ref: 'ref-phy-handwriting-sample', factId: 'competitor_contact_predates', flavor: 'Handwritten notes recovered from Kowalski\'s desk list compensation figures matching Vantage Autonomy\'s eventual offer, dated five weeks before his resignation.', caseDefining: false },

  // Financial
  { id: 'fin-01', category: 'financial', ref: 'ref-fin-financial-record', factId: 'competitor_contact_predates', flavor: 'Vantage Autonomy\'s payroll record shows a signing bonus payment to Ethan Kowalski dated eleven days before his resignation letter to Solace.', caseDefining: true },
  { id: 'fin-02', category: 'financial', ref: 'ref-fin-wire-transfer', factId: 'competitor_contact_predates', flavor: 'A relocation-assistance wire from Vantage Autonomy to Kowalski was sent while he was still drawing a full paycheck from Solace.', caseDefining: false },
  { id: 'fin-03', category: 'financial', ref: 'ref-fin-vendor-invoice', factId: 'product_overlap', flavor: 'A "consulting services" invoice Kowalski submitted to Vantage Autonomy is dated to a weekend he was still employed, and still had system access, at Solace.', caseDefining: false },
  { id: 'fin-04', category: 'financial', ref: 'ref-fin-merchant-account-records', factId: 'mass_download', flavor: 'Solace\'s corporate card records show Kowalski purchased a 4TB external hard drive the same week his download volume spiked.', caseDefining: false },
  { id: 'fin-05', category: 'financial', ref: 'ref-fin-escrow-record', factId: 'product_overlap', flavor: 'Vantage Autonomy\'s Series A funding, held in escrow pending a technical milestone, released nine days after the navigation demo that mirrors Solace\'s proprietary design.', caseDefining: false },
  { id: 'fin-06', category: 'financial', ref: 'ref-fin-shell-company-registration', factId: 'competitor_contact_predates', flavor: 'A shell consulting entity, funded by Vantage Autonomy, issued Kowalski\'s first payment — weeks before any official Vantage employment record begins.', caseDefining: false },

  // Intelligence
  { id: 'intel-01', category: 'intelligence', ref: 'ref-intel-osint-summary', factId: 'product_overlap', flavor: 'An open-source comparison of Vantage Autonomy\'s patent filing language against Solace\'s public conference talks finds three matching technical phrases not used anywhere else in the industry.', caseDefining: false },
  { id: 'intel-02', category: 'intelligence', ref: 'ref-intel-pattern-analysis', factId: 'mass_download', flavor: 'A pattern analysis of Kowalski\'s eighteen-month access history shows his final two weeks as a statistical outlier — no other period comes close to matching the download volume.', caseDefining: false },
  { id: 'intel-03', category: 'intelligence', ref: 'ref-intel-prior-case-cross-reference', factId: 'product_overlap', flavor: 'A cross-reference finds Vantage Autonomy\'s lead overseas investor was named, but not charged, in a prior economic-espionage inquiry involving a different robotics startup two years ago.', caseDefining: true },
  { id: 'intel-04', category: 'intelligence', ref: 'ref-intel-network-mapping', factId: 'competitor_contact_predates', flavor: 'Network mapping of the Vantage recruiter\'s outreach shows contact with two other Solace engineers in the same window Kowalski was recruited — neither has left the company.', caseDefining: false },
  { id: 'intel-05', category: 'intelligence', ref: 'ref-intel-behavioral-assessment', factId: 'deleted_evidence', flavor: 'A behavioral assessment notes Kowalski\'s uncharacteristic, methodical laptop-wiping checklist as inconsistent with the "I just wanted a clean handoff" explanation he gave in interview.', caseDefining: false },
  { id: 'intel-06', category: 'intelligence', ref: 'ref-intel-interagency-data-match', factId: 'product_overlap', flavor: 'A federal database match links Vantage Autonomy\'s overseas investor entity to two other companies currently under separate trade-secret review.', caseDefining: false },
];

export const evidenceByThreshold = {
  mass_download: {
    intake: 'A departed engineer\'s file downloads spiked in his final weeks — could be routine project wrap-up.',
    relevance: 'IT records show the spike was nine times his own historical average, with no matching project deadline on record.',
    specific_and_articulable_facts: 'The downloaded file set includes the company\'s entire core navigation source code repository, far beyond what his role required access to.',
    probable_cause: 'Badge and VPN logs place him in the office or connected remotely late at night on exactly the days the largest downloads occurred.',
    beyond_a_reasonable_doubt: 'The volume, the scope beyond his role, the after-hours access pattern, and an internal flag that was never acted on together describe a deliberate, targeted collection effort — not routine cleanup.',
  },
  personal_cloud_exfil: {
    intake: 'Some of the downloaded files may have left the company\'s systems entirely — unconfirmed.',
    relevance: 'A personal cloud storage account registered to the departed engineer shows matching upload activity.',
    specific_and_articulable_facts: 'The upload timestamps match the download timestamps to the minute.',
    probable_cause: 'A seized personal USB drive contains a complete mirror of the downloaded file set.',
    beyond_a_reasonable_doubt: 'Matching timestamps, a seized physical mirror of the files, and security footage of an unauthorized device connection together close any gap between "downloaded" and "left the building."',
  },
  competitor_contact_predates: {
    intake: 'The departed engineer joined a direct competitor shortly after resigning — not unusual on its own.',
    relevance: 'A recruiter email from that competitor, addressed to his personal account, predates his resignation by a month.',
    specific_and_articulable_facts: 'A signed offer letter and a signing bonus payment are both dated before his resignation letter to his original employer.',
    probable_cause: 'Recovered messages show him explicitly discussing "timing his exit" around bringing technical knowledge to the new employer, weeks before giving notice.',
    beyond_a_reasonable_doubt: 'The recruiter outreach, signed offer, bonus payment, and his own words together rule out coincidence — the relationship was active and compensated well before resignation.',
  },
  deleted_evidence: {
    intake: 'The returned company laptop appears to have been reset before handoff.',
    relevance: 'A forensic report confirms the reset occurred outside the company\'s standard offboarding procedure.',
    specific_and_articulable_facts: 'Recovered deleted browser history shows searches for how to permanently erase cloud upload records, days before the laptop was returned.',
    probable_cause: 'A discarded printed checklist — "wipe drive, clear history, check cloud" — all items checked — is recovered from his old desk.',
    beyond_a_reasonable_doubt: 'A behavioral assessment, the deleted search history, and the physical checklist together describe a methodical, premeditated attempt to erase evidence, not routine device hygiene.',
  },
  product_overlap: {
    intake: 'A competitor\'s new product looks unusually similar to unreleased proprietary work — could be independent convergence.',
    relevance: 'An independent expert identifies a specific, obscure technical solution shared by both systems that isn\'t used elsewhere in the industry.',
    specific_and_articulable_facts: 'The competitor\'s patent filing uses phrasing that closely matches an internal design document, not just the underlying concept.',
    probable_cause: 'The competitor\'s funding milestone released just days after unveiling the very feature that mirrors the proprietary design.',
    beyond_a_reasonable_doubt: 'The shared obscure technical solution, the matching filing language, and the funding timeline together rule out independent invention — this was built from stolen material.',
  },
};

export const legalRouting = {
  documents: { routed: true, note: 'Subpoena for personnel and corporate filings; Court Order if either company resists production.' },
  digital: { routed: true, note: 'Subpoena for cloud storage and email provider logs; Search Warrant for device imaging.' },
  physical: { routed: true, note: 'Search Warrant typically required for seized devices and storage media.' },
  financial: { routed: true, note: 'Subpoena for payroll and vendor payment records; Court Order for escrow/funding records if resisted.' },
  interviews: { routed: false, note: 'Facilitator judgment call — voluntary interviews unless a witness becomes uncooperative.' },
  intelligence: { routed: false, note: 'Facilitator judgment call — OSINT and cross-reference work rarely needs compulsory process.' },
};

export const grandJuryRubric = {
  citableFacts: centralFacts.map((f) => f.id),
  threshold: 3,
  guidance:
    'The team must be able to cite specific, evidence-backed facts for at least 3 of the 5 central facts ' +
    'to secure indictment. Mass Download Before Resignation and Competitor Contact Predates Resignation ' +
    'are the structural core of the case — a presentation missing both should not pass even if it clears ' +
    'the numeric threshold on the other three.',
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
  { id: 'def-01', name: 'Motion to Suppress — Digital Evidence', effect: 'Challenges the chain of custody on the VPN/download logs; if unresolved, treat Mass Download Before Resignation as uncorroborated going forward.', corroborationImmune: 'mass_download' },
  { id: 'def-02', name: 'Competing Software Forensics Expert', effect: 'Defense expert argues the download volume reflects routine documentation work, not exfiltration; contest with a second corroborating Digital or Documents card.', corroborationImmune: 'mass_download' },
  { id: 'def-03', name: 'Witness Recantation — Kowalski', effect: 'Ethan Kowalski, under pressure, claims his prior admissions were misunderstood; independent message/payment evidence resists this if already developed.', corroborationImmune: 'competitor_contact_predates' },
  { id: 'def-04', name: 'Discovery Demand', effect: 'Defense demands early production of your working files; costs the team 1 round of delay across the Pending Returns Queue.', corroborationImmune: null },
  { id: 'def-05', name: 'Change of Venue Motion', effect: 'Procedural delay; advance Command Pressure one level unless resolved.', corroborationImmune: null },
  { id: 'def-06', name: 'Chain-of-Custody Challenge — Seized Devices', effect: 'Contests handling of the USB drive and laptop seized during the investigation; needs a second independent category to corroborate.', corroborationImmune: 'personal_cloud_exfil' },
  { id: 'def-07', name: 'Independent Invention Defense', effect: 'Defense claims Vantage Autonomy\'s design was developed independently; the expert consultation and patent-language match resist this if already developed.', corroborationImmune: 'product_overlap' },
  { id: 'def-08', name: 'Good-Faith Offboarding Defense', effect: 'Frames the laptop reset as standard personal-data cleanup, not evidence destruction; the forensic report and discarded checklist directly rebut this.', corroborationImmune: 'deleted_evidence' },
  { id: 'def-09', name: 'Character/Reputation Evidence Motion', effect: 'Attempts to introduce unrelated favorable character evidence for Kowalski; facilitator judgment on relevance, generally low-impact if the technical trail is solid.', corroborationImmune: null },
  { id: 'def-10', name: 'Speedy Trial Pressure', effect: 'Defense pushes for an accelerated timeline; advance Command Pressure one level unless the team has already reached Probable Cause (16+).', corroborationImmune: null },
];

// Shown at a successful indictment — a fictional composite, not a
// dramatization of one real prosecution, but every mechanic here (a
// download spike ahead of resignation, exfiltration to personal storage, a
// competitor relationship predating the exit, and a rival product that
// mirrors the stolen work) mirrors real, recurring trade-secret theft
// prosecutions.
export const realWorldContext = {
  heading: 'The Real-World Pattern Behind This Case',
  paragraphs: [
    'Employees taking proprietary source code or design data to a new employer is a real, recurring category of federal prosecution under the Economic Espionage Act. In one notable historical case, two defense-industry managers were criminally charged after one recruited an engineer at a rival company to leave and bring more than 25,000 pages of trade-secret pricing information with him — the same "recruit, then exfiltrate" shape this case follows.',
    'More recently, the DOJ has charged former software engineers with stealing source code from U.S. technology companies specifically to market it to competitors — reflecting continued, active enforcement priority in exactly this space, not a historical anomaly.',
    'The mechanics this case dramatizes — a download spike concentrated in the final weeks before resignation, exfiltration to personal (not employer-approved) storage, and a rival product that surfaces suspiciously fast afterward — are the standard forensic signature investigators look for in real trade-secret theft cases, because a legitimate employee has no operational reason to bulk-download material they\'re about to lose access to anyway.',
  ],
  sources: [
    { title: 'DOJ\'s Increased Focus on Criminal Trade Secrets Cases (Kropf Moseley Schmitt)', url: 'https://kmlawfirm.com/2023/09/07/dojs-increased-focus-on-criminal-trade-secrets-cases/' },
    { title: 'Stealing Trade Secrets and Economic Espionage: An Overview of the Economic Espionage Act (Congressional Research Service)', url: 'https://www.congress.gov/crs-product/R42681' },
  ],
};
