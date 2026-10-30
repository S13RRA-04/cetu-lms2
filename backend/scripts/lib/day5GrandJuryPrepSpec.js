'use strict';
/**
 * Day 5 grand jury prep for PACKET HEIST v2 — one squad challenge per victim.
 * Each squad prepares to put its own victim's thread in front of a federal
 * grand jury, carried all the way through attribution to Alex M. Reston, and
 * asks for a true bill.
 *
 * Every victim assignment is the squad's victim checks + the shared case
 * checks + five squad deliverables (ChallengeFlow's mixed shape: auto-graded
 * checks feed JUDGMENT CHECKS, prompts feed SQUAD DELIVERABLES). Two more
 * search-testimony sets (SEARCHES) cover the Day 3 search each squad ran:
 * the residence, or the RestonIT office plus the CyberDyne consent search.
 *
 * Grounded only in what v2 Drops 1–4 put in front of students — the live
 * Drop 1/2 victim quizzes, the Packet 2–4 instructor manifests, and the
 * Drop 3/4 evidence files (access matrix, service tickets, Black Harbor
 * captures, crypto cluster report, CoinBridge KYC, Northwind MLAT partial
 * return, travel records). Nothing new about the case is invented here.
 *
 * Kept separate from seed-day5-testimony-prep.js (the original PACKET HEIST
 * scenario: different accounts, the Drop 6 office/residence split) — that
 * seeder destroys its rows by title, so these titles must never collide.
 *
 * Question ids are fixed strings, not uuids: check answers are stored by
 * question id, so the seeder can rewrite wording in place without
 * orphaning a submitted answer.
 *
 * Pure data — no database access.
 */

const { TITLE_PREFIX, SEARCH_SETS, victimTitle, searchTitle } = require('../../src/constants/day5GrandJury');

const CHECK_POINTS = 10;
const DELIVERABLE_POINTS = 30;

function mc(id, stem, options, correctIndex, reference, explain) {
  const optionIds = ['a', 'b', 'c', 'd'];
  return {
    id,
    stem,
    payload: {
      kind: 'multiple_choice',
      selectionMode: 'single',
      shuffle: true,
      options: options.map((text, i) => ({ id: optionIds[i], text })),
      correct: [optionIds[correctIndex]],
    },
    scoring: { points: CHECK_POINTS, mustPass: false },
    feedback: { correct: explain ? `Correct — ${explain}` : 'Correct.', incorrect: `Review ${reference}.`, reference },
  };
}

function blank(id, stem, accepted, reference) {
  return {
    id,
    stem,
    payload: { kind: 'fill_blank', blanks: [{ accepted, caseSensitive: false }] },
    scoring: { points: CHECK_POINTS, mustPass: false },
    feedback: { correct: 'Correct.', incorrect: `Review ${reference}.`, reference },
  };
}

function prompt(id, text, keyElements, modelAnswer) {
  return {
    id,
    kind: 'prompt',
    points: DELIVERABLE_POINTS,
    text,
    rubric: {
      keyElements,
      commonErrors: [`MODEL ANSWER (reference only — grade against the must-include list, not exact wording): ${modelAnswer}`],
    },
  };
}

/* ── The case through attribution — identical for every squad ── */
const CASE_CHECKS = [
  mc('gj5-case-standard',
    'What must the grand jury find before it returns a true bill against Alex M. Reston?',
    [
      'Probable cause to believe the offense was committed and that Reston committed it',
      'Proof beyond a reasonable doubt',
      'A unanimous vote of all jurors present',
      'That Reston has had a chance to testify in his own defense',
    ], 0, 'the grand jury standard',
    'a grand jury decides probable cause, by a majority of at least 12 jurors; guilt beyond a reasonable doubt is the trial jury\'s question.'),
  mc('gj5-case-identity',
    'Which single artifact most directly ties the Black Harbor seller BRKR_AL to Alex Reston?',
    [
      'The PGP private key 0xA1C4 7E90 2B7F 11F0 recovered from Reston\'s residence laptop, matching the public key on the BRKR_AL vendor profile',
      'The Alabama Secretary of State record naming Reston as RestonIT\'s principal',
      'The VeilStream subscriber return for VS-88213',
      'RestonIT appearing in all four victims\' vendor records',
    ], 0, 'the Drop 4 residence extractions (RIT-RES_pgp_keyring_export) against the Drop 3 BRKR_AL vendor profile',
    'only the holder of the private key can operate as that PGP identity, and it was on his own device. The SOS record and vendor ties are context, not identity.'),
  mc('gj5-case-matrix',
    'What does the client_access_matrix.csv recovered from the RestonIT office workstation establish?',
    [
      'Reston\'s own inventory of the four victims\' provisioned accesses — provisioned dates, tech "AR", status SOLD, sale ref BH-0314',
      'A list of RestonIT\'s legitimate maintenance contracts only',
      'Sam Smith\'s personal access to client networks',
      'The buyer\'s list of targets, recovered from BRKR_RU',
    ], 0, 'the Drop 4 office extraction (client_access_matrix.csv)',
    'the provisioned dates match each victim\'s account-creation records, and BH-0314 matches the 2026-03-14 Black Harbor escrow.'),
  mc('gj5-case-proceeds',
    'What closes the money trail from the four-victim sale to Reston?',
    [
      'The CoinBridge KYC return: the seller wallet 1PLHivNCfKyW6pTMacPKLRmcWCYphGCPLn cashed out at CoinBridge and withdrew to RestonIT ****7734 and A. Reston personal ****2091',
      'The Ozark Valley bank return on "Raymond T. Colson"',
      'The ransom note\'s wallet in Pixel Play\'s Drop 1 evidence',
      'RestonIT\'s routine vendor invoices to the victims',
    ], 0, 'the Drop 3 crypto cluster report and the Drop 4 CoinBridge KYC return',
    'escrow paid 0.92 BTC from the buyer wallet to the seller wallet on 2026-03-14; the seller wallet cashed out through CoinBridge to Reston-controlled accounts.'),
  mc('gj5-case-buyer',
    'A grand juror asks: "Did Reston himself encrypt, steal, or redirect anything?" What is the accurate answer?',
    [
      'No — the evidence shows a separate buyer (BRKR_RU, d.kort92@protonrelay.example) used the accesses; Reston provisioned and sold them, and no d.kort92 artifacts were on his devices',
      'Yes — Reston personally carried out all four attacks',
      'Yes — d.kort92 is an alias Reston used',
      'Unknown — the buyer and seller cannot be distinguished',
    ], 0, 'the Black Harbor escrow thread and the Drop 4 browser artifacts',
    'overstating Reston\'s role is the fastest way to lose credibility with the grand jury; his liability rests on provisioning, selling, and joining the scheme, not on the buyer\'s hands-on acts.'),
  mc('gj5-case-sam',
    'How should Sam Smith appear in the grand jury presentation?',
    [
      'As an innocent witness: his ticket log puts tech "AR" on every backdoor-provisioning visit, and his own visits were unrelated',
      'As an unindicted co-conspirator',
      'He should not be mentioned, because he was paid by Reston',
      'As the person who provisioned the accounts',
    ], 0, 'the Drop 4 service ticket log and Sam Smith\'s phone payment export',
    'his records corroborate Reston\'s presence on the provisioning dates; nothing incriminates Sam.'),
  mc('gj5-case-provenance',
    'A grand juror asks how the FBI obtained the Black Harbor listings and escrow messages. What is the correct answer?',
    [
      'They were captured by an authorized online covert employee, documented in the collection cover memo — not obtained by legal process',
      'By search warrant served on Black Harbor Exchange',
      'By MLAT request to Estonia',
      'They were recovered from Reston\'s laptop',
    ], 0, 'the Drop 3 Black Harbor collection cover memo',
    'every witness has to be able to say how each exhibit was obtained, and this one is undercover collection.'),
  blank('gj5-case-saturnv',
    'The access matrix shows a fifth client whose provisioned access was LISTED but not yet sold, the only preventable victim: ______.',
    ['SaturnV Mart', 'SaturnV', 'Saturn V Mart', 'Saturn V', 'SaturnV Mart (svc_inventory)'],
    'the Drop 4 access matrix and saturnv_client_folder_notes.txt'),
  mc('gj5-case-legat',
    'How should the Legat Mexico City report of Reston\'s entry into Cancun be used before the grand jury?',
    [
      'Not as evidence — it was shared for lead purposes only; the airline, CBP, and passport-application records carry the travel facts',
      'Read it into the record as the primary proof of flight',
      'Present it as a foreign court finding',
      'It replaces the need for the passport-application record',
    ], 0, 'the Drop 4 travel records (TRAVEL_legat_mexico_city_communication)',
    'informal foreign-partner information is a lead; formal channels (MLAT, provisional arrest) are needed before it can be used.'),
];

