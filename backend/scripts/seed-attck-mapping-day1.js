'use strict';
/**
 * Seed Day 1 Challenge — MITRE ATT&CK Mapping.
 *
 * Creates one auto-graded quiz assignment (20 multiple_choice questions,
 * technique-mapping exercises against 4 real federal cybercrime cases)
 * plus 4 linked CourseContentItem "intel_report" reference items (one per
 * case) summarizing the real-world indictment each set of questions is
 * drawn from. Reference items are NOT auto-unlocked by the assignment
 * (auto-unlock cascade only fires for type: 'module') — unlock both
 * separately via Admin → Content Gating once ready.
 *
 * Run: node backend/scripts/seed-attck-mapping-day1.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect:        'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging:        false,
});

/* ─────────────────────────────────────────────────────────────────────────────
   Case metadata (short names shown as question stem prefixes / content titles)
───────────────────────────────────────────────────────────────────────────── */
const CASES = {
  'kaseya-revil-vasinskyi': {
    shortName: 'Kaseya VSA / Sodinokibi (REvil) Ransomware Attack',
    title:     'United States v. Yaroslav Vasinskyi',
    summary:
      'Federal prosecutors in the Northern District of Texas charged Ukrainian national Yaroslav Vasinskyi with a series of Sodinokibi/REvil ransomware attacks, including the July 2, 2021 attack on Kaseya, a Florida-based vendor of remote IT-management software used by managed service providers (MSPs). Prosecutors allege Vasinskyi and co-conspirators exploited a previously unknown vulnerability in Kaseya’s VSA product to push malicious code through Kaseya’s own software deployment pipeline, causing ransomware to reach endpoint computers on the networks of Kaseya’s MSP customers and those MSPs’ own downstream clients. Encrypted victims were directed to a Tor-based or public payment portal demanding cryptocurrency, with REvil publicly claiming a $70 million demand for a universal decryptor; unpaid victims were allegedly threatened with data leak or sale. Vasinskyi was extradited from Poland in 2022.',
    factPattern: [
      'Initial access into the Kaseya VSA platform was achieved through a previously unknown vulnerability in Kaseya’s own software, not by phishing an individual employee.',
      'Malicious code was pushed to Kaseya’s downstream MSP customers through Kaseya’s own trusted software distribution/update pipeline, which those customer networks already trusted implicitly.',
      'Ransomware then executed on endpoint computers, encrypting files across affected networks.',
      'Victims received a ransom note directing them to a Tor hidden service and a public website to negotiate a cryptocurrency payment.',
      'Attackers threatened to publish or sell victim data on the dark web if the ransom was not paid.',
    ],
    sourceUrls: [
      'https://www.justice.gov/opa/pr/ukrainian-arrested-and-charged-ransomware-attack-kaseya',
      'https://www.secretservice.gov/newsroom/releases/2022/03/sodinokibirevil-ransomware-defendant-extradited-united-states-and',
    ],
  },
  'apt41-supply-chain': {
    shortName: 'APT41 / Barium / Winnti Global Intrusion Campaign',
    title:     'United States v. Zhang Haoran, Tan Dailin, Jiang Lizhi, Qian Chuan, and Fu Qiang',
    summary:
      'The Justice Department unsealed two related indictments charging five Chinese nationals — tracked in the security community under aliases including APT41, Barium, Winnti, and Wicked Panda — with a long-running intrusion campaign against more than 100 companies and organizations worldwide, including software vendors, telecoms, universities, video-game companies, non-profits, and foreign governments, as well as pro-democracy figures in Hong Kong. A related indictment charged two Malaysian businessmen with helping the group monetize intrusions into video-game companies. Prosecutors described the group’s use of software supply-chain attacks (compromising vendors and modifying their code to reach the vendors’ own customers), ‘dead drop resolver’ web pages that covertly carried command-and-control instructions, and exploitation of known, unpatched CVEs. The group also allegedly stole source code and code-signing certificates and, in some intrusions, deployed ransomware.',
    factPattern: [
      'The group compromised legitimate software vendors and modified the vendors’ own code, so that the vendors’ downstream customers who trusted and installed that code became compromised in turn.',
      'The group exploited a set of already publicly disclosed software vulnerabilities (CVEs) on internet-facing systems belonging to victim organizations to gain an initial foothold.',
      'To communicate with implanted malware without operating obvious infrastructure, the group created outwardly ordinary public web pages that secretly contained encoded instructions for the malware to retrieve.',
      'In some intrusions the group stole software source code and the digital code-signing certificates vendors use to make their software appear legitimately signed.',
      'In some cases the group encrypted victim data and demanded a ransom payment alongside its espionage activity.',
    ],
    sourceUrls: [
      'https://www.justice.gov/archives/opa/pr/seven-international-cyber-defendants-including-apt41-actors-charged-connection-computer',
      'https://www.fbi.gov/wanted/cyber/apt-41-group',
    ],
  },
  'ubiquiti-insider-sharp': {
    shortName: 'Trusted-Insider Cloud Data Theft and Extortion (Ubiquiti)',
    title:     'United States v. Nickolas Sharp',
    summary:
      'Federal prosecutors in the Southern District of New York charged Nickolas Sharp, a former senior developer at a New York-headquartered networking-technology company, with stealing confidential company data and then extorting his own employer. Sharp held legitimate administrator-level credentials for the company’s AWS cloud infrastructure and GitHub source-code repositories as part of his normal job. In December 2020, prosecutors allege he used those valid credentials to download gigabytes of confidential data — including cloning roughly 155 private code repositories — while connected through a paid commercial VPN service to mask his home IP address, and modified log-retention settings to cover his tracks. Posing as an anonymous outside hacker, he then allegedly demanded close to $2 million in Bitcoin, threatening to publish the data; when unpaid, a portion was published. He was identified after his VPN briefly dropped during a home internet outage, exposing his real IP. He later allegedly posed as an anonymous whistleblower and fed a security journalist misleading claims that the company had covered up a more severe breach.',
    factPattern: [
      'The actor already held legitimate, company-issued administrator credentials for the organization’s cloud (AWS) and source-control (GitHub) environments as part of his normal job duties — no exploit or malware was used to gain access.',
      'He used those valid credentials to access and bulk-download confidential data, routing his connection through a commercial VPN to mask his true IP address and location.',
      'Large volumes of objects and repository data were pulled from the company’s cloud storage and source-control environment in a short window.',
      'He altered the organization’s log-retention configuration to shorten the evidence trail of his own activity.',
      'After the theft, he anonymously demanded a cryptocurrency ransom from his own employer, then later fed false narratives to a journalist to redirect suspicion toward an external, unidentified attacker.',
    ],
    sourceUrls: [
      'https://www.csoonline.com/article/571717/ubiquiti-breach-an-inside-job-says-fbi-and-doj.html',
      'https://www.securityweek.com/former-ubiquiti-employee-who-posed-as-hacker-pleads-guilty/',
    ],
  },
  'snowflake-moucka-binns': {
    shortName: 'Snowflake Customer-Account Credential Stuffing and Extortion Campaign',
    title:     'United States v. Connor Riley Moucka and John Erin Binns',
    summary:
      'A federal grand jury in the Western District of Washington indicted Connor Riley Moucka of Canada and John Erin Binns, a U.S. citizen who resided in Turkey, in connection with a scheme to compromise customer accounts on the cloud data platform Snowflake at more than 165 organizations, including a major telecommunications carrier, a ticketing company, an auto-parts retailer, and a bank. Prosecutors allege the defendants used username/password pairs originally harvested years earlier by unrelated infostealer malware infections, reusing them against Snowflake customer accounts that had not enabled multi-factor authentication. Once authenticated, the group allegedly used a custom-built tool to systematically identify and extract high-value data, including billions of customer call and text records and other personal and financial information. The defendants are alleged to have extorted at least three victims for a combined roughly 36 bitcoin, providing proof of data deletion in at least one case, and to have advertised remaining stolen data on cybercrime forums. Moucka was arrested in Canada in October 2024 and agreed to extradition.',
    factPattern: [
      'The actors authenticated to cloud data-platform customer accounts using valid username/password combinations that had originally been harvested by unrelated infostealer malware years earlier and were now being tested/reused at scale against many accounts.',
      'The targeted customer accounts did not have multi-factor authentication enabled, which is what allowed a reused password alone to succeed.',
      'Once authenticated as a legitimate account holder, the actors used a custom tool to systematically enumerate and pull large volumes of data out of the cloud environment.',
      'The actors then contacted victim organizations directly, threatening to leak the stolen data unless paid, and in at least one case provided video proof of data deletion after a ransom was paid.',
      'Unpaid or unclaimed stolen data was advertised for sale on underground cybercrime forums.',
    ],
    sourceUrls: [
      'https://www.justice.gov/usao-wdwa/united-states-vs-connor-riley-moucka-and-john-erin-binns',
      'https://www.bleepingcomputer.com/news/security/us-indicts-snowflake-hackers-who-extorted-25-million-from-3-victims/',
    ],
  },
};

