/*
  Case File — "The Bellcrest Regional Breach" (Cyber Crime).
  Pure case data — see caseFileCaseUtils.js for shared helpers.
*/

export const caseMeta = {
  title: 'The Bellcrest Regional Breach',
  category: 'Cyber Crime',
  blurb: 'A hospital ransomware attack turns out to be an inside job — and the ransom gets laundered through crypto.',
  premise:
    'Bellcrest Regional Health was hit by a ransomware attack that encrypted its patient record systems ' +
    'for six days. What first looked like an opportunistic external intrusion increasingly looks like an ' +
    'inside job: the attackers walked in through a VPN account that should have been disabled weeks ' +
    'earlier, and the six-figure ransom Bellcrest paid in cryptocurrency has already started moving ' +
    'through accounts that don\'t belong to the hospital or its insurer.',
  initialComplaint:
    'Complainant: incident response contractor, on behalf of Bellcrest Regional Health IT. Nature of ' +
    'complaint: forensic review of the ransomware intrusion shows attacker authentication used valid VPN ' +
    'credentials issued to a former IT contractor whose access should have been revoked three weeks ' +
    'earlier, at contract termination. Referred for investigation.',
};

export const centralFacts = [
  {
    id: 'insider_access',
    title: 'Insider Access Sale',
    summary:
      'Former IT contractor Aaron Petrosyan sold his still-active VPN credentials to the ShadowLatch ' +
      'ransomware affiliate group on a dark web forum after his contract ended.',
  },
  {
    id: 'ransomware_deployment',
    title: 'Ransomware Deployment',
    summary:
      'The ShadowLatch affiliate used Petrosyan\'s credentials to move through Bellcrest\'s network and ' +
      'deploy ransomware against its patient record systems.',
  },
  {
    id: 'data_exfiltration',
    title: 'Data Exfiltration',
    summary:
      'Before encrypting anything, the attackers quietly exfiltrated patient data and staged it on a ' +
      'dark web marketplace as double-extortion leverage.',
  },
  {
    id: 'ransom_payment',
    title: 'The Ransom Payment',
    summary:
      'Bellcrest\'s administration authorized a cryptocurrency ransom payment that traces directly to a ' +
      'wallet controlled by the ShadowLatch affiliate.',
  },
  {
    id: 'crypto_laundering',
    title: 'Cryptocurrency Laundering',
    summary:
      'The ransom proceeds were run through a mixing service and cashed out through a shell exchange ' +
      'operated by Yuri Basanets.',
  },
];

export const factMatrix = [
  { factId: 'insider_access', categoryA: 'digital', categoryB: 'interviews', grandJury: true, caseDefiningEligible: true },
  { factId: 'ransomware_deployment', categoryA: 'digital', categoryB: 'physical', grandJury: true, caseDefiningEligible: true },
  { factId: 'data_exfiltration', categoryA: 'digital', categoryB: 'intelligence', grandJury: true, caseDefiningEligible: true },
  { factId: 'ransom_payment', categoryA: 'financial', categoryB: 'documents', grandJury: true, caseDefiningEligible: true },
  { factId: 'crypto_laundering', categoryA: 'financial', categoryB: 'intelligence', grandJury: true, caseDefiningEligible: true },
];

