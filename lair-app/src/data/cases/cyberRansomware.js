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
    'Bellcrest\'s incident response contractor notices the attackers authenticated with real, valid VPN ' +
    'credentials rather than exploiting any vulnerability — credentials belonging to a contractor whose ' +
    'access should have been revoked when his contract ended three weeks before the attack. IT reports ' +
    'the discrepancy rather than quietly closing the ticket.',
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
  { id: 'int-01', category: 'interviews', factId: 'insider_access', name: 'Former Employee Interview', flavor: 'Former IT contractor Aaron Petrosyan\'s exit interview notes — terminated for a policy violation weeks before the attack.', caseDefining: false },
  { id: 'int-02', category: 'interviews', factId: 'insider_access', name: 'Co-worker Statement', flavor: 'A Bellcrest IT staffer admits departed contractor Aaron Petrosyan\'s access was never actually revoked after termination.', caseDefining: true },
  { id: 'int-03', category: 'interviews', factId: 'insider_access', name: 'Person of Interest Interview', flavor: 'Former contractor Aaron Petrosyan\'s voluntary interview — denies any contact with the attackers.', caseDefining: false },
  { id: 'int-04', category: 'interviews', factId: 'ransomware_deployment', name: 'Medical Professional Interview', flavor: 'A treating physician describes the operational chaos during the six-day encryption event.', caseDefining: false },
  { id: 'int-05', category: 'interviews', factId: 'ransom_payment', name: 'Financial Advisor Interview', flavor: 'Outside counsel walks through how Bellcrest\'s leadership decided to authorize the ransom.', caseDefining: false },
  { id: 'int-06', category: 'interviews', factId: 'data_exfiltration', name: 'Expert Consultation', flavor: 'The incident response contractor\'s account of when the exfiltration actually occurred.', caseDefining: false },

  // Documents
  { id: 'doc-01', category: 'documents', factId: 'ransomware_deployment', name: 'Internal Memo', flavor: 'Bellcrest\'s internal incident response timeline memo.', caseDefining: false },
  { id: 'doc-02', category: 'documents', factId: 'insider_access', name: 'Employment Records', flavor: 'Former IT contractor Aaron Petrosyan\'s termination paperwork, including an incomplete access-revocation checklist.', caseDefining: true },
  { id: 'doc-03', category: 'documents', factId: 'ransom_payment', name: 'Insurance Policy', flavor: 'Bellcrest\'s cyber insurance policy and its ransom-authorization procedure.', caseDefining: false },
  { id: 'doc-04', category: 'documents', factId: 'data_exfiltration', name: 'Civil Court Filing', flavor: 'A patient class-action filing describing the scope of the data breach.', caseDefining: false },
  { id: 'doc-05', category: 'documents', factId: 'ransom_payment', name: 'Official Record', flavor: 'The incident report Bellcrest filed with a federal regulator, detailing the ransom payment.', caseDefining: false },
  { id: 'doc-06', category: 'documents', factId: 'crypto_laundering', name: 'Licensing/Permit Records', flavor: 'NovaSwap Exchange\'s complete lack of money-transmitter licensing.', caseDefining: false },

  // Digital
  { id: 'dig-01', category: 'digital', factId: 'insider_access', name: 'Chat Application Backup', flavor: 'A recovered dark web forum chat where former contractor Aaron Petrosyan negotiates the sale of his credentials.', caseDefining: false },
  { id: 'dig-02', category: 'digital', factId: 'insider_access', name: 'Authentication Logs', flavor: 'VPN logs showing former contractor Aaron Petrosyan\'s "terminated" account authenticating well after his last day.', caseDefining: true },
  { id: 'dig-03', category: 'digital', factId: 'ransomware_deployment', name: 'Deleted File Recovery', flavor: 'The recovered ransomware binary and deployment script from a compromised server.', caseDefining: false },
  { id: 'dig-04', category: 'digital', factId: 'data_exfiltration', name: 'Dark Web Marketplace Listing', flavor: 'A listing advertising a sample of Bellcrest\'s stolen patient data.', caseDefining: true },
  { id: 'dig-05', category: 'digital', factId: 'crypto_laundering', name: 'Cryptocurrency Exchange Records', flavor: 'Records tying the ransom wallet to a deposit at a known mixing service.', caseDefining: false },
  { id: 'dig-06', category: 'digital', factId: 'ransom_payment', name: 'Digital Wallet Transaction', flavor: 'The on-chain ransom payment transaction itself.', caseDefining: false },

  // Physical
  { id: 'phy-01', category: 'physical', factId: 'ransomware_deployment', name: 'Digital Storage Media', flavor: 'A USB drive recovered from former IT contractor Aaron Petrosyan\'s old workstation, holding staging tools.', caseDefining: true },
  { id: 'phy-02', category: 'physical', factId: 'insider_access', name: 'Surveillance Footage', flavor: 'Badge and camera footage of former contractor Aaron Petrosyan re-entering the building after his termination date.', caseDefining: false },
  { id: 'phy-03', category: 'physical', factId: 'ransomware_deployment', name: 'Tool Recovery', flavor: 'A hardware keylogger found attached to a nurses\' station workstation.', caseDefining: false },
  { id: 'phy-04', category: 'physical', factId: 'ransomware_deployment', name: 'Access Log', flavor: 'The physical server room access log shows after-hours entry the night of deployment.', caseDefining: false },
  { id: 'phy-05', category: 'physical', factId: 'insider_access', name: 'Discarded Item Recovery', flavor: 'A discarded printed password list found near former contractor Aaron Petrosyan\'s old desk.', caseDefining: false },
  { id: 'phy-06', category: 'physical', factId: 'ransomware_deployment', name: 'Photographs', flavor: 'Photos of the ransom note displayed across hospital workstation screens.', caseDefining: false },

  // Financial
  { id: 'fin-01', category: 'financial', factId: 'ransom_payment', name: 'Cryptocurrency Wallet', flavor: 'Bellcrest\'s own wallet, used to send the ransom.', caseDefining: true },
  { id: 'fin-02', category: 'financial', factId: 'ransom_payment', name: 'Wire Transfer Record', flavor: 'Bellcrest\'s bank wire purchasing the cryptocurrency used for the ransom.', caseDefining: false },
  { id: 'fin-03', category: 'financial', factId: 'crypto_laundering', name: 'Cryptocurrency Exchange Records', flavor: 'NovaSwap Exchange records showing the mixed funds converted to cash.', caseDefining: true },
  { id: 'fin-04', category: 'financial', factId: 'crypto_laundering', name: 'Suspicious Activity Report', flavor: 'A bank flags NovaSwap Exchange operator Yuri Basanets\' cash withdrawal pattern on its own.', caseDefining: false },
  { id: 'fin-05', category: 'financial', factId: 'insider_access', name: 'Merchant Account Records', flavor: 'A shell "IT consulting" merchant account used to pay former contractor Aaron Petrosyan a share of the proceeds.', caseDefining: false },
  { id: 'fin-06', category: 'financial', factId: 'crypto_laundering', name: 'Currency Exchange Record', flavor: 'A portion of the laundered funds converted again through a separate currency exchange.', caseDefining: false },

  // Intelligence
  { id: 'intel-01', category: 'intelligence', factId: 'ransomware_deployment', name: 'Open-Source Intelligence Summary', flavor: 'Public reporting linking ShadowLatch\'s known tooling to this specific incident.', caseDefining: false },
  { id: 'intel-02', category: 'intelligence', factId: 'insider_access', name: 'Confidential Source Report', flavor: 'A source inside a cybercrime forum describes how ShadowLatch recruits affiliates like former contractor Aaron Petrosyan.', caseDefining: false },
  { id: 'intel-03', category: 'intelligence', factId: 'data_exfiltration', name: 'Signals Intelligence Report', flavor: 'Intercepted traffic ties the exfiltration server to known ShadowLatch infrastructure.', caseDefining: true },
  { id: 'intel-04', category: 'intelligence', factId: 'crypto_laundering', name: 'Interagency Data Match', flavor: 'A federal financial-crimes match links NovaSwap Exchange operator Yuri Basanets\' exchange to prior, unrelated laundering cases.', caseDefining: true },
  { id: 'intel-05', category: 'intelligence', factId: 'data_exfiltration', name: 'Network Mapping', flavor: 'Network analysis mapping the exfiltration path from Bellcrest\'s servers outward.', caseDefining: false },
  { id: 'intel-06', category: 'intelligence', factId: 'crypto_laundering', name: 'Criminal History Summary', flavor: 'NovaSwap Exchange operator Yuri Basanets\' prior record for unlicensed money transmission.', caseDefining: false },
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