const DISCLAIMER =
  'All records here are condensed, paraphrased summaries of publicly available DOJ press releases and court reporting, not verbatim reproductions of any charging document. ' +
  'An indictment is an accusation only; all named defendants are presumed innocent unless and until proven guilty in a court of law. ' +
  'This is real-world reference material and is separate from PACT’s fictional RestonIT scenario.';

/* ─────────────────────────────────────────────────────────────────────────────
   Raw exercise data (from attck-mapping-exercises.json)
───────────────────────────────────────────────────────────────────────────── */
const exercises = [
  { exerciseId: 'kaseya-1', caseId: 'kaseya-revil-vasinskyi',
    prompt: 'Attackers gained their initial foothold by exploiting a previously unknown (zero-day) vulnerability in the Kaseya VSA software itself, rather than phishing a Kaseya employee.',
    correctAnswer: { techniqueId: 'T1190', techniqueName: 'Exploit Public-Facing Application' },
    distractors: [
      { techniqueId: 'T1566', techniqueName: 'Phishing' },
      { techniqueId: 'T1078', techniqueName: 'Valid Accounts' },
      { techniqueId: 'T1133', techniqueName: 'External Remote Services' },
    ],
    explanation: 'A vulnerability in an internet-facing application (the VSA platform itself) was exploited for initial entry — the textbook definition of T1190, not a credential- or phishing-based entry vector.' },

  { exerciseId: 'kaseya-2', caseId: 'kaseya-revil-vasinskyi',
    prompt: 'Malicious code reached Kaseya’s MSP customers and their downstream clients through Kaseya’s own software deployment pipeline, which those networks already trusted and allowed to push updates.',
    correctAnswer: { techniqueId: 'T1195.002', techniqueName: 'Supply Chain Compromise: Compromise Software Supply Chain' },
    distractors: [
      { techniqueId: 'T1199', techniqueName: 'Trusted Relationship' },
      { techniqueId: 'T1105', techniqueName: 'Ingress Tool Transfer' },
      { techniqueId: 'T1210', techniqueName: 'Exploitation of Remote Services' },
    ],
    explanation: 'The malicious payload rode inside a legitimate vendor’s own software distribution mechanism to reach downstream customers — a software supply-chain compromise. (T1199 Trusted Relationship is the closer fit when a human/business trust relationship between two organizations is abused directly; here it was the automated software delivery channel itself.)' },

  { exerciseId: 'kaseya-3', caseId: 'kaseya-revil-vasinskyi',
    prompt: 'Once executed on endpoint computers, the ransomware encrypted files across the affected networks.',
    correctAnswer: { techniqueId: 'T1486', techniqueName: 'Data Encrypted for Impact' },
    distractors: [
      { techniqueId: 'T1485', techniqueName: 'Data Destruction' },
      { techniqueId: 'T1490', techniqueName: 'Inhibit System Recovery' },
      { techniqueId: 'T1027', techniqueName: 'Obfuscated Files or Information' },
    ],
    explanation: 'Encrypting victim data to extort payment for the decryption key is the defining behavior of T1486, distinct from destroying data outright (T1485).' },

  { exerciseId: 'kaseya-4', caseId: 'kaseya-revil-vasinskyi',
    prompt: 'Victims who did not pay the ransom were told their stolen data would be published or sold to third parties on dark-web sites.',
    correctAnswer: { techniqueId: 'T1657', techniqueName: 'Financial Theft' },
    distractors: [
      { techniqueId: 'T1567', techniqueName: 'Exfiltration Over Web Service' },
      { techniqueId: 'T1531', techniqueName: 'Account Access Removal' },
      { techniqueId: 'T1489', techniqueName: 'Service Stop' },
    ],
    explanation: 'The double-extortion leak threat is the monetization/coercion step of the attack, captured by ATT&CK’s Financial Theft technique, which covers extortion and ransom-driven schemes.' },

  { exerciseId: 'kaseya-5', caseId: 'kaseya-revil-vasinskyi',
    prompt: 'Ransom notes directed victims to a Tor (.onion) address and a mirrored public clearnet site to negotiate and pay in cryptocurrency.',
    correctAnswer: { techniqueId: 'T1090.003', techniqueName: 'Proxy: Multi-hop Proxy' },
    distractors: [
      { techniqueId: 'T1071.001', techniqueName: 'Application Layer Protocol: Web Protocols' },
      { techniqueId: 'T1102', techniqueName: 'Web Service' },
      { techniqueId: 'T1573', techniqueName: 'Encrypted Channel' },
    ],
    explanation: 'Use of the Tor network to host payment/negotiation infrastructure anonymizes the operators’ location through multiple relay hops — the purpose of T1090.003, distinct from ordinary C2-over-web-protocol traffic.' },

  { exerciseId: 'apt41-1', caseId: 'apt41-supply-chain',
    prompt: 'The group compromised legitimate software vendors and modified the vendors’ own code, so the vendors’ downstream customers became compromised when they installed trusted updates.',
    correctAnswer: { techniqueId: 'T1195.002', techniqueName: 'Supply Chain Compromise: Compromise Software Supply Chain' },
    distractors: [
      { techniqueId: 'T1553.002', techniqueName: 'Subvert Trust Controls: Code Signing' },
      { techniqueId: 'T1195.001', techniqueName: 'Supply Chain Compromise: Compromise Software Dependencies and Development Tools' },
      { techniqueId: 'T1078', techniqueName: 'Valid Accounts' },
    ],
    explanation: 'Modifying a vendor’s shipped code/update so its customers are compromised on install is the core definition of compromising the software supply chain (T1195.002), as opposed to compromising a dependency/build tool upstream of the vendor (T1195.001).' },

  { exerciseId: 'apt41-2', caseId: 'apt41-supply-chain',
    prompt: 'The group gained initial footholds using a set of already publicly known, unpatched CVEs on internet-facing victim systems.',
    correctAnswer: { techniqueId: 'T1190', techniqueName: 'Exploit Public-Facing Application' },
    distractors: [
      { techniqueId: 'T1210', techniqueName: 'Exploitation of Remote Services' },
      { techniqueId: 'T1068', techniqueName: 'Exploitation for Privilege Escalation' },
      { techniqueId: 'T1211', techniqueName: 'Exploitation for Defense Evasion' },
    ],
    explanation: 'Using known CVEs against internet-facing applications for entry (as opposed to lateral movement between already-compromised internal systems, T1210) is T1190.' },

  { exerciseId: 'apt41-3', caseId: 'apt41-supply-chain',
    prompt: 'To relay instructions to implanted malware without running obvious dedicated C2 infrastructure, the group created ordinary-looking public web pages that secretly carried encoded commands for the malware to retrieve.',
    correctAnswer: { techniqueId: 'T1102.001', techniqueName: 'Web Service: Dead Drop Resolver' },
    distractors: [
      { techniqueId: 'T1102.002', techniqueName: 'Web Service: Bidirectional Communication' },
      { techniqueId: 'T1071.001', techniqueName: 'Application Layer Protocol: Web Protocols' },
      { techniqueId: 'T1105', techniqueName: 'Ingress Tool Transfer' },
    ],
    explanation: 'A page whose sole covert purpose is to hand malware a pointer to real C2 infrastructure (rather than carry the full ongoing C2 conversation itself) is the ‘dead drop resolver’ sub-technique.' },

  { exerciseId: 'apt41-4', caseId: 'apt41-supply-chain',
    prompt: 'In some intrusions, the group stole the digital code-signing certificates victim software vendors used to make their own software appear legitimately signed.',
    correctAnswer: { techniqueId: 'T1552.004', techniqueName: 'Unsecured Credentials: Private Keys' },
    distractors: [
      { techniqueId: 'T1553.002', techniqueName: 'Subvert Trust Controls: Code Signing' },
      { techniqueId: 'T1005', techniqueName: 'Data from Local System' },
      { techniqueId: 'T1213', techniqueName: 'Data from Information Repositories' },
    ],
    explanation: 'The theft of the private signing key/certificate itself is Credential Access (T1552.004, stealing an unsecured private key). Later using a stolen certificate to sign malicious binaries so they appear trusted would be the separate Defense Evasion technique T1553.002 — a good discussion point on why the same artifact can support two different techniques depending on which stage of the intrusion you’re looking at.' },

  { exerciseId: 'apt41-5', caseId: 'apt41-supply-chain',
    prompt: 'In some cases the group encrypted victim data and demanded a ransom payment in addition to its espionage-driven data theft.',
    correctAnswer: { techniqueId: 'T1486', techniqueName: 'Data Encrypted for Impact' },
    distractors: [
      { techniqueId: 'T1490', techniqueName: 'Inhibit System Recovery' },
      { techniqueId: 'T1657', techniqueName: 'Financial Theft' },
      { techniqueId: 'T1485', techniqueName: 'Data Destruction' },
    ],
    explanation: 'The encryption of victim data for ransom leverage is T1486. Note this is a rare case of a primarily espionage-motivated actor also monetizing an intrusion directly — worth flagging for students as an example of blended state/criminal tradecraft.' },

  { exerciseId: 'ubiquiti-1', caseId: 'ubiquiti-insider-sharp',
    prompt: 'The actor did not exploit any vulnerability or deploy malware — he used his own legitimate, company-issued AWS and GitHub administrator credentials, which he already held for his job.',
    correctAnswer: { techniqueId: 'T1078.004', techniqueName: 'Valid Accounts: Cloud Accounts' },
    distractors: [
      { techniqueId: 'T1078.001', techniqueName: 'Valid Accounts: Default Accounts' },
      { techniqueId: 'T1136.003', techniqueName: 'Create Account: Cloud Account' },
      { techniqueId: 'T1548', techniqueName: 'Abuse Elevation Control Mechanism' },
    ],
    explanation: 'This is the archetypal insider-threat pattern: an authorized cloud account used outside its intended scope, not stolen or newly created — T1078.004. This is also a good teaching moment that ‘Valid Accounts’ can be an Initial Access, Persistence, Privilege Escalation, or Defense Evasion technique depending on how it’s used; here the actor already had standing access, so the relevant tactic is really about abuse of an existing trust relationship rather than gaining a new foothold.' },

  { exerciseId: 'ubiquiti-2', caseId: 'ubiquiti-insider-sharp',
    prompt: 'He routed his data-download activity through a paid commercial VPN service to mask his home IP address from the company’s own logs.',
    correctAnswer: { techniqueId: 'T1090.002', techniqueName: 'Proxy: External Proxy' },
    distractors: [
      { techniqueId: 'T1090.001', techniqueName: 'Proxy: Internal Proxy' },
      { techniqueId: 'T1027', techniqueName: 'Obfuscated Files or Information' },
      { techniqueId: 'T1036', techniqueName: 'Masquerading' },
    ],
    explanation: 'Routing outbound activity through a third-party commercial proxy/VPN service to hide true origin is T1090.002 — note this technique applies just as well to an insider hiding from their own employer’s logging as it does to an external attacker.' },

  { exerciseId: 'ubiquiti-3', caseId: 'ubiquiti-insider-sharp',
    prompt: 'He cloned roughly 155 private source-code repositories and downloaded confidential objects directly from the company’s cloud storage environment.',
    correctAnswer: { techniqueId: 'T1530', techniqueName: 'Data from Cloud Storage Object' },
    distractors: [
      { techniqueId: 'T1213', techniqueName: 'Data from Information Repositories' },
      { techniqueId: 'T1005', techniqueName: 'Data from Local System' },
      { techniqueId: 'T1119', techniqueName: 'Automated Collection' },
    ],
    explanation: 'Bulk access to objects/repositories living in cloud infrastructure (as opposed to a local endpoint) is T1530. T1213 is the closer alternate answer worth discussing — it applies specifically to structured repositories like wikis, code repos, or SharePoint; here the strongest single answer is the cloud-storage-object technique given the AWS environment, but a grader should accept either with sound reasoning.' },

  { exerciseId: 'ubiquiti-4', caseId: 'ubiquiti-insider-sharp',
    prompt: 'He modified the organization’s log-retention configuration to shorten the trail of evidence documenting his own activity.',
    correctAnswer: { techniqueId: 'T1562.008', techniqueName: 'Impair Defenses: Disable or Modify Cloud Logs' },
    distractors: [
      { techniqueId: 'T1070.001', techniqueName: 'Indicator Removal: Clear Windows Event Logs' },
      { techniqueId: 'T1070.002', techniqueName: 'Indicator Removal: Clear Linux or Mac System Logs' },
      { techniqueId: 'T1489', techniqueName: 'Service Stop' },
    ],
    explanation: 'Changing a cloud environment’s log-retention policy (rather than deleting individual local log files after the fact) maps specifically to T1562.008 — a distinction worth drilling into with students, since the two ‘clear logs’ sub-techniques under T1070 apply to endpoint OS logs, not cloud-platform logging configuration.' },

  { exerciseId: 'ubiquiti-5', caseId: 'ubiquiti-insider-sharp',
    prompt: 'After the theft, he anonymously demanded roughly $2 million in Bitcoin from his own employer, threatening to publish the stolen data.',
    correctAnswer: { techniqueId: 'T1657', techniqueName: 'Financial Theft' },
    distractors: [
      { techniqueId: 'T1531', techniqueName: 'Account Access Removal' },
      { techniqueId: 'T1499', techniqueName: 'Endpoint Denial of Service' },
      { techniqueId: 'T1486', techniqueName: 'Data Encrypted for Impact' },
    ],
    explanation: 'An extortion demand without any encryption of victim systems is still Financial Theft (T1657) — useful for showing students that ransom/extortion techniques don’t require ransomware; data theft plus a threat is enough.' },

  { exerciseId: 'snowflake-1', caseId: 'snowflake-moucka-binns',
    prompt: 'The actors logged into victim cloud accounts using username/password pairs that had been harvested years earlier by unrelated infostealer malware, testing the same reused credentials against many different Snowflake customer accounts.',
    correctAnswer: { techniqueId: 'T1110.004', techniqueName: 'Brute Force: Credential Stuffing' },
    distractors: [
      { techniqueId: 'T1110.003', techniqueName: 'Brute Force: Password Spraying' },
      { techniqueId: 'T1555', techniqueName: 'Credentials from Password Stores' },
      { techniqueId: 'T1589.001', techniqueName: 'Gather Victim Identity Information: Credentials' },
    ],
    explanation: 'Testing known, previously-breached username/password pairs against many accounts (rather than guessing many passwords against one or a few known usernames) is T1110.004 Credential Stuffing, distinct from T1110.003 Password Spraying.' },

  { exerciseId: 'snowflake-2', caseId: 'snowflake-moucka-binns',
    prompt: 'The targeted Snowflake customer accounts did not have multi-factor authentication enabled, which is what allowed a reused password alone to succeed in logging in.',
    correctAnswer: { techniqueId: 'T1078.004', techniqueName: 'Valid Accounts: Cloud Accounts' },
    distractors: [
      { techniqueId: 'T1556.006', techniqueName: 'Modify Authentication Process: Multi-Factor Authentication' },
      { techniqueId: 'T1621', techniqueName: 'Multi-Factor Authentication Request Generation' },
      { techniqueId: 'T1621.001', techniqueName: 'MFA Interception' },
    ],
    explanation: 'Because MFA wasn’t enabled at all, the attackers didn’t need to bypass or fatigue an MFA challenge (T1621) — they simply authenticated as the legitimate cloud account, T1078.004. This fact pattern is a good prompt for discussing why an absent control isn’t the same ATT&CK technique as defeating a present one.' },

  { exerciseId: 'snowflake-3', caseId: 'snowflake-moucka-binns',
    prompt: 'Once authenticated, the actors used a custom-built tool to systematically identify and pull large volumes of high-value data out of each compromised cloud environment.',
    correctAnswer: { techniqueId: 'T1119', techniqueName: 'Automated Collection' },
    distractors: [
      { techniqueId: 'T1530', techniqueName: 'Data from Cloud Storage Object' },
      { techniqueId: 'T1213', techniqueName: 'Data from Information Repositories' },
      { techniqueId: 'T1602', techniqueName: 'Data from Configuration Repository' },
    ],
    explanation: 'A purpose-built tool that automatically enumerates and extracts data at scale, rather than a one-off manual pull, is best captured by T1119 Automated Collection; T1530 remains a defensible secondary answer given the cloud-storage context.' },

  { exerciseId: 'snowflake-4', caseId: 'snowflake-moucka-binns',
    prompt: 'The actors then directly contacted victim organizations, threatening to leak the stolen data unless a cryptocurrency payment was made, and provided video proof of deletion after at least one payment.',
    correctAnswer: { techniqueId: 'T1657', techniqueName: 'Financial Theft' },
    distractors: [
      { techniqueId: 'T1486', techniqueName: 'Data Encrypted for Impact' },
      { techniqueId: 'T1491', techniqueName: 'Defacement' },
      { techniqueId: 'T1565', techniqueName: 'Data Manipulation' },
    ],
    explanation: 'As with the Ubiquiti case, this is extortion without encryption — straight data-theft leverage, mapped to T1657 Financial Theft rather than T1486, since no victim systems or files were ever encrypted.' },

  { exerciseId: 'snowflake-5', caseId: 'snowflake-moucka-binns',
    prompt: 'Data from victims who did not pay was advertised for sale on underground cybercrime forums.',
    correctAnswer: { techniqueId: 'T1657', techniqueName: 'Financial Theft' },
    distractors: [
      { techniqueId: 'T1567.002', techniqueName: 'Exfiltration Over Web Service: Exfiltration to Cloud Storage' },
      { techniqueId: 'T1041', techniqueName: 'Exfiltration Over C2 Channel' },
      { techniqueId: 'T1583.001', techniqueName: 'Acquire Infrastructure: Domains' },
    ],
    explanation: 'Selling stolen data on criminal marketplaces is a monetization step, still captured under T1657 Financial Theft, and worth distinguishing from the earlier act of moving the data out of the victim environment (which would properly be an Exfiltration-tactic technique like T1567).' },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Build multiple_choice question objects matching QuizFlow.jsx's payload shape
───────────────────────────────────────────────────────────────────────────── */
const OPTION_IDS = ['a', 'b', 'c', 'd'];

const questions = exercises.map((ex) => {
  const caseInfo = CASES[ex.caseId];
  const rawOptions = [ex.correctAnswer, ...ex.distractors];
  const options = rawOptions.map((opt, i) => ({
    id:   OPTION_IDS[i],
    text: `${opt.techniqueId} — ${opt.techniqueName}`,
  }));

  return {
    id:   uuidv4(),
    stem: `[${caseInfo.shortName}] ${ex.prompt}`,
    payload: {
      kind:          'multiple_choice',
      selectionMode: 'single',
      shuffle:       true,
      options,
      correct:       ['a'],
    },
    scoring:  { points: 10, mustPass: false },
    feedback: {
      correct:   ex.explanation,
      incorrect: ex.explanation,
      reference: `${ex.caseId} — ${ex.exerciseId}`,
    },
  };
});

/* ─────────────────────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────────────────────── */
(async () => {
  await seq.authenticate();
  console.log('PostgreSQL connected\n');

  const ASSIGNMENT_TITLE = 'Day 1 Challenge — MITRE ATT&CK Mapping';

  // Remove any previous seed for this assignment and its linked content items
  const [[existing]] = await seq.query(
    `SELECT id FROM assignments WHERE course_id = :courseId AND title = :title`,
    { replacements: { courseId: COURSE_ID, title: ASSIGNMENT_TITLE } },
  );
  if (existing) {
    await seq.query(`DELETE FROM course_content_items WHERE linked_assignment_id = :id`, { replacements: { id: existing.id } });
    await seq.query(`DELETE FROM assignments WHERE id = :id`, { replacements: { id: existing.id } });
    console.log('Cleared previous seed (if any)\n');
  }

  const [[{ next: oi0 }]] = await seq.query(
    "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
    { replacements: { courseId: COURSE_ID } },
  );
  const oi       = Number(oi0);
  const maxScore = questions.reduce((s, q) => s + q.scoring.points, 0);
  const assignmentId = uuidv4();

  await seq.query(
    `INSERT INTO assignments
       (id, course_id, title, description, type, grading_mode, max_score, order_index,
        is_published, drop_number, questions, role_filters, created_at, updated_at)
     VALUES
       (:id, :courseId, :title, :description, 'challenge', 'individual', :maxScore, :oi,
        false, 1, :questions, '{}', NOW(), NOW())`,
    {
      replacements: {
        id:          assignmentId,
        courseId:    COURSE_ID,
        title:       ASSIGNMENT_TITLE,
        description: 'Read each case fact and identify the single best-matching MITRE ATT&CK technique. These 20 questions are drawn from four real, publicly reported federal cybercrime cases — see the linked case-background reference items for full context on each.',
        maxScore,
        oi,
        questions:   JSON.stringify(questions),
      },
    },
  );
  console.log(`Assignment seeded — ${assignmentId} | ${questions.length} questions | ${maxScore} pts max`);

  // Linked reference reading — one intel_report content item per case
  const [[{ next: coi0 }]] = await seq.query(
    'SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM course_content_items WHERE course_id = :courseId',
    { replacements: { courseId: COURSE_ID } },
  );
  let coi = Number(coi0);

  for (const [caseId, info] of Object.entries(CASES)) {
    const description = [
      info.title,
      '',
      info.summary,
      '',
      'Fact pattern:',
      ...info.factPattern.map((f) => `• ${f}`),
      '',
      'Sources:',
      ...info.sourceUrls,
      '',
      DISCLAIMER,
    ].join('\n');

    const contentId = uuidv4();
    await seq.query(
      `INSERT INTO course_content_items
         (id, course_id, title, description, content_type, drop_number, linked_assignment_id, order_index, is_published, created_at, updated_at)
       VALUES
         (:id, :courseId, :title, :description, 'intel_report', 1, :assignmentId, :oi, false, NOW(), NOW())`,
      {
        replacements: {
          id:           contentId,
          courseId:     COURSE_ID,
          title:        `Case Background — ${info.shortName}`,
          description,
          assignmentId,
          oi:           coi,
        },
      },
    );
    console.log(`Reference item seeded — ${caseId} (${contentId})`);
    coi += 1;
  }

  console.log('\nAll unpublished by default. Unlock the assignment AND the 4 reference items separately via Admin → Content Gating when ready (challenge-type assignments do not auto-cascade content unlocks).\n');
  await seq.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