/* ── Shared deliverables (same text for every squad) ── */
const FLIGHT_PROMPT = prompt('gj5-flight',
  'Flight and the alias: Reston flew Huntsville to Cancun on Sunday, October 25, three days before the search, on a U.S. passport in the name of Devin Ray Chapman (died October 11, 2024). Tell the AUSA (1) what additional counts, if any, these records support and on what evidence; (2) how the flight should and should not be characterized to the grand jury; and (3) what has to happen after a true bill to bring him back.',
  [
    'Identifies passport-fraud and identity-theft exposure (e.g. 18 U.S.C. § 1542 false statement in a passport application; § 1028A aggravated identity theft) grounded in the DS-11 record, Chapman\'s death certificate, and the deceased-person SSN',
    'Ties the alias to Reston through evidence, not assumption — the booking\'s contact email is amr.secure@protonrelay.example (the BRKR_AL key UID) and it was booked from his Huntsville connection; notes the passport photo comparison has not been done',
    'Characterizes the trip factually (one-way, three days before the search, no return record) without calling it proof of guilt, and does not present the Legat report as evidence',
    'Names a next step after the true bill: sealed indictment and arrest warrant, then provisional arrest and extradition through OIA (or removal if the passport is revoked); an INTERPOL notice once charged',
  ],
  'The travel records support a false-statement-in-passport-application count (§ 1542) and aggravated identity theft (§ 1028A): a DS-11 executed in April 2025 used a birth certificate, ID, and SSN belonging to Devin Ray Chapman, who died in October 2024. The booking ties the passport to Reston — its contact email is the BRKR_AL key UID. To the grand jury we describe the trip as it is recorded: a one-way flight to Cancun three days before the search, with no inbound record. The Legat report stays out as evidence. After a true bill we ask for a sealed indictment and arrest warrant, then pursue provisional arrest and extradition through OIA.');