export const evidenceCards = [
  // Interviews
  { id: 'int-01', category: 'interviews', factId: 'insider_access', name: 'Former Employee Interview', flavor: 'Exit interview notes for former IT contractor Aaron Petrosyan: terminated for a "policy violation" — accessing systems outside his assigned scope — three weeks before the attack.', caseDefining: false },
  { id: 'int-02', category: 'interviews', factId: 'insider_access', name: 'Co-worker Statement', flavor: '"I checked the offboarding ticket after this all happened — his VPN account was still marked active. Nobody ever closed it out." — a Bellcrest IT staffer, on former contractor Aaron Petrosyan.', caseDefining: true },
  { id: 'int-03', category: 'interviews', factId: 'insider_access', name: 'Person of Interest Interview', flavor: '"I have no idea how anyone would\'ve gotten my old login — I never gave it to anybody." — former IT contractor Aaron Petrosyan\'s voluntary interview.', caseDefining: false },
  { id: 'int-04', category: 'interviews', factId: 'ransomware_deployment', name: 'Medical Professional Interview', flavor: '"We were writing vitals on paper and running charts down the hall by hand — for six days." — a treating physician, on the encryption event.', caseDefining: false },
  { id: 'int-05', category: 'interviews', factId: 'ransom_payment', name: 'Financial Advisor Interview', flavor: '"The insurer\'s breach coach recommended paying within 48 hours — patient safety was the deciding factor, not the dollar amount." — outside counsel, on Bellcrest\'s decision to authorize the ransom.', caseDefining: false },
  { id: 'int-06', category: 'interviews', factId: 'data_exfiltration', name: 'Expert Consultation', flavor: '"The data was already gone almost two full days before the ransom note ever appeared — encryption was the second half of the attack, not the first." — the incident response contractor.', caseDefining: false },

  // Documents
  { id: 'doc-01', category: 'documents', factId: 'ransomware_deployment', name: 'Internal Memo', flavor: 'Bellcrest\'s internal incident response timeline logs first anomalous VPN activity at 2:14 AM — nine hours before IT staff noticed anything was wrong.', caseDefining: false },
  { id: 'doc-02', category: 'documents', factId: 'insider_access', name: 'Employment Records', flavor: 'Former IT contractor Aaron Petrosyan\'s termination paperwork includes an access-revocation checklist with the VPN line item unchecked — the only item left incomplete.', caseDefining: true },
  { id: 'doc-03', category: 'documents', factId: 'ransom_payment', name: 'Insurance Policy', flavor: 'Bellcrest\'s cyber insurance policy caps ransom coverage at $500,000 and requires sign-off from both the CFO and outside counsel before any payment is authorized.', caseDefining: false },
  { id: 'doc-04', category: 'documents', factId: 'data_exfiltration', name: 'Civil Court Filing', flavor: 'A patient class-action filing alleges 40,000 records — names, diagnoses, insurance numbers — were exposed, based on the sample posted to the dark web listing.', caseDefining: false },
  { id: 'doc-05', category: 'documents', factId: 'ransom_payment', name: 'Official Record', flavor: 'Bellcrest\'s federal breach notification discloses a ransom payment of $340,000 in cryptocurrency, paid six hours after systems were confirmed encrypted.', caseDefining: false },
  { id: 'doc-06', category: 'documents', factId: 'crypto_laundering', name: 'Licensing/Permit Records', flavor: 'NovaSwap Exchange holds no money-transmitter license in any U.S. state — a requirement for any legitimate cryptocurrency cash-out service of its size.', caseDefining: false },

  // Digital
  { id: 'dig-01', category: 'digital', factId: 'insider_access', name: 'Chat Application Backup', flavor: 'A recovered dark web forum chat: a user handle later tied to former contractor Aaron Petrosyan offers "still-live VPN, healthcare, no MFA" for $4,000 in cryptocurrency.', caseDefining: false },
  { id: 'dig-02', category: 'digital', factId: 'insider_access', name: 'Authentication Logs', flavor: 'VPN logs show former contractor Aaron Petrosyan\'s "terminated" account authenticating successfully eleven days after his last day on Bellcrest\'s payroll.', caseDefining: true },
  { id: 'dig-03', category: 'digital', factId: 'ransomware_deployment', name: 'Deleted File Recovery', flavor: 'The recovered ransomware binary carries a compile timestamp four hours before deployment — built specifically for this attack, not a reused off-the-shelf tool.', caseDefining: false },
  { id: 'dig-04', category: 'digital', factId: 'data_exfiltration', name: 'Dark Web Marketplace Listing', flavor: 'A dark web marketplace listing offers "500 healthcare records, verified" as a free sample, with the full 40,000-record set priced at 2 BTC.', caseDefining: true },
  { id: 'dig-05', category: 'digital', factId: 'crypto_laundering', name: 'Cryptocurrency Exchange Records', flavor: 'Blockchain records trace the ransom wallet\'s payout to a known cryptocurrency mixing service within four hours of Bellcrest\'s payment clearing.', caseDefining: false },
  { id: 'dig-06', category: 'digital', factId: 'ransom_payment', name: 'Digital Wallet Transaction', flavor: 'The on-chain transaction record: Bellcrest\'s wallet → the ransom wallet, $340,000 in equivalent value, timestamped six hours after the systems went dark.', caseDefining: false },

  // Physical
  { id: 'phy-01', category: 'physical', factId: 'ransomware_deployment', name: 'Digital Storage Media', flavor: 'A USB drive recovered from former IT contractor Aaron Petrosyan\'s old workstation contains network-mapping and credential-staging tools, last modified two days before his termination.', caseDefining: true },
  { id: 'phy-02', category: 'physical', factId: 'insider_access', name: 'Surveillance Footage', flavor: 'Badge and camera footage shows former contractor Aaron Petrosyan re-entering the building nine days after his termination date, tailgating through the door on a colleague\'s badge.', caseDefining: false },
  { id: 'phy-03', category: 'physical', factId: 'ransomware_deployment', name: 'Tool Recovery', flavor: 'A hardware keylogger, physically wired between the keyboard and the tower, is recovered from a nurses\' station workstation — dust accumulation suggests weeks of use, not days.', caseDefining: false },
  { id: 'phy-04', category: 'physical', factId: 'ransomware_deployment', name: 'Access Log', flavor: 'The server room\'s physical access log shows an after-hours badge entry at 1:52 AM the night of deployment — 22 minutes before the first ransomware alert fired.', caseDefining: false },
  { id: 'phy-05', category: 'physical', factId: 'insider_access', name: 'Discarded Item Recovery', flavor: 'A discarded printed password list, found in a recycling bin near former contractor Aaron Petrosyan\'s old desk, lists a VPN username matching the one used in the intrusion.', caseDefining: false },
  { id: 'phy-06', category: 'physical', factId: 'ransomware_deployment', name: 'Photographs', flavor: 'Photographs of the ransom note displayed on hospital workstation screens demand payment "within 72 hours or the price doubles," with a countdown timer running in the corner.', caseDefining: false },

  // Financial
  { id: 'fin-01', category: 'financial', factId: 'ransom_payment', name: 'Cryptocurrency Wallet', flavor: 'Bellcrest\'s own cryptocurrency wallet, opened the same day the ransom note appeared, shows a single outbound transaction — the ransom payment — and nothing else.', caseDefining: true },
  { id: 'fin-02', category: 'financial', factId: 'ransom_payment', name: 'Wire Transfer Record', flavor: 'Bellcrest\'s bank wire to a cryptocurrency exchange, $340,000, memo line reads "emergency IT services" — the wire that funded the ransom wallet.', caseDefining: false },
  { id: 'fin-03', category: 'financial', factId: 'crypto_laundering', name: 'Cryptocurrency Exchange Records', flavor: 'NovaSwap Exchange records show the mixed ransom funds converted to cash across eleven separate withdrawals, each just under the $10,000 reporting threshold.', caseDefining: true },
  { id: 'fin-04', category: 'financial', factId: 'crypto_laundering', name: 'Suspicious Activity Report', flavor: 'The bank\'s own SAR flags NovaSwap Exchange operator Yuri Basanets\' eleven-withdrawal pattern as structuring — flagged without any customer complaint.', caseDefining: false },
  { id: 'fin-05', category: 'financial', factId: 'insider_access', name: 'Merchant Account Records', flavor: 'A shell "IT consulting" merchant account pays former contractor Aaron Petrosyan $4,000 — the exact asking price from the dark web forum listing — nine days after the ransom cleared.', caseDefining: false },
  { id: 'fin-06', category: 'financial', factId: 'crypto_laundering', name: 'Currency Exchange Record', flavor: 'A further $60,000 of the laundered funds converts again through a second currency exchange with no other client history — the same pattern NovaSwap used.', caseDefining: false },

  // Intelligence
  { id: 'intel-01', category: 'intelligence', factId: 'ransomware_deployment', name: 'Open-Source Intelligence Summary', flavor: 'Public security reporting on the ShadowLatch ransomware affiliate group matches the exact encryption tooling and ransom note wording recovered from Bellcrest\'s systems.', caseDefining: false },
  { id: 'intel-02', category: 'intelligence', factId: 'insider_access', name: 'Confidential Source Report', flavor: '"ShadowLatch pays a flat fee for verified healthcare access, no negotiation — that\'s their whole recruiting pitch on the forums." — a source inside a cybercrime forum.', caseDefining: false },
  { id: 'intel-03', category: 'intelligence', factId: 'data_exfiltration', name: 'Signals Intelligence Report', flavor: 'Intercepted network traffic ties the exfiltration server\'s IP address to infrastructure previously attributed to the ShadowLatch ransomware affiliate group in two other incidents.', caseDefining: true },
  { id: 'intel-04', category: 'intelligence', factId: 'crypto_laundering', name: 'Interagency Data Match', flavor: 'A federal financial-crimes database match links NovaSwap Exchange operator Yuri Basanets to two prior, unrelated cryptocurrency laundering investigations.', caseDefining: true },
  { id: 'intel-05', category: 'intelligence', factId: 'data_exfiltration', name: 'Network Mapping', flavor: 'Network analysis maps the exfiltration path — patient database → a compromised backup server → an external IP address — completed within a nineteen-minute window.', caseDefining: false },
  { id: 'intel-06', category: 'intelligence', factId: 'crypto_laundering', name: 'Criminal History Summary', flavor: 'NovaSwap Exchange operator Yuri Basanets has a prior conviction for unlicensed money transmission in a separate jurisdiction, five years before this case opened.', caseDefining: false },
];

