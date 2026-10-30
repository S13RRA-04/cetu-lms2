'use strict';
/**
 * Question bank for the first-place tiebreak duel (lightning round).
 * Covers PACKET HEIST v2 end to end — victims, provisioning, the Black
 * Harbor sale, the money, the searches, attribution, and flight — drawn only
 * from facts the Drops 1–4 evidence and the Day 5 grand jury prep put in
 * front of students (see scripts/lib/day5GrandJuryPrepSpec.js).
 *
 * Lightning-round shape: one short stem, four short options, one correct.
 * The correct option is always listed first here; each duel shuffles the
 * options when it draws its questions. Ids are fixed strings so a duel's
 * snapshot can always be traced back to its bank entry.
 *
 * Pure data — no database access.
 */

const q = (id, stem, correct, ...wrong) => ({ id, stem, options: [correct, ...wrong] });

const LIGHTNING_BANK = [
  // ── Victims and their accesses ──
  q('ld-rmh-account', 'Which account was used in the Redstone Memorial intrusion?',
    'svc_backup_rst', 'svc_mailmgmt', 'arcade_support', 'svc_inventory'),
  q('ld-dgw-account', 'Which Dogwood tenant account created the malicious forwarding rule?',
    'svc_mailmgmt', 'svc_backup_rst', 'arcade_support', 'svc-rmm'),
  q('ld-pxp-account', 'Which account was used for the Pixel Play RDP intrusion?',
    'arcade_support', 'svc_backup_rst', 'svc_mailmgmt', 'rmm_admin'),
  q('ld-cdn-host', 'What is the internal address of CyberDyne\'s unlisted appliance (cdn-util-3)?',
    '10.14.8.77', '203.0.113.61', '198.51.100.23', '10.14.8.1'),
  q('ld-cdn-rack', 'Where was CyberDyne\'s hidden VPN appliance installed?',
    'Rack C3, behind the CCTV NVR', 'The RestonIT office closet', 'Rack A1, in the core switch', 'Meridian Claims\' server room'),
  q('ld-cdn-voss', 'Who originally installed the CyberDyne appliance, against policy?',
    'NOC tech D. Voss', 'Alex Reston', 'Sam Smith', 'Marcus Iyer'),
  q('ld-cdn-gb', 'About how much data left CyberDyne over four nights in June 2026?',
    'About 350 GB', 'About 35 GB', 'About 3.5 TB', 'About 900 GB'),
  q('ld-cdn-client', 'Which CyberDyne client found its data for sale on a breach forum?',
    'Meridian Claims Services', 'SaturnV Mart', 'Northwind Datacenters', 'Magnolia Linen Supply'),
  q('ld-cdn-exposure', 'What did CyberDyne estimate its exposure at?',
    '$400,000', '$72,550', '$109,950', '$40,000'),
  q('ld-dgw-net', 'What was Dogwood\'s net loss after the recovery?',
    '$72,550', '$109,950', '$37,400', '$61,750'),
  q('ld-dgw-recovered', 'How much of Dogwood\'s wired money was recovered?',
    '$37,400', '$48,200', '$72,550', 'None of it'),
  q('ld-dgw-domain', 'Which lookalike domain sent Dogwood the fake banking-change email?',
    'magnolia-linensupply.example', 'relaymail.example', 'protonrelay.example', 'dogwoodhotel.example'),
  q('ld-dgw-colson', 'The Ozark Valley account that received Dogwood\'s wires was opened as…',
    'Raymond T. Colson', 'Devin Ray Chapman', 'Carla Denning', 'D. Kort'),
  q('ld-dgw-carla', 'Whose mailbox got the hidden invoice-forwarding rule at Dogwood?',
    'Carla Denning, AP manager', 'Danielle Osei, RN', 'Jordan Reston', 'The employee who failed the phishing test'),
  q('ld-rmh-nurse', 'Which Redstone nurse took the "IT support" vishing call?',
    'Danielle Osei', 'Carla Denning', 'Jordan Reston', 'D. Voss'),
  q('ld-rmh-phi', 'Per the HIPAA risk memo, was Redstone patient data (PHI) accessed?',
    'No — none before containment', 'Yes — exfiltrated to Estonia', 'Yes — taken on the vishing call', 'Unknown'),
  q('ld-rmh-contain', 'About how long after the 03:12 logon did Redstone staff disable the account?',
    'About 28 minutes', 'About 3 hours', 'About 10 months', 'It was never disabled'),
  q('ld-pxp-ransomware', 'Which ransomware encrypted the Pixel Play office PC?',
    'CRYPTLOCK-V', 'LockBit 3.0', 'BlackCat', 'CRYPTLOCK-X'),
  q('ld-pxp-demand', 'How much ransom did the Pixel Play note demand?',
    '0.4 BTC', '0.92 BTC', '0.06 BTC', '4 BTC'),
  q('ld-pxp-paid', 'Was the Pixel Play ransom paid?',
    'No', 'Yes, in full', 'Half of it', 'Yes, by the insurer'),

  // ── Provisioning: tech "AR" on RestonIT tickets ──
  q('ld-t5216', 'Ticket T-5216 put tech "AR" onsite on 2025-09-18 at which victim?',
    'Redstone Memorial Hospital', 'Dogwood Hotel & Resort', 'Pixel Play', 'CyberDyne Data Center'),
  q('ld-t5252', 'Ticket T-5252 ("email tenant admin cleanup", 2025-11-12) matches which account?',
    'svc_mailmgmt', 'svc_backup_rst', 'arcade_support', 'cdn-util-3'),
  q('ld-t5229', 'On what date was arcade_support created (ticket T-5229)?',
    '2025-10-15', '2025-09-14', '2025-09-18', '2025-11-12'),
  q('ld-t5206', 'On what date did someone use svc-rmm to add a user and tunnel to CyberDyne\'s appliance?',
    '2025-09-14', '2025-05-20', '2025-10-15', '2026-03-14'),
  q('ld-rmm-agent', 'Which management agent string marked the CyberDyne appliance changes?',
    'RMM-Agent/4.7', 'EdgeGuard VPN-40', 'Tor Browser', 'svc_inventory'),
  q('ld-saturnv', 'Which fifth client\'s access was LISTED but not yet sold — the preventable victim?',
    'SaturnV Mart', 'Meridian Claims Services', 'Northwind Datacenters', 'CoinBridge'),

  // ── The sale on Black Harbor ──
  q('ld-seller', 'What was the seller\'s handle on Black Harbor?',
    'BRKR_AL', 'BRKR_RU', 'd.kort92', 'svc-rmm'),
  q('ld-buyer', 'Which email belongs to the buyer, BRKR_RU?',
    'd.kort92@protonrelay.example', 'amr.secure@protonrelay.example', 'dgw.apinvoices@relaymail.example', 'rmm_admin@dogwoodhotel.example'),
  q('ld-escrow', 'What reference did the four-victim bundle sale carry?',
    'BH-0314', 'T-5216', 'VS-88213', 'A-2291'),
  q('ld-escrow-amount', 'How much BTC moved through escrow on 2026-03-14?',
    '0.92 BTC', '0.4 BTC', '0.42 BTC', '9.2 BTC'),
  q('ld-listing-cdn', 'Which Black Harbor listing matches CyberDyne?',
    '#A-2291', '#A-2288', '#A-2285', '#A-2280'),
  q('ld-listing-pxp', 'Listing #A-2280 (0.06 BTC, back-office RDP) matches which victim?',
    'Pixel Play', 'Dogwood Hotel & Resort', 'Redstone Memorial', 'CyberDyne'),
  q('ld-provenance', 'How did the FBI obtain the Black Harbor listings and escrow messages?',
    'Online covert employee collection', 'Search warrant on Black Harbor', 'MLAT request to Estonia', 'Recovered from Reston\'s laptop'),

  // ── Infrastructure and money ──
  q('ld-veilstream', 'The VeilStream exit IP behind both Redstone and Pixel Play was…',
    '203.0.113.61', '198.51.100.23', '10.14.8.77', '198.51.100.142'),
  q('ld-northwind', 'Where was the Northwind server that received CyberDyne\'s data?',
    'Tallinn, Estonia', 'Cancun, Mexico', 'Huntsville, Alabama', 'Moscow, Russia'),
  q('ld-mlat', 'How did the FBI learn who leased the Northwind server?',
    'A partial MLAT return', 'A grand jury subpoena to Northwind', 'Reston\'s laptop', 'The Legat report'),
  q('ld-coinbridge', 'Which exchange\'s KYC return traced the sale proceeds to Reston\'s accounts?',
    'CoinBridge', 'Black Harbor', 'VeilStream', 'Ozark Valley'),

  // ── Searches and attribution ──
  q('ld-pgp', 'Which artifact most directly ties BRKR_AL to Alex Reston?',
    'The BRKR_AL PGP private key on his laptop', 'The Alabama SOS business record', 'The VeilStream subscriber return', 'Sam Smith\'s ticket log'),
  q('ld-laptop-item', 'The residence laptop holding the BRKR_AL key was inventoried as item…',
    '2B1', '1B1', '2B4', '1B3'),
  q('ld-matrix', 'Where was client_access_matrix.csv recovered?',
    'Reston\'s RestonIT office workstation', 'The residence laptop', 'Sam Smith\'s workstation', 'CyberDyne Rack C3'),
  q('ld-jordan', 'Who was home during the residence search?',
    'Jordan Reston, Alex\'s spouse', 'Alex Reston', 'Sam Smith', 'Nobody'),
  q('ld-rack-consent', 'What was the legal basis for searching CyberDyne\'s Rack C3?',
    'Consent', 'Search warrant', 'Exigent circumstances', 'Grand jury subpoena'),
  q('ld-gj-standard', 'What must a grand jury find to return a true bill?',
    'Probable cause', 'Proof beyond a reasonable doubt', 'A unanimous vote', 'A preponderance of the evidence'),

  // ── Flight ──
  q('ld-cancun', 'Where did Reston fly three days before the search?',
    'Cancun', 'Tallinn', 'Moscow', 'Mexico City'),
  q('ld-alias', 'Whose identity was on the passport Reston traveled under?',
    'Devin Ray Chapman', 'Raymond T. Colson', 'D. Kort', 'Sam Smith'),
];

const ROUNDS = 10;

module.exports = { LIGHTNING_BANK, ROUNDS };