/* ── Per-victim content ── */
const VICTIMS = {
  REDSTONE: {
    victimName: 'Redstone Memorial Hospital',
    short: 'Redstone Memorial',
    briefing: `Your squad presents the Redstone Memorial Hospital thread.

**The access:** svc_backup_rst, a domain service account in Backup Operators plus a domain-admin-adjacent group, created 2025-09-18 by RMH\\rmm_admin and never used until the 03:12 logon on 2026-07-30, which came in over the VPN from 203.0.113.61. Staff disabled it about 28 minutes later.
**The reconnaissance:** nurse Danielle Osei's "IT support" call came from burner DID 256-555-0147, registered to d.kort92@protonrelay.example, the same email on the VeilStream VPN account behind 203.0.113.61.
**The harm:** the HIPAA risk memo concludes no PHI was accessed before containment.`,
    checks: [
      blank('gj5-rmh-account', 'The Redstone Memorial account used in the intrusion was ______.', ['svc_backup_rst', 'RMH\\svc_backup_rst'], 'the Redstone Drop 1 alert and Drop 2 AD export'),
      mc('gj5-rmh-provision',
        'What puts Reston at the creation of that account?',
        [
          'Ticket T-5216: tech "AR" onsite 2025-09-18 for "imaging wing AD/service accts" — the same date the account was created and the date in Reston\'s access matrix',
          'Nurse Osei identified Reston\'s voice on the call',
          'The HIPAA risk memo names RestonIT',
          'The VeilStream return lists Reston as subscriber',
        ], 0, 'the Drop 4 service ticket log against the Drop 2 AD export',
        'three independent records agree on 2025-09-18.'),
      mc('gj5-rmh-listing',
        'Which Black Harbor listing matches Redstone Memorial\'s access?',
        [
          '#A-2288 — US regional hospital: domain service account, backup-operator and imaging-admin, reachable over the facility VPN (0.24 BTC)',
          '#A-2291 — US colocation / data center (0.42 BTC)',
          '#A-2285 — US hospitality (hotel) (0.18 BTC)',
          '#A-2280 — US SMB entertainment/retail (0.06 BTC)',
        ], 0, 'the Drop 3 Black Harbor listing capture',
        'the listings never name victims; the match is by characteristics.'),
      mc('gj5-rmh-phi',
        'A grand juror asks whether patient records were stolen. What is the accurate answer?',
        [
          'No — the hospital\'s HIPAA risk memo concludes no PHI was accessed before containment; the harm is the unauthorized access and the response it forced',
          'Yes — PHI was exfiltrated to the Estonian server',
          'Unknown, so it is fair to say patient data was likely taken',
          'Yes — the vishing call obtained patient data',
        ], 0, 'the Redstone Drop 1 HIPAA risk memo',
        'never let the seriousness of a hospital victim stretch the facts.'),
      blank('gj5-rmh-nurse', 'The Redstone nurse who received the "IT support" vishing call is ______.', ['Danielle Osei', 'Nurse Osei', 'Danielle Osei (RN)', 'Osei'], 'the Redstone Drop 1 witness statement'),
      mc('gj5-rmh-burner',
        'What ties the vishing call to the buyer who used Redstone\'s access?',
        [
          'The burner DID 256-555-0147 is registered to d.kort92@protonrelay.example, the same email on the VeilStream account behind exit IP 203.0.113.61',
          'The call came from RestonIT\'s office line',
          'Nurse Osei recognized the caller',
          'Nothing — the call is unrelated',
        ], 0, 'the Drop 2 VoIP and VeilStream returns'),
      mc('gj5-rmh-dormancy',
        'How long did svc_backup_rst sit unused between creation and the intrusion?',
        ['About 10 months (2025-09-18 to 2026-07-30)', 'About 28 minutes', 'About 2 years', 'It was used daily for routine backups'],
        0, 'the Redstone Drop 2 AD export'),
    ],
    narrative: {
      keys: [
        'Plain-language account a juror can follow: a hospital service account nobody on staff recognized, quietly created during a vendor visit, used once at night over the VPN, shut down in about half an hour',
        'Gets the dates and specifics right: created 2025-09-18; anomalous logon 03:12 on 2026-07-30 from 203.0.113.61; disabled ~28 minutes later',
        'States the harm accurately: no PHI accessed per the HIPAA risk memo; the harm is unauthorized access to hospital systems and the response it forced',
        'Says what the squad will NOT claim (e.g. PHI theft, patient-care impact, or that Reston personally logged in on July 30)',
      ],
      model: 'In September 2025 a service account called svc_backup_rst was created on Redstone Memorial\'s network with backup and near-domain-admin rights. No one on the hospital IT staff knows who made it or why. It sat unused for ten months. At 3:12 a.m. on July 30, 2026, someone connected over the hospital VPN from 203.0.113.61 and used it to log into three servers, the first time the account had ever been used. Staff disabled it 28 minutes later. The hospital\'s compliance review found no patient health information was accessed. Weeks earlier, a nurse had received a call from "IT support" asking for the remote-access portal address.',
    },
    counts: {
      keys: [
        'Proposes at least one § 1030 count fitting the conduct: provisioning and using an account beyond authorization on a protected computer (e.g. § 1030(a)(2) or (a)(5)), and/or trafficking in access (§ 1030(a)(6)) for the sale',
        'Adds a conspiracy theory (§ 1030(b) or § 371) linking the seller to the buyer\'s July 30 use',
        'Maps each element to a specific Redstone artifact (AD export, T-5216, access matrix row, listing #A-2288, escrow BH-0314)',
        'Does not plead a count the evidence can\'t carry (e.g. anything premised on PHI theft or patient harm)',
      ],
      model: 'Count: trafficking in access (§ 1030(a)(6)). Knowingly and with intent to defraud: the listing\'s own pitch and the escrow thread. Trafficked in information through which a computer may be accessed without authorization: the BRKR_AL listing #A-2288 describing svc_backup_rst, sold in bundle BH-0314. Affecting interstate commerce: an internet marketplace sale for bitcoin. Count: conspiracy (§ 1030(b)/§ 371) with BRKR_RU, with the July 30 logon from the VeilStream IP as an overt act.',
    },
    chain: {
      keys: [
        'Links victim to account to creator: svc_backup_rst created 2025-09-18 by RMH\\rmm_admin (the same provisioning identity at Pixel Play and Dogwood)',
        'Links account creation to Reston: ticket T-5216 (tech AR, onsite, 2025-09-18) and Reston\'s own access matrix row',
        'Links the access to the sale and Reston: listing #A-2288 to escrow BH-0314 (2026-03-14) to the BRKR_AL PGP private key on his laptop to CoinBridge KYC proceeds',
        'Names how each link was obtained (victim production, seized device under warrant, undercover collection, subpoena to CoinBridge)',
      ],
      model: 'Redstone AD export (victim production): svc_backup_rst created 2025-09-18 by RMH\\rmm_admin. RestonIT ticket T-5216 (office search warrant): tech AR onsite at Redstone that day for imaging-wing service accounts. Reston\'s access matrix (office workstation, warrant): the Redstone row, provisioned 2025-09-18, SOLD, BH-0314. Black Harbor listing #A-2288 and escrow messages (undercover collection): BRKR_AL sold it, with escrow on 2026-03-14. The PGP private key on Reston\'s laptop (residence warrant): Reston is BRKR_AL. CoinBridge KYC (subpoena): the sale proceeds reached his accounts.',
    },
    hardQuestion: {
      text: 'Grand juror question: "Nothing was stolen from the hospital and the account was shut off in half an hour. Why is this a federal crime at all?" Write the answer your witness gives.',
      keys: [
        'Explains the crime is the unauthorized access and the sale of it, not data theft — creating and selling a hidden admin-level account is itself the offense',
        'Notes the healthcare context and what the access could reach (backup and domain-admin-adjacent rights in a hospital) without claiming harm that didn\'t happen',
        'Points to the account sitting dormant for ten months and being sold, which shows intent, not an accident',
        'Stays calibrated: does not invent patient impact or PHI loss',
      ],
      model: 'Because the crime is not what the buyer happened to take that night. It\'s that someone with trusted vendor access secretly created a near-domain-admin account inside a hospital, kept it hidden for ten months, and sold it on a criminal marketplace. The quick containment and the absence of PHI loss are to the hospital\'s credit. They don\'t undo the unauthorized access or the sale.',
    },
  },

  DOGWOOD: {
    victimName: 'Dogwood Hotel & Resort',
    short: 'Dogwood',
    briefing: `Your squad presents the Dogwood Hotel & Resort thread.

**The access:** svc_mailmgmt, a tenant account with global-admin-equivalent rights created 2025-11-12 (rmm_admin@dogwoodhotel.example), used on May 9, 2026 to create a forwarding rule on AP manager Carla Denning's mailbox that sent invoice mail to dgw.apinvoices@relaymail.example.
**The fraud:** a lookalike-domain "vendor" email (magnolia-linensupply.example) redirected two wires, $48,200 on May 26 and $61,750 on June 2, to Ozark Valley account 4471820963 opened as "Raymond T. Colson." $37,400 was recovered. Net loss: $72,550.
**The vendor:** Dogwood holds the strongest RestonIT document of all four victims, a signed 2024 managed-services agreement.`,
    checks: [
      blank('gj5-dgw-account', 'The Dogwood tenant account that created the malicious forwarding rule was ______.', ['svc_mailmgmt'], 'the Dogwood Drop 2 tenant admin audit'),
      mc('gj5-dgw-provision',
        'What puts Reston at the creation of that account?',
        [
          'Ticket T-5252: tech "AR", remote "email tenant admin cleanup" on 2025-11-12 — the account\'s creation date and the date in Reston\'s access matrix',
          'Carla Denning identified Reston',
          'The lookalike domain is registered to Reston',
          'Raymond T. Colson is Reston\'s alias',
        ], 0, 'the Drop 4 service ticket log against the Drop 2 tenant export'),
      mc('gj5-dgw-loss',
        'What is Dogwood\'s net loss?',
        ['$72,550 ($48,200 + $61,750, less $37,400 recovered)', '$109,950', '$37,400', '$400,000'],
        0, 'the Dogwood Drop 1 wire confirmations and recall request'),
      mc('gj5-dgw-listing',
        'Black Harbor listing #A-2285 describes the hotel access as "ideal for invoice / payment redirection work." Why does that line matter for charging Reston?',
        [
          'It shows the seller knew and advertised that the access would be used for payment fraud, supporting his knowing participation in the buyer\'s wire fraud',
          'It proves Reston sent the lookalike-domain email',
          'It names Dogwood as the victim',
          'It doesn\'t matter; only the buyer\'s acts can be charged',
        ], 0, 'the Drop 3 Black Harbor listing capture',
        'knowledge and intent are usually the hardest elements to prove against the seller, and his own sales pitch supplies them.'),
      blank('gj5-dgw-colson', 'The Ozark Valley beneficiary account that received Dogwood\'s wires was opened in the synthetic identity "______."', ['Raymond T. Colson', 'Raymond Colson', 'Raymond T Colson'], 'the Drop 2 Ozark Valley bank return'),
      mc('gj5-dgw-decoy',
        'Should the employee who failed Dogwood\'s 2025 phishing test twice appear in the presentation?',
        [
          'No — that employee is innocent; the fraud ran through a mailbox rule and a lookalike domain, not that employee',
          'Yes, as a co-conspirator',
          'Yes, as the person who created the forwarding rule',
          'Yes, as the source of the stolen credentials',
        ], 0, 'the Dogwood Drop 1 phishing-test export'),
      blank('gj5-dgw-domain', 'The lookalike domain used to send the fake banking-change instruction was ______.', ['magnolia-linensupply.example', 'magnolia-linensupply'], 'the Drop 2 registrar/WHOIS return'),
    ],
    narrative: {
      keys: [
        'Plain-language account: a hidden admin account in the hotel\'s email system, a rule that secretly diverted invoice mail, then a fake vendor email that redirected two payments',
        'Gets the money right: $48,200 (May 26) + $61,750 (June 2); $37,400 recovered; net loss $72,550',
        'Names the mechanism specifics: svc_mailmgmt created 2025-11-12; forwarding rule May 9, 2026 on Carla Denning\'s mailbox; lookalike domain magnolia-linensupply.example; beneficiary "Raymond T. Colson"',
        'Says what the squad will NOT claim (e.g. that Reston sent the email or opened the Colson account, or that the phishing-test employee was involved)',
      ],
      model: 'In November 2025 an account called svc_mailmgmt, with full administrator rights over Dogwood Hotel\'s email system, was created during remote IT work. On May 9, 2026 it was used to set a hidden rule on the accounts-payable manager\'s mailbox, quietly forwarding invoice emails to an outside address. Then a fake email from a lookalike linen-supplier domain told the hotel to change bank details. Dogwood wired $48,200 on May 26 and $61,750 on June 2 to an account opened under a fake identity. The bank recovered $37,400. Dogwood lost $72,550.',
    },
    counts: {
      keys: [
        'Proposes a wire-fraud theory for the scheme (§ 1343, with conspiracy under § 1349) reaching Reston as a knowing participant',
        'Proposes a § 1030 count for the provisioned tenant account and/or its sale (§ 1030(a)(2), (a)(4) or (a)(6))',
        'Maps each element to Dogwood artifacts — the scheme (rule + lookalike email), interstate wires (wire confirmations), intent (listing #A-2285\'s "payment redirection" pitch), access (tenant audit, T-5252)',
        'Considers money laundering (§ 1956(h)) only on the proceeds trail it can actually show (Colson account to the CoinBridge outbound leg; escrow to the CoinBridge KYC), without overreaching',
      ],
      model: 'Conspiracy to commit wire fraud (§ 1349). The scheme: the BEC redirection through the forwarding rule and the lookalike domain. Interstate wires: the May 26 and June 2 transfers. Reston\'s knowing agreement: he provisioned svc_mailmgmt (T-5252, access matrix) and sold it as "ideal for invoice / payment redirection" (listing #A-2285), then took his share through escrow BH-0314. Plus trafficking in access (§ 1030(a)(6)) for the sale of the tenant-admin access itself.',
    },
    chain: {
      keys: [
        'Links victim to account to creator: svc_mailmgmt created 2025-11-12 by rmm_admin@dogwoodhotel.example (the same principal as Redstone and Pixel Play, in UPN format)',
        'Links creation to Reston: ticket T-5252 (tech AR, 2025-11-12) and his access matrix row; the signed 2024 managed-services agreement gave RestonIT that admin reach',
        'Links the sale to Reston: listing #A-2285 to escrow BH-0314 to the BRKR_AL PGP private key on his laptop to CoinBridge KYC proceeds',
        'Keeps buyer and seller apart: the lookalike domain was paid from the buyer wallet (1aAW…) and Colson is the buyer side\'s mule identity, not Reston',
      ],
      model: 'Tenant audit (victim production): svc_mailmgmt created 2025-11-12, and it made the May 9 forwarding rule. RestonIT ticket T-5252 (office warrant): tech AR did "email tenant admin cleanup" remotely that day, under the 2024 managed-services agreement. Access matrix (office warrant): the Dogwood row, SOLD, BH-0314. Listing #A-2285 and escrow (undercover): BRKR_AL sold it on 2026-03-14. PGP private key (residence warrant): BRKR_AL is Reston. CoinBridge KYC (subpoena): proceeds to his accounts. The lookalike domain and the Colson account belong to the buyer\'s side, paid from wallet 1aAW…, not Reston\'s.',
    },
    hardQuestion: {
      text: 'Grand juror question: "Reston didn\'t send the fake email and didn\'t receive the stolen wires. How can he be charged with the hotel\'s loss?" Write the answer your witness gives.',
      keys: [
        'Explains conspiracy/participant liability: he knowingly supplied the essential tool for the scheme and was paid for it',
        'Cites his own words as evidence of knowledge: "ideal for invoice / payment redirection work"',
        'Cites the money: escrow BH-0314 to his wallet to CoinBridge to his accounts',
        'Is candid that the buyer carried out the email and wire steps',
      ],
      model: 'Because he didn\'t have to send the email himself. He built the hidden admin account during a service job, then sold it advertising it was "ideal for invoice / payment redirection," and was paid from the same escrow that bought the other three accesses. The buyer carried out the fraud he advertised. Knowingly joining the scheme and supplying its key tool is enough to make him part of it.',
    },
  },

  CYBERDYNE: {
    victimName: 'CyberDyne Data Center',
    short: 'CyberDyne',
    briefing: `Your squad presents the CyberDyne Data Center thread.

**The access:** an EdgeGuard VPN-40 appliance (cdn-util-3, internal 10.14.8.77) hidden behind the CCTV NVR in Rack C3, absent from the asset inventory. NOC tech D. Voss installed it around May 20, 2025 for unsanctioned home access. On 2025-09-14 someone using svc-rmm with management agent RMM-Agent/4.7 added a user and a tunnel (egress-b). Voss says he didn't make those changes.
**The theft:** about 350 GB left over four nights in June 2026 to 198.51.100.23, a Northwind Datacenters OÜ (Tallinn, Estonia) VPS leased by d.kort92@protonrelay.example and paid from wallet 1aAW…, which received about 360 GB between June 15 and 18.
**The discovery:** client Meridian Claims Services found its data for sale on a breach forum. CyberDyne estimates its exposure at $400,000.`,
    checks: [
      blank('gj5-cdn-host', 'The internal address of the unlisted appliance that carried CyberDyne\'s exfiltration was ______.', ['10.14.8.77', 'cdn-util-3', '10.14.8.77 (cdn-util-3)'], 'the CyberDyne Drop 1 firewall egress report and Drop 3 provenance record'),
      mc('gj5-cdn-sept14',
        'What ties the September 14, 2025 appliance changes to Reston rather than D. Voss?',
        [
          'Ticket T-5206 puts tech "AR" on "remote mgmt setup" at CyberDyne that day; the changes were made through svc-rmm with RMM-Agent/4.7, the provisioning signature at the other victims; and Reston\'s access matrix lists the appliance as provisioned 2025-09-14',
          'Voss\'s badge records were blank that day',
          'The Northwind lease names Reston',
          'Meridian Claims identified RestonIT',
        ], 0, 'the Drop 3 appliance session log and the Drop 4 ticket log and access matrix'),
      mc('gj5-cdn-voss',
        'How should D. Voss be handled in the grand jury presentation?',
        [
          'Candidly: he installed the appliance against policy, which the defense will use, but the evidence shows someone else co-opted it on 2025-09-14 and he did not operate the tunnel',
          'Leave him out so the jurors aren\'t confused',
          'Present him as the primary suspect',
          'Present him as Reston\'s co-conspirator',
        ], 0, 'the Drop 3 provenance record',
        'jurors trust a presentation that confronts the obvious alternative suspect.'),
      mc('gj5-cdn-destination',
        'How did the FBI learn who leased the Estonian server that received CyberDyne\'s data?',
        [
          'A partial MLAT return from Northwind Datacenters via the Estonian central authority: lease email d.kort92@protonrelay.example, paid from wallet 1aAWicn55F1H2PyVjsXvCziuYb2De125z',
          'A grand jury subpoena served on Northwind',
          'Reston\'s laptop',
          'Voss\'s home computer',
        ], 0, 'the Drop 3 Northwind MLAT partial return',
        'domestic subpoenas don\'t reach a foreign provider; the disk image and onward-transfer logs are still pending.'),
      mc('gj5-cdn-listing',
        'Which Black Harbor listing matches CyberDyne\'s access?',
        [
          '#A-2291 — US colocation / data center: management-plane foothold, unrestricted egress, host logging disabled (0.42 BTC)',
          '#A-2288 — US regional hospital (0.24 BTC)',
          '#A-2285 — US hospitality (0.18 BTC)',
          '#A-2280 — US SMB entertainment/retail (0.06 BTC)',
        ], 0, 'the Drop 3 Black Harbor listing capture'),
      blank('gj5-cdn-exposure', 'CyberDyne estimated its exposure from the theft at $______.', ['400,000', '400000', '$400,000', '400k', '$400k'], 'the CyberDyne Drop 1 IC3 complaint'),
      blank('gj5-cdn-client', 'The CyberDyne client that found its data offered for sale on a breach forum was ______.', ['Meridian Claims Services', 'Meridian Claims'], 'the CyberDyne Drop 1 IC3 complaint'),
    ],
    narrative: {
      keys: [
        'Plain-language account: a hidden network box in a data center, taken over during vendor service work, then used to ship hosted client data to a server overseas',
        'Gets the specifics right: appliance cdn-util-3 / 10.14.8.77 in Rack C3; changes 2025-09-14; ~350 GB out in June 2026 to 198.51.100.23 (Northwind, Estonia); discovered when Meridian Claims found its data for sale; ~$400,000 exposure',
        'Explains Voss\'s role accurately: installed it for his own convenience, did not make the September changes per the record',
        'Says what the squad will NOT claim (e.g. that Reston received the data, or that the pending Northwind disk image shows the contents)',
      ],
      model: 'CyberDyne hosts data for about 30 business clients. In May 2025 one of its own technicians tucked a small VPN box into a server rack so he could reach the network from home, against policy. On September 14, 2025, during RestonIT service work, someone logged into that box with a remote-management tool, added a hidden user, and built an outbound tunnel. In June 2026 about 350 GB of client data flowed out through it to a rented server in Estonia. CyberDyne only learned of it when a client found its data for sale online. CyberDyne puts its exposure at about $400,000.',
    },
    counts: {
      keys: [
        'Proposes § 1030 counts fitting the conduct: unauthorized access and transmission causing damage (§ 1030(a)(5)) and/or obtaining information from a protected computer (§ 1030(a)(2)), plus trafficking in access (§ 1030(a)(6)) for the sale',
        'Adds conspiracy (§ 1030(b) or § 371) reaching the buyer\'s June exfiltration',
        'Maps elements to CyberDyne artifacts (appliance config/session log, T-5206, access matrix, listing #A-2291, Northwind return, egress report, loss estimate)',
        'Recognizes that loss over $5,000 (here ~$400K) supports felony treatment, and notes what\'s still pending (Northwind disk image, onward-transfer logs)',
      ],
      model: 'Trafficking in access (§ 1030(a)(6)): listing #A-2291 sold the appliance foothold, escrow BH-0314. Conspiracy to commit computer fraud (§ 1030(b)): Reston provisioned the tunnel on 2025-09-14 (session log, T-5206, access matrix), and the buyer used it in June 2026 to move about 350 GB to the d.kort92-leased Northwind VPS. Damage and loss: the $400K exposure estimate and the contractual and notification costs behind it.',
    },
    chain: {
      keys: [
        'Links the theft to the appliance: egress from 10.14.8.77 traced to cdn-util-3 in Rack C3; the session log shows the svc-rmm / RMM-Agent/4.7 changes on 2025-09-14',
        'Links the appliance changes to Reston: T-5206 (tech AR, 2025-09-14, remote mgmt setup), the matching RMM-Agent signature at the other victims, and his access matrix row',
        'Links the sale to Reston: listing #A-2291 to escrow BH-0314 to the BRKR_AL PGP key on his laptop to CoinBridge KYC proceeds',
        'Links the destination to the buyer, not Reston: the Northwind lease email d.kort92 and buyer wallet 1aAW…, via MLAT',
      ],
      model: 'Egress report and provenance record (victim production): 350 GB left via 10.14.8.77, which is cdn-util-3 in Rack C3. Appliance session log (victim production): svc-rmm with RMM-Agent/4.7 added a user and a tunnel on 2025-09-14. RestonIT ticket T-5206 (office warrant): tech AR on remote management setup at CyberDyne that day. Access matrix (office warrant): the CyberDyne row, SOLD, BH-0314. Listing #A-2291 and escrow (undercover): BRKR_AL sold it. PGP key (residence warrant): Reston is BRKR_AL. Northwind return (MLAT): the buyer d.kort92 leased the receiving server.',
    },
    hardQuestion: {
      text: 'Grand juror question: "Your own evidence says a CyberDyne employee, Voss, installed the device and used it to get in from home. Why isn\'t he the one we should be indicting?" Write the answer your witness gives.',
      keys: [
        'Acknowledges the fact squarely: Voss installed the appliance without authorization in May 2025',
        'Distinguishes the September 14, 2025 changes: a different account (svc-rmm), the RMM-Agent/4.7 tool, Voss\'s denial, and RestonIT\'s tech AR on site that day per T-5206',
        'Points to the sale and the money: Reston\'s own matrix and BRKR_AL\'s listing #A-2291 describe this access, and the proceeds reached Reston\'s accounts; nothing ties Voss to the listing, the escrow, or Northwind',
        'Stays fair to Voss: his policy violation is a separate matter for CyberDyne, not evidence that he ran the tunnel',
      ],
      model: 'Voss did install the box, and we\'re not hiding that. But the changes that turned it into a tunnel were made on September 14, 2025, through a different account, svc-rmm, using the same remote-management tool seen at the other victims. RestonIT\'s ticket log has Reston\'s tech code, AR, on remote management setup at CyberDyne that same day. Reston\'s own access matrix lists this appliance as his, sold. The listing, the escrow, and the money all lead to Reston. Nothing ties Voss to any of them.',
    },
  },

  PIXELPLAY: {
    victimName: 'Pixel Play Arcade',
    short: 'Pixel Play',
    briefing: `Your squad presents the Pixel Play Arcade thread.

**The access:** arcade_support, a local account with Administrators and Remote Desktop Users rights created 2025-10-15 by rmm_admin. The owner doesn't recognize it. It was used for an RDP logon (Logon Type 10) at 01:58 on 2026-07-11 from 203.0.113.61, the VeilStream exit IP for subscriber VS-88213, registered to d.kort92@protonrelay.example.
**The harm:** CRYPTLOCK-V ransomware encrypted the office PC (.cryptlk) between 02:13 and 02:41 and demanded 0.4 BTC to wallet 1G8Snt2yrTdQgpZmuJuAptt1MxTfEDKR4u. The ransom was not paid. Pixel Play reported it to Huntsville PD (report 2026-05123).
**The vendor:** RestonIT's small recurring invoices to Pixel Play stopped after 2025.`,
    checks: [
      blank('gj5-pxp-account', 'The Pixel Play account used for the RDP intrusion was ______.', ['arcade_support'], 'the Pixel Play Drop 1 security-event log and Drop 2 local accounts export'),
      mc('gj5-pxp-provision',
        'What puts Reston at the creation of that account?',
        [
          'Ticket T-5229: tech "AR" onsite 2025-10-15 for "back-office PC support" — the account\'s creation date and the date in Reston\'s access matrix',
          'The owner\'s email names Reston as the attacker',
          'The ransom note is signed BRKR_AL',
          'Huntsville PD\'s report names RestonIT',
        ], 0, 'the Drop 4 service ticket log against the Drop 2 local accounts export'),
      mc('gj5-pxp-listing',
        'Which Black Harbor listing matches Pixel Play\'s access?',
        [
          '#A-2280 — US SMB (entertainment/retail): local administrator + RDP on a back-office machine, low monitoring (0.06 BTC)',
          '#A-2291 — US colocation / data center (0.42 BTC)',
          '#A-2288 — US regional hospital (0.24 BTC)',
          '#A-2285 — US hospitality (0.18 BTC)',
        ], 0, 'the Drop 3 Black Harbor listing capture'),
      mc('gj5-pxp-ransom',
        'A grand juror asks: "Did Reston demand the ransom?" What is the accurate answer?',
        [
          'The evidence shows the buyer\'s side deployed CRYPTLOCK-V; the ransom wallet (1G8S…) received no payment, and Reston\'s liability rests on provisioning and selling the access the buyer used',
          'Yes — the ransom wallet is Reston\'s',
          'Yes — the owner paid Reston 0.4 BTC',
          'The ransom note names Reston',
        ], 0, 'the Drop 1 ransom note and the Drop 3 crypto cluster report'),
      blank('gj5-pxp-ip', 'The RDP logon at 01:58 on July 11 came from external IP ______.', ['203.0.113.61'], 'the Pixel Play Drop 1 security-event log'),
      mc('gj5-pxp-shared-ip',
        'Why does that IP matter beyond Pixel Play?',
        [
          'The same VeilStream exit IP (subscriber VS-88213, d.kort92@protonrelay.example) preceded Redstone Memorial\'s anomalous logons — one buyer behind two victims',
          'It is RestonIT\'s office IP',
          'It is the Northwind server in Estonia',
          'It belongs to Huntsville PD',
        ], 0, 'the Drop 2 VeilStream return and the cross-squad sync'),
      mc('gj5-pxp-loss',
        'Pixel Play\'s dollar loss is comparatively small. Why can a § 1030 felony still be charged?',
        [
          'Loss from a related course of conduct affecting other protected computers can be aggregated toward the $5,000 threshold, and the encryption is itself damage to a protected computer',
          'It can\'t — small losses are always misdemeanors',
          'Because the ransom was paid',
          'Because Huntsville PD referred it',
        ], 0, '18 U.S.C. § 1030(c)(4)(A)(i)(I)',
        'the four accesses were sold as one bundle, which makes them a single related course of conduct.'),
    ],
    narrative: {
      keys: [
        'Plain-language account: a small arcade whose owner relied on an outside IT company; an admin account the owner never knew about; a night-time remote login; files encrypted and a ransom demanded',
        'Gets the specifics right: arcade_support created 2025-10-15; RDP logon at 01:58 on 2026-07-11 from 203.0.113.61; encryption 02:13–02:41; CRYPTLOCK-V, 0.4 BTC, not paid',
        'Explains the vendor tie fairly: RestonIT set up their systems and its invoicing stopped after 2025',
        'Says what the squad will NOT claim (e.g. that Reston deployed the ransomware or received a ransom)',
      ],
      model: 'Pixel Play is a small arcade, and the owner says "our IT guy set everything up years ago." In October 2025, during a RestonIT support visit, an administrator account called arcade_support was created on the back-office PC. The owner had never heard of it. At 1:58 a.m. on July 11, 2026, someone logged into it remotely through an anonymizing VPN. Within the next 45 minutes ransomware encrypted the office files and demanded 0.4 bitcoin. The owner didn\'t pay and reported it to Huntsville police.',
    },
    counts: {
      keys: [
        'Proposes § 1030 counts fitting the conduct: trafficking in access (§ 1030(a)(6)) for the sale and/or unauthorized access causing damage (§ 1030(a)(5)) reached through conspiracy',
        'Adds conspiracy (§ 1030(b) or § 371) linking the seller to the buyer\'s July 11 intrusion; may note the extortion demand (§ 1030(a)(7)) as the buyer\'s conduct within the scheme',
        'Maps elements to Pixel Play artifacts (local accounts export, T-5229, access matrix row, listing #A-2280, RDP log, ransom note)',
        'Handles the low dollar loss: aggregation across the related course of conduct for the $5,000 felony threshold',
      ],
      model: 'Trafficking in access (§ 1030(a)(6)): listing #A-2280, sold in bundle BH-0314. Conspiracy (§ 1030(b)): Reston provisioned arcade_support (T-5229, access matrix), and the buyer used it on July 11 from the VeilStream IP and deployed CRYPTLOCK-V. Damage: the encrypted files. Loss aggregated with the other three accesses sold in the same bundle, a related course of conduct, to clear the felony threshold.',
    },
    chain: {
      keys: [
        'Links victim to account to creator: arcade_support created 2025-10-15 by rmm_admin (the same provisioning identity at Redstone and Dogwood)',
        'Links creation to Reston: ticket T-5229 (tech AR, onsite, 2025-10-15) and his access matrix row',
        'Links the sale to Reston: listing #A-2280 to escrow BH-0314 to the BRKR_AL PGP private key on his laptop to CoinBridge KYC proceeds',
        'Keeps the buyer separate: 203.0.113.61 is the d.kort92 VeilStream account; the ransom wallet 1G8S… is buyer-side and was never paid',
      ],
      model: 'Local accounts export (victim production): arcade_support created 2025-10-15 by rmm_admin. RestonIT ticket T-5229 (office warrant): tech AR onsite at Pixel Play that day. Access matrix (office warrant): the Pixel Play row, SOLD, BH-0314. Listing #A-2280 and escrow (undercover): BRKR_AL sold it. PGP key (residence warrant): Reston is BRKR_AL. CoinBridge KYC (subpoena): proceeds to his accounts. The July 11 login came from the buyer\'s VeilStream account (VeilStream return, subpoena).',
    },
    hardQuestion: {
      text: 'Grand juror question: "This is a tiny arcade that didn\'t even pay the ransom. Why is it in a federal indictment?" Write the answer your witness gives.',
      keys: [
        'Explains that the harm is real regardless of size: encrypted business systems and an extortion demand',
        'Explains why it belongs with the others: same provisioning pattern, same seller, sold in the same bundle (BH-0314), same buyer infrastructure as Redstone',
        'Notes the legal point: the bundle is a related course of conduct, so losses can be aggregated',
        'Stays accurate: the ransom wasn\'t paid, and the buyer, not Reston, deployed the ransomware',
      ],
      model: 'Because the size of the victim doesn\'t change what was done to it. The same technician code, the same method, and the same buyer show up here as at the hospital and the hotel. Reston sold this access in the same four-pack, advertised as "nobody\'s watching that one." The owner had his files locked and a ransom demanded. That he didn\'t pay is to his credit, not Reston\'s.',
    },
  },
};