export const evidenceByThreshold = {
  insider_access: {
    intake: 'The attackers authenticated with real, valid VPN credentials rather than exploiting any vulnerability — unusual for an opportunistic attack.',
    relevance: 'Those credentials belonged to a contractor terminated three weeks earlier; his access should have been revoked and was not.',
    specific_and_articulable_facts: 'A co-worker admits the revocation ticket was never actually completed, and VPN logs show that account authenticating well after his last day.',
    probable_cause: 'A recovered dark web chat shows that same contractor negotiating a price for "network access" to a healthcare target matching Bellcrest.',
    beyond_a_reasonable_doubt: 'Badge footage places him back in the building after termination, a password list turns up near his old desk, and a merchant-account payment traces a cut of the ransom proceeds directly to him.',
  },
  ransomware_deployment: {
    intake: 'A ransom note appears on hospital workstations; the network is unusable within hours.',
    relevance: 'Server room access logs show an after-hours entry the same night the malware first executed.',
    specific_and_articulable_facts: 'The recovered ransomware binary and deployment script show the same access path as the sold VPN credentials.',
    probable_cause: 'A USB drive recovered from the terminated contractor\'s old workstation holds staging tools matching the deployment script\'s toolkit.',
    beyond_a_reasonable_doubt: 'Every step of the deployment — the entry point, the timing, the toolkit — traces back to the same compromised, never-revoked account.',
  },
  data_exfiltration: {
    intake: 'Patient data begins circulating online days after the attack, before Bellcrest even confirms a breach publicly.',
    relevance: 'Network analysis shows a data transfer out of Bellcrest\'s servers in the hours before encryption began, not after.',
    specific_and_articulable_facts: 'A dark web marketplace listing advertises a sample of that exact data, timestamped to match the exfiltration window.',
    probable_cause: 'Intercepted traffic ties the exfiltration server\'s infrastructure to known ShadowLatch operations.',
    beyond_a_reasonable_doubt: 'The exfiltration was clearly planned in advance of the ransomware trigger — this was double extortion by design, not an afterthought.',
  },
  ransom_payment: {
    intake: 'Bellcrest confirms it paid a six-figure ransom in cryptocurrency to restore access.',
    relevance: 'Internal records show leadership authorized the payment under the cyber insurance policy\'s emergency procedure.',
    specific_and_articulable_facts: 'Bellcrest\'s own wallet and the bank wire funding it are both directly traceable in its financial records.',
    probable_cause: 'The on-chain transaction lands in a wallet that resolves directly to infrastructure already tied to the ShadowLatch affiliate.',
    beyond_a_reasonable_doubt: 'The payment, the wallet, and the affiliate\'s subsequent spending pattern form one unbroken, fully-documented chain.',
  },
  crypto_laundering: {
    intake: 'The ransom wallet\'s funds disappear into a well-known cryptocurrency mixing service within hours of payment.',
    relevance: 'Exchange records show the mixed funds re-emerging at NovaSwap Exchange, an entity with no money-transmitter license on file.',
    specific_and_articulable_facts: 'NovaSwap is run by Yuri Basanets, whose prior record already includes unlicensed money transmission.',
    probable_cause: 'A bank independently flags Basanets\' cash withdrawal pattern, and a federal financial-crimes match links his exchange to other, unrelated laundering cases.',
    beyond_a_reasonable_doubt: 'The dollar amounts moving through the mixer, into NovaSwap, and out as cash line up precisely with the ransom payment — this is a dedicated laundering pipeline, not a coincidence of timing.',
  },
};