function buildQuestions(victimCode) {
  const v = VICTIMS[victimCode];
  if (!v) throw new Error(`Unknown victim code ${victimCode}`);
  const id = (suffix) => `gj5-${victimCode.toLowerCase()}-${suffix}`;
  return [
    ...v.checks,
    ...CASE_CHECKS,
    prompt(id('narrative'),
      `Victim summary for the grand jury: in plain language a juror with no technical background can follow, tell the story of what happened to ${v.victimName} — when, how it was discovered, and what the harm was. End with one sentence on what your witness will NOT claim.`,
      v.narrative.keys, v.narrative.model),
    prompt(id('counts'),
      `Proposed counts: list the count(s) ${v.short}'s thread supports against Alex M. Reston. For each, give the statute, its elements, and the specific ${v.short} artifact that proves each element.`,
      v.counts.keys, v.counts.model),
    prompt(id('chain'),
      `Attribution chain: walk the grand jury from ${v.victimName}'s compromise to Alex M. Reston, one link at a time. For each link, name the artifact and how it was obtained (victim production, subpoena, warrant, MLAT, or undercover collection).`,
      v.chain.keys, v.chain.model),
    prompt(id('hard-question'), v.hardQuestion.text, v.hardQuestion.keys, v.hardQuestion.model),
    FLIGHT_PROMPT,
  ];
}