export const legalRouting = {
  documents: { routed: true, note: 'Subpoena for hospital/HR records; Court Order if Bellcrest or its insurer resists production.' },
  digital: { routed: true, note: 'Subpoena for logs and cloud records; Search Warrant for device/server imaging.' },
  physical: { routed: true, note: 'Search Warrant typically required for on-premises hardware and media.' },
  financial: { routed: true, note: 'Subpoena for bank/exchange records; International Requests for offshore-adjacent exchange activity.' },
  interviews: { routed: false, note: 'Facilitator judgment call — voluntary interviews unless a witness becomes uncooperative.' },
  intelligence: { routed: false, note: 'Facilitator judgment call — OSINT/watchlist work rarely needs compulsory process.' },
};

export const grandJuryRubric = {
  citableFacts: centralFacts.map((f) => f.id),
  threshold: 3,
  guidance:
    'The team must be able to cite specific, evidence-backed facts for at least 3 of the 5 central facts ' +
    'to secure indictment. Insider Access Sale and Ransomware Deployment are the structural core of the ' +
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
  { id: 'def-01', name: 'Motion to Suppress — Digital Evidence', effect: 'Challenges the VPN log chain tying the account to Petrosyan; if unresolved, treat Insider Access Sale as uncorroborated going forward.', corroborationImmune: 'insider_access' },
  { id: 'def-02', name: 'Competing Forensic Expert', effect: 'Defense expert offers an alternate explanation for the deployment toolkit; contest with a second corroborating Digital or Physical card.', corroborationImmune: 'ransomware_deployment' },
  { id: 'def-03', name: 'Witness Recantation — Co-worker', effect: 'The IT staffer walks back the admission about the incomplete revocation ticket; independent log evidence resists this if already developed.', corroborationImmune: 'insider_access' },
  { id: 'def-04', name: 'Discovery Demand', effect: 'Defense demands early production of your working files; costs the team 1 round of delay across the Pending Returns Queue.', corroborationImmune: null },
  { id: 'def-05', name: 'Change of Venue Motion', effect: 'Procedural delay; advance Command Pressure one level unless resolved.', corroborationImmune: null },
  { id: 'def-06', name: 'Chain-of-Custody Challenge — Physical Media', effect: 'Contests handling of the recovered USB drive; needs a second independent category to corroborate.', corroborationImmune: 'ransomware_deployment' },
  { id: 'def-07', name: 'Attribution Dispute', effect: 'Defense disputes the ShadowLatch attribution and exfiltration timeline; the signals intelligence and network mapping evidence resist this if already developed.', corroborationImmune: 'data_exfiltration' },
  { id: 'def-08', name: 'Good-Faith Ransom Payment Defense', effect: 'Frames the ransom payment as routine incident response with no bearing on identifying the attackers; the on-chain wallet trace directly rebuts this.', corroborationImmune: 'ransom_payment' },
  { id: 'def-09', name: 'Character/Reputation Evidence Motion', effect: 'Attempts to introduce unrelated favorable character evidence for Petrosyan; facilitator judgment on relevance, generally low-impact if the technical trail is solid.', corroborationImmune: null },
  { id: 'def-10', name: 'Speedy Trial Pressure', effect: 'Defense pushes for an accelerated timeline; advance Command Pressure one level unless the team has already reached Probable Cause (16+).', corroborationImmune: null },
];

// Shown at a successful indictment — a fictional composite, not a
// dramatization of one real prosecution, but every mechanic here (a departed
// insider selling live credentials, a hospital ransomware target, a
// crypto-mixing cash-out) reflects a documented, real attack pattern.
export const realWorldContext = {
  heading: 'The Real-World Pattern Behind This Case',
  paragraphs: [
    'Selling network access to ransomware operators is a real, named criminal role — "Initial Access Brokers" compromise or buy corporate VPN and remote-access credentials, then sell that access on dark web forums to ransomware affiliates, who are the ones who actually deploy the encryption. The credential pairs that trade hands most often on these markets are exactly the kind Aaron Petrosyan sells in this case: corporate VPN logins.',
    'Hospitals have been a frequent real-world target of this exact playbook. The U.S. Department of Justice has charged foreign, state-linked hackers specifically for ransomware attacks against American hospitals and health care providers, and the Treasury Department has sanctioned VPN infrastructure providers found to be directly supporting ransomware groups that hit hospitals, financial firms, and municipal governments.',
    'Running ransom proceeds through a cryptocurrency mixing service before cashing out — the way this case\'s laundering chain works — is likewise a standard, well-documented step in real ransomware cash-out operations, and one of the main things that lets investigators eventually trace the money back to a person.',
  ],
  sources: [
    { title: 'North Korean Government Hacker Charged for Involvement in Ransomware Attacks Targeting U.S. Hospitals and Health Care Providers (DOJ)', url: 'https://www.justice.gov/archives/opa/pr/north-korean-government-hacker-charged-involvement-ransomware-attacks-targeting-us-hospitals' },
    { title: 'Initial Access Brokers Are Key to Rise in Ransomware Attacks (Recorded Future)', url: 'https://www.recordedfuture.com/research/initial-access-brokers-key-to-rise-in-ransomware-attacks' },
    { title: 'Treasury sanctions VPN provider, individuals tied to hospital ransomware (Becker\'s Hospital Review)', url: 'https://www.beckershospitalreview.com/healthcare-information-technology/cybersecurity/treasury-sanctions-vpn-provider-individuals-tied-to-hospital-ransomware/' },
  ],
};