function launchBriefing(victimCode) {
  const v = VICTIMS[victimCode];
  return `Friday morning, the AUSA presents the BROKERED EXIT case to the federal grand jury and asks for a true bill against Alex M. Reston. Each squad's case agent will testify to one victim's thread, carried all the way through attribution. Jurors can and do ask questions. The witness the wheel picks this afternoon answers them under oath.

${v.briefing}

**The case through attribution:** each of the four accesses was provisioned by tech "AR" on a RestonIT service visit, listed by BRKR_AL on Black Harbor in March 2026, and sold as one bundle to BRKR_RU (d.kort92@protonrelay.example) in escrow BH-0314 on 2026-03-14. The office search recovered Reston's own access matrix. The residence search recovered BRKR_AL's PGP private key and seller wallet. CoinBridge's KYC return traces the proceeds to RestonIT ****7734 and Reston's personal ****2091. Three days before the search, Reston flew to Cancun on a passport in the name of Devin Ray Chapman, a man who died in 2024.

Work from your Case File. Answer the checks, then write the five deliverables as your witness will deliver them: plain language, exact facts, nothing overstated. The grand jury decides probable cause, not guilt.`;
}

/* ── Search testimony — one set per search team (Day 3 PM KCR operation) ──
   Grounded in the KCR Practical instructor packet (scenes, role-players,
   the CyberDyne dead-man's-switch inject) and the Drop 4 seized-evidence
   inventory, photo log and extractions. */
const SEARCHES = {
  RESIDENCE: {
    name: SEARCH_SETS.RESIDENCE.name,
    briefing: `Your squad executed the search warrant at Alex Reston's residence on Wednesday afternoon, and your case agent testifies to it.

**On scene:** Jordan Reston, Alex's spouse, was home. Alex was not. Jordan saw the business as "doing fine," had noticed higher household spending and long hours, knew about solo RV trips, and had never known of a second computer.
**Seized (inventory 2B1–2B4):** the personal laptop (2B1), the spiral notebook (2B2), printed personal financial records including a page resembling a wallet backup (2B3), and Alex's mobile phone (2B4, extraction pending).
**What it produced:** the laptop extraction recovered a PGP private key (0xA1C4 7E90 2B7F 11F0) matching the BRKR_AL vendor key, Tor Browser and Black Harbor session remnants, CoinBridge logins, and a wallet holding the BRKR_AL seller address.`,
    checks: [
      mc('gj5-res-basis',
        'What was the legal authority for entering the Reston residence?',
        [
          'A search warrant, supported by the probable-cause package built from Packets 1–3 on Wednesday morning',
          'Jordan Reston\'s consent',
          'Exigent circumstances',
          'The office warrant, which covered every RestonIT-linked location',
        ], 0, 'the KCR operation order and Wednesday\'s PC package'),
      mc('gj5-res-jordan',
        'How should Jordan Reston be described to the grand jury?',
        [
          'As a witness: the spouse who was home, knew nothing about Black Harbor, BRKR_AL, CoinBridge or cryptocurrency, and had never known of a second computer',
          'As a co-conspirator who hid the laptop',
          'As the person who operated the BRKR_AL account',
          'Jordan should not be mentioned',
        ], 0, 'the residence scene and Jordan Reston\'s statements'),
      blank('gj5-res-laptop-item', 'The personal laptop that held BRKR_AL\'s PGP private key was inventoried as item ______.', ['2B1'], 'the Drop 4 seized-evidence inventory'),
      mc('gj5-res-concealment',
        'Sam Smith had heard Alex mention a home laptop; Jordan had never known one existed. Why does that matter in testimony?',
        [
          'Concealing the device from his own spouse is itself evidence, and where the laptop was found was documented for that reason',
          'It means one of the two witnesses is lying and both should be excluded',
          'It shows the laptop belongs to Jordan',
          'It doesn\'t matter',
        ], 0, 'the KCR residence scene notes'),
      mc('gj5-res-laptop-findings',
        'What did the extraction of the residence laptop recover?',
        [
          'A PGP private key matching the BRKR_AL vendor key, Tor Browser and Black Harbor session remnants, CoinBridge logins, and a wallet holding the BRKR_AL seller address',
          'The buyer\'s d.kort92 webmail sessions',
          'The client access matrix',
          'The Northwind server\'s disk image',
        ], 0, 'the Drop 4 residence laptop extraction report and browser artifacts',
        'the d.kort92 buyer account is not on his machine, which is consistent with Reston being the seller, not the buyer.'),
      mc('gj5-res-scope',
        'Household finances and ordinary family devices were also in the residence. What is the right approach?',
        [
          'Stay inside the warrant: seize what the warrant covers and leave the spouse\'s property and benign household items unless they fall within it',
          'Seize everything, since anything could be relevant',
          'Seize all of Jordan\'s devices too',
          'Seize nothing financial',
        ], 0, 'the KCR residence scene notes'),
      mc('gj5-res-phone',
        'A grand juror asks what was on Alex Reston\'s phone. What is the accurate answer?',
        [
          'The phone (item 2B4) was seized at the residence; its extraction is still pending, so the witness can\'t speak to its contents',
          'It shows him booking the Cancun flight',
          'It shows his Black Harbor messages',
          'It was never found',
        ], 0, 'the Drop 4 seized-evidence inventory',
        'a witness testifies to what was done and found, not to what an unfinished extraction might show.'),
      mc('gj5-res-photo',
        'What was done before the laptop was moved or bagged?',
        [
          'It was photographed in place (IMG-058: open, Tor Browser window visible), its power state noted, and CART called before handling a powered device',
          'It was powered off to preserve the battery',
          'An agent browsed it to confirm what was on it',
          'Nothing; photographs were taken afterward at the office',
        ], 0, 'the Drop 4 photo log and the KCR digital-evidence standard'),
    ],
    deliverables: [
      prompt('gj5-res-narrative',
        'Search narrative: tell the grand jury how the residence search was conducted — the legal authority, entry, who was present and how they were treated, and what was found and where. Plain language, in order.',
        [
          'States the authority: a search warrant from the probable-cause package; describes knock-and-announce and entry',
          'Describes Jordan Reston accurately, as a witness, and notes Alex was not home',
          'Names the key items and where they were (laptop 2B1, notebook 2B2, financial records/wallet-backup page 2B3, phone 2B4) and that each was photographed before collection',
          'Does not overstate: no claim about the phone\'s contents and no suggestion that Jordan was involved',
        ],
        'On Wednesday afternoon agents executed a federal search warrant at the Reston residence. They knocked, announced, and entered. Jordan Reston, Alex\'s spouse, was home and cooperative. Alex was not there. Before anything was moved, agents photographed the scene. They found a personal laptop open with a Tor Browser window showing, a spiral notebook on the desk, and printed bank statements with a page resembling a wallet backup. They also seized Alex\'s phone. Jordan told us they had never known Alex had a second computer.'),
      prompt('gj5-res-custody',
        'From scene to exhibit: pick the laptop (2B1) and one other residence item. For each, explain how it got from the residence to an exhibit the grand jury can rely on — photograph, item number, custody form, imaging or scanning, and the finding it produced.',
        [
          'Laptop: photo IMG-058, item 2B1, custody form at collection, power state noted and CART before handling, imaged, then the extraction report (PGP private key, Tor/Black Harbor, wallet)',
          'A second item traced the same way (e.g. notebook 2B2, photo IMG-052, scanned; or 2B3, photo IMG-061, scanned)',
          'Names residence items as their own custody chain, separate from the office and CyberDyne',
          'Says how any custody gap the squad logged on scene would be disclosed rather than smoothed over',
        ],
        'Laptop: photographed in place as IMG-058, numbered 2B1, logged on the custody form at collection, with power state noted and CART called before anyone touched it. It was imaged, and the examiner\'s extraction from the image recovered the BRKR_AL PGP private key, the Tor and Black Harbor artifacts, and the seller wallet. Notebook: photographed as IMG-052, numbered 2B2, then scanned. Both stay on the residence custody chain.'),
      prompt('gj5-res-hard-question',
        'Grand juror question: "Alex Reston wasn\'t home, and his own spouse had never seen this laptop. How do you know it\'s his?" Write the answer your witness gives.',
        [
          'Location and control: found in his home office, among his personal papers, documented where found',
          'Contents tie it to him: the BRKR_AL private key, Black Harbor sessions, CoinBridge logins, and a wallet whose proceeds the CoinBridge KYC routes to his accounts',
          'Treats the concealment as evidence, not a gap: hiding it from the spouse is consistent with its purpose; Sam Smith heard Alex mention a home laptop',
          'Stays calibrated: probable cause, not proof beyond a reasonable doubt; doesn\'t claim forensic user attribution the extraction didn\'t make',
        ],
        'Because of where it was, what was on it, and where its money went. It was in his home office with his papers. It held the private key for the BRKR_AL seller account, his Black Harbor sessions, and the wallet whose cash-outs CoinBridge traced to his personal and business accounts. His coworker had heard him talk about a home laptop. That his spouse didn\'t know about it doesn\'t weaken the link. Keeping it hidden fits what it was used for.'),
    ],
  },
  OFFICE: {
    name: SEARCH_SETS.OFFICE.name,
    briefing: `Your squad executed the search warrant at RestonIT LLC, Suite 214, then secured CyberDyne's Rack C3 on consent, and your case agent testifies to both.

**The office:** Sam Smith was present, an employee whose afternoon got interrupted. Seized: Reston's workstation (1B1, the access_matrix spreadsheet open on screen), a 2TB external drive (1B2), the "Clients" folder with a hanging file labeled SaturnV Mart (1B3), and Sam Smith's workstation (1B4), kept separate in the log.
**The inject:** partway through, Reston's desk (RIT-DESK-01) showed a live session, \`ssh svc-rmm@10.14.8.77\`, into CyberDyne's appliance cdn-util-3. A cron job (\`0 23 * * * checkin.sh || purge.sh\`) would shred its tunnel and auth logs and reset its config at 23:00 unless a rotating check-in password was entered. Seizing the workstation could not stop it, because the wipe runs at CyberDyne.
**CyberDyne:** on the consent of Marcus Iyer, CyberDyne's Facilities & IT Coordinator, a team secured Rack C3 and captured the appliance's state before 23:00.`,
    checks: [
      mc('gj5-off-basis',
        'What was the legal authority at each of the two places your squad searched?',
        [
          'RestonIT office: a search warrant. CyberDyne Rack C3: consent from Marcus Iyer, CyberDyne\'s Facilities & IT Coordinator',
          'A single warrant covered both locations',
          'Both were consent searches',
          'Both were warrantless exigent-circumstances entries',
        ], 0, 'the KCR operation order and the CyberDyne inject'),
      mc('gj5-off-why-consent',
        'Why did the squad seek consent at CyberDyne instead of a second warrant?',
        [
          'The wipe was set to run on CyberDyne\'s appliance at 23:00, a second warrant would not arrive in time, and seizing Reston\'s workstation could not stop it',
          'Consent searches are always preferred to warrants',
          'The office warrant already covered CyberDyne',
          'The magistrate refused a second warrant',
        ], 0, 'the CyberDyne dead-man\'s-switch inject'),
      blank('gj5-off-wipe-time', 'The dead-man\'s switch on cdn-util-3 was set to wipe the appliance\'s logs at ______ that night.', ['23:00', '2300', '11 pm', '11pm', '11:00 pm', '11:00pm', '11 p.m.', '11:00 p.m.'], 'the inject transcript (crontab: 0 23 * * *)'),
      mc('gj5-off-session',
        'What does the live session `ssh svc-rmm@10.14.8.77` on Reston\'s own desk establish?',
        [
          'Reston\'s workstation held working credentials to CyberDyne\'s appliance under the svc-rmm identity, the account that made the September 14, 2025 tunnel changes',
          'That Reston was the buyer who received CyberDyne\'s data',
          'That Sam Smith operated the appliance',
          'That 203.0.113.9 is Reston\'s home IP',
        ], 0, 'the inject transcript and the Drop 3 appliance session log'),
      mc('gj5-off-hands-off',
        'Why didn\'t the squad just type a check-in password, or close the session, to stop the wipe?',
        [
          'Any keystroke alters the evidence and the defense would attack it; the check-in password rotates and can\'t be known; the right move was hands off, photograph, escalate, and capture the appliance\'s state at CyberDyne',
          'Agents may freely use a suspect\'s live sessions during a search',
          'Closing the session would have stopped the wipe',
          'The password was written on the monitor',
        ], 0, 'the inject\'s correct-response sequence'),
      mc('gj5-off-iyer-scope',
        'What limits Marcus Iyer\'s consent, and how was that handled?',
        [
          'He has practical authority over the network closet and Rack C3, not the whole company, so consent was documented before entry with its scope limited to Rack C3 and the appliance',
          'Any employee can consent to a search of any company space',
          'His consent covered RestonIT\'s office too',
          'Consent needs no documentation if given verbally',
        ], 0, 'the KCR CyberDyne scene notes'),
      mc('gj5-off-saturnv',
        'What in the office required immediate action beyond evidence collection?',
        [
          'The SaturnV Mart client file and its matrix row: an access provisioned but LISTED and not yet sold, a fifth victim who could still be protected by notification',
          'Sam Smith\'s routine help-desk invoices',
          'The 2TB external drive',
          'Nothing; everything could wait for Thursday',
        ], 0, 'photo log IMG-021 and the access matrix'),
      mc('gj5-off-203',
        'A grand juror asks whether 203.0.113.9, the appliance\'s standing admin source, proves the buyer and Reston used the same machine. What is the accurate answer?',
        [
          'No — buyer-side VeilStream sessions also reach 203.0.113.9, but VeilStream describes it as an upstream anonymizer, so it\'s a correlation, not a single-origin attribution',
          'Yes — it is Reston\'s home IP',
          'Yes — it is the buyer\'s home IP',
          'It is CyberDyne\'s own firewall',
        ], 0, 'the KCR inject grading notes'),
    ],
    deliverables: [
      prompt('gj5-off-narrative',
        'Search narrative: tell the grand jury how the office search unfolded, from warrant entry through discovering the live session to the CyberDyne consent search, and what was found at each place. Plain language, in order.',
        [
          'Office: warrant entry, Sam Smith present and treated as a witness, items photographed before collection (workstation with access_matrix on screen, Clients folder incl. SaturnV Mart, external drive, Sam\'s workstation kept separate)',
          'The live session: what it showed, that it was left untouched and photographed, and the escalation to the SA and Command Post',
          'CyberDyne: why consent, who gave it, its scope, and that the appliance state was captured before 23:00',
          'Keeps the two legal bases distinct and does not claim the office warrant covered CyberDyne',
        ],
        'On Wednesday afternoon agents executed a warrant at RestonIT\'s office, Suite 214. An employee, Sam Smith, was there and cooperated. Reston\'s workstation was on, with a spreadsheet called access_matrix open, and a desk drawer held client files, including one for SaturnV Mart. Partway through, an agent noticed a live remote session from Reston\'s computer into a device at CyberDyne, set to erase its logs at 11 p.m. Nobody touched the keyboard. It was photographed and reported. Since a warrant for CyberDyne couldn\'t arrive in time, agents asked CyberDyne\'s facilities and IT coordinator, Marcus Iyer, for consent to enter the rack room. He agreed, the scope was written down, and the device\'s state was captured before the deadline.'),
      prompt('gj5-off-custody',
        'From scene to exhibit: trace (1) Reston\'s workstation (1B1) and (2) the CyberDyne appliance from where they were found to an exhibit the grand jury can rely on, and explain why the two sit on separate custody chains.',
        [
          'Workstation: photo IMG-014, item 1B1, custody form at collection, power state and CART, imaged, then the extraction that produced client_access_matrix.csv',
          'Appliance: consent documented, rack and appliance photographed as found, CART captured logs/cron/config before 23:00, separate custody chain started for CyberDyne items',
          'Separate chains because of separate legal bases (warrant vs consent) and separate scenes; Sam\'s workstation (1B4) logged apart from Alex\'s',
          'Says how any custody gap the squad logged on scene would be disclosed rather than smoothed over',
        ],
        'Workstation: photographed in place as IMG-014 with the access_matrix spreadsheet on screen, numbered 1B1, logged on the custody form at collection, then imaged by CART. The office extraction from that image produced client_access_matrix.csv. Appliance: Iyer\'s consent and its scope were documented first, then the rack was photographed as found and CART captured the logs, cron entry and config before 23:00. It sits on its own CyberDyne custody chain because it came in on consent, at a different place, under different authority.'),
      prompt('gj5-off-hard-question',
        'Grand juror question: "You went into CyberDyne\'s data center without a warrant. Was that legal, and couldn\'t the defense get that evidence thrown out?" Write the answer your witness gives.',
        [
          'Explains consent: voluntarily given by someone with authority over that space (Iyer controls the network closet and Rack C3), documented with scope before entry',
          'Explains the urgency: the scheduled 23:00 wipe and why a second warrant couldn\'t arrive in time',
          'Notes CyberDyne is the victim and cooperated; the search stayed within the consented scope',
          'Stays honest about the limit: Iyer\'s authority is narrower than a corporate officer\'s; and the case does not depend on the appliance alone, since its September 2025 changes were already documented in CyberDyne\'s production',
        ],
        'It was legal because CyberDyne consented. Marcus Iyer runs the network closet and the rack where the device sat. We explained the urgency and he agreed, and we wrote down who consented, his authority, and exactly what we could search before going in. We needed consent because the device was set to wipe itself at 11 that night, and a warrant couldn\'t be obtained in time. CyberDyne is the victim here and wanted the device secured. The device\'s September 2025 changes were already documented in CyberDyne\'s own records, so the case doesn\'t rest on that night alone.'),
    ],
  },
};

const searchQuestions = (searchCode) => [...SEARCHES[searchCode].checks, ...SEARCHES[searchCode].deliverables];

function searchBriefing(searchCode) {
  return `Friday morning, the AUSA presents the BROKERED EXIT case to the federal grand jury. Every exhibit from Wednesday's searches comes in through the agents who seized it, so your case agent will testify to how your squad's search was conducted, what it found, and how each item got from the scene to the exhibit table. The witness the wheel picks this afternoon answers jurors' questions under oath.

${SEARCHES[searchCode].briefing}

Work from your on-scene notes, custody forms and the Drop 4 inventory and photo log. Say what was done and found, and nothing you didn't see.`;
}

const titleFor = (victimCode) => victimTitle(VICTIMS[victimCode].victimName);
const searchTitleFor = (searchCode) => searchTitle(searchCode);
const SEARCH_DESCRIPTION = 'Squad grand jury prep: the search your squad executed — legal authority, what was found, and how each item became an exhibit.';
const DESCRIPTION = 'Squad grand jury prep: confirm the facts of your victim\'s thread and the case through attribution, then write the testimony that will take it to a true bill against Alex M. Reston.';

module.exports = {
  VICTIM_CODES: Object.keys(VICTIMS),
  VICTIMS,
  CASE_CHECKS,
  TITLE_PREFIX,
  DESCRIPTION,
  titleFor,
  launchBriefing,
  buildQuestions,
  SEARCH_CODES: Object.keys(SEARCHES),
  SEARCHES,
  SEARCH_DESCRIPTION,
  searchTitleFor,
  searchBriefing,
  searchQuestions,
};
