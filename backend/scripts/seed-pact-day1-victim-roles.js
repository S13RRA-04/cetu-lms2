'use strict';
/**
 * Seed PACKET HEIST v2 — Drop 1 ("The Victims") per-victim, per-role
 * individual assessment work, plus each victim's squad quiz, transcribed
 * from v2/files (23)/PACT_Day1_Squad_<Victim>_Student.docx and its
 * _InstructorKey.docx counterpart.
 *
 * Structure per victim (matches the docx worksheets exactly):
 *   - 7 professional-role assignments (SA/IA/DA/FoA/SOS/TFO/CS), each with
 *     3 multiple-choice + 1-2 fill-in-the-blank + 1 short-answer prompt,
 *     grading_mode:'individual', role_filters:[<role>], victim_name set —
 *     same shape as the existing Drop 7 role-tasking assignments.
 *   - 1 squad-quiz assignment (5 multiple-choice, grading_mode:'squad'),
 *     done together after every role finishes its individual work.
 *
 * A few items in the docx ask for two blanks in one sentence (e.g. "on May
 * ___ and June ___"); FillBlank only supports a single blank, so those are
 * written as a short prompt instead (see DUAL_BLANK_AS_PROMPT below) rather
 * than forcing two values into one text input.
 *
 * Run: node backend/scripts/seed-pact-day1-victim-roles.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const SCENARIO = 'packet-heist-v2';
const DROP = 1;
const TITLE_PREFIX = 'PACKET HEIST v2 — Drop 1:';

const MC_POINTS = 10;
const BLANK_POINTS = 10;
const PROMPT_POINTS = 30;

function mc(stem, options, correctIndex, reference) {
  const optionIds = ['a', 'b', 'c', 'd'];
  return {
    id: uuidv4(),
    stem,
    payload: {
      kind: 'multiple_choice',
      selectionMode: 'single',
      shuffle: true,
      options: options.map((text, i) => ({ id: optionIds[i], text })),
      correct: [optionIds[correctIndex]],
    },
    scoring: { points: MC_POINTS, mustPass: false },
    feedback: {
      correct: 'Correct.',
      incorrect: `Review ${reference} again.`,
      reference,
    },
  };
}

function blank(stem, accepted, reference) {
  return {
    id: uuidv4(),
    stem,
    payload: { kind: 'fill_blank', blanks: [{ accepted, caseSensitive: false }] },
    scoring: { points: BLANK_POINTS, mustPass: false },
    feedback: {
      correct: 'Correct.',
      incorrect: `Review ${reference} again.`,
      reference,
    },
  };
}

function prompt(text, keyElements, points = PROMPT_POINTS) {
  return {
    id: uuidv4(),
    kind: 'prompt',
    points,
    text,
    rubric: { keyElements },
  };
}

/* ── CyberDyne Data Center (Squad 3) ───────────────────────────────────── */
const CYBERDYNE = {
  code: 'CYBERDYNE',
  name: 'CyberDyne Data Center',
  roles: [
    {
      code: 'SA', label: 'Special Agent', roleFilter: 'special_agent',
      task: `Review CyberDyne's own intake complaint (IC3_complaint_cyberdyne.pdf) and set the squad's initial characterization of the incident.`,
      mc: [
        mc('How was CyberDyne\'s data theft first discovered?', ['An internal security audit', 'A client (Meridian Claims) reported their data for sale on a breach forum', 'A NOC ticket flagged it directly', 'An anonymous tip'], 1, 'the IC3 complaint'),
        mc('What is CyberDyne\'s estimated financial exposure per the IC3 complaint?', ['$72,550', '$109,950', '$400,000', '$48,200'], 2, 'the IC3 complaint'),
        mc('What kind of business is CyberDyne Data Center?', ['A regional hospital', 'A hosted-data/colocation provider for business clients', 'A retail arcade', 'A hotel chain'], 1, 'the IC3 complaint'),
      ],
      blanks: [
        blank('The client whose data appeared for sale on the breach forum is ______.', ['Meridian Claims Services', 'Meridian Claims'], 'the IC3 complaint'),
      ],
      dualBlankPrompt: prompt('CyberDyne\'s data theft was discovered on June ___, 2026, and the complaint was filed on June ___, 2026. State both dates.', ['Discovery date: June 20, 2026', 'Filing date: June 23, 2026'], BLANK_POINTS),
      shortAnswer: prompt('Summarize, in two or three sentences, what the IC3 complaint alone tells you about the scope and severity of this incident.', ['Mentions roughly 350 GB of hosted client data', 'Mentions the ~$400K estimated exposure', 'Notes discovery via client report rather than internal detection — a significant, externally-discovered breach']),
    },
    {
      code: 'IA', label: 'Intelligence Analyst', roleFilter: 'intelligence_analyst',
      task: `Review the firewall egress report and the sanctioned VPN's auth log — the two network logs.`,
      mc: [
        mc('What external IP is recorded as the destination of the data exfiltration?', ['203.0.113.61', '203.0.113.148', '198.51.100.23', '192.0.2.190'], 2, 'the firewall egress report'),
        mc('Approximately how much data was exfiltrated per the firewall egress report?', ['35 GB', '150 GB', '350 GB', '3.5 TB'], 2, 'the firewall egress report'),
        mc('What does the sanctioned VPN concentrator\'s auth log show for the exfiltration period?', ['The exfil host logged in normally', 'Only normal activity — the exfil host is conspicuously absent', 'Multiple failed logins', 'The VPN was disabled'], 1, 'the VPN auth log'),
      ],
      blanks: [
        blank('The firewall egress report shows outbound traffic over four nights in June, sourced from internal host ______.', ['10.14.8.77'], 'the firewall egress report'),
        blank('Because the exfiltrating host never appears in the sanctioned VPN\'s auth log, the theft must have bypassed ______ remote access.', ['official', 'sanctioned', 'official/sanctioned', 'the sanctioned'], 'the VPN auth log'),
      ],
      shortAnswer: prompt('Explain why the absence of the exfil host from the VPN auth log is itself an investigative finding, not just a lack of evidence.', ['Recognizes an absence where you\'d expect a record is informative', 'Concludes the access method wasn\'t the sanctioned channel, narrowing where to look next']),
    },
    {
      code: 'DA', label: 'Data Analyst', roleFilter: 'operational_support_da',
      task: `Parse the FY2025 accounts-payable vendor ledger and quantify RestonIT LLC's presence in it.`,
      mc: [
        mc('How many vendors appear in the ledger, approximately?', ['3', 'About a dozen', '50', 'Over 100'], 1, 'the vendor ledger'),
        mc('How is RestonIT LLC described in the ledger?', ['A flagged vendor', 'A line-item vendor for "managed IT services"', 'The largest vendor by dollar amount', 'A vendor under active dispute'], 1, 'the vendor ledger'),
        mc('What kind of ledger is this?', ['A payroll ledger', 'An accounts-payable vendor ledger', 'A client billing ledger', 'An asset depreciation schedule'], 1, 'the vendor ledger'),
      ],
      blanks: [
        blank('The ledger covers fiscal year ______.', ['2025'], 'the vendor ledger'),
        blank('RestonIT\'s line items are described only as "______."', ['managed IT services'], 'the vendor ledger'),
      ],
      shortAnswer: prompt('Quantify, in one sentence, RestonIT LLC\'s apparent significance based on this ledger alone.', ['Notes RestonIT appears as one ordinary vendor among many', 'Recognizes nothing here marks it as noteworthy by dollar amount or description']),
    },
    {
      code: 'FoA', label: 'Forensic Accountant', roleFilter: 'forensic_accountant',
      task: `Quantify CyberDyne's financial exposure and identify what would firm up the estimate.`,
      mc: [
        mc('What cost categories make up the $400,000 estimated exposure?', ['Ransom payment only', 'Contractual penalties, notification costs, and related expenses', 'Lost inventory', 'Legal fees only'], 1, 'the IC3 complaint'),
        mc('Does the IC3 complaint quantify any recovered funds?', ['Yes, $37,400', 'Yes, $72,550', 'No — this is a data-theft matter, not a funds-transfer fraud', 'Yes, the full amount'], 2, 'the IC3 complaint'),
        mc('What records would help confirm or refine the $400K estimate?', ['None are needed', 'Client contracts, notification-cost estimates, insurance correspondence', 'Only the ransom note', 'Only the vendor ledger'], 1, 'the IC3 complaint'),
      ],
      blanks: [
        blank('CyberDyne\'s estimated exposure is approximately $______.', ['400,000', '400000', '$400,000'], 'the IC3 complaint'),
        blank('This estimate is based on ______ penalties, notification costs, and related expenses.', ['contractual'], 'the IC3 complaint'),
      ],
      shortAnswer: prompt('What financial follow-up would you recommend to firm up this estimate?', ['E.g., requesting client contracts for penalty clauses', 'Actual notification-cost invoices', 'Insurance claim filings']),
    },
    {
      code: 'SOS', label: 'Staff Operations/Tactical Specialist', roleFilter: 'operational_support_sos',
      task: `Review the client roster and stand up the case administratively for CyberDyne.`,
      mc: [
        mc('What does the client roster include beyond a simple client list?', ['Nothing else', 'A disgruntled former client with a billing dispute', 'A list of employees', 'Financial statements'], 1, 'the client roster'),
        mc('What kind of document is the client roster?', ['A technical asset inventory', 'A marketing-style client roster', 'A legal contract', 'A law-enforcement report'], 1, 'the client roster'),
        mc('What internal incident number did CyberDyne open?', ['INC-2026-0618', 'INC-2026-0620', 'INC-2026-0623', 'INC-2020-0620'], 1, 'the client roster'),
      ],
      blanks: [
        blank('The former client flagged with a billing dispute is ______.', ['Hartwell Logistics'], 'the client roster'),
        blank('As SOS, your first administrative action today should be to open a(n) ______.', ['evidence log', 'case file', 'evidence log / case file'], 'today\'s evidence'),
      ],
      shortAnswer: prompt('What is your plan for tracking today\'s legal-process needs (what to request, from whom) for CyberDyne specifically?', ['References an ISP subpoena on 198.51.100.23', 'Notes a vendor-records subpoena on RestonIT', 'Follows up on the Hartwell Logistics lead']),
    },
    {
      code: 'TFO', label: 'Task Force Officer', roleFilter: 'task_force_officer',
      task: `Review the NOC shift ticket and the client-escalation email — your two interview-lead witnesses.`,
      mc: [
        mc('Who wrote the NOC shift ticket noting a bandwidth anomaly?', ['Marcus Iyer', 'D. Voss', 'Priya Shah', 'An automated system only'], 1, 'the NOC shift ticket'),
        mc('How was the anomaly resolved at the time?', ['Escalated to security immediately', 'Closed as expected backup/replication traffic', 'Never resolved', 'Referred to law enforcement'], 1, 'the NOC shift ticket'),
        mc('Who escalated the client\'s report internally at CyberDyne?', ['D. Voss', 'Marcus Iyer', 'Priya Shah', 'Raymond Colson'], 1, 'the client-escalation email'),
      ],
      blanks: [
        blank('The NOC ticket flagging the anomaly is ticket number ______.', ['4471'], 'the NOC shift ticket'),
        blank('Marcus Iyer\'s title at CyberDyne is ______.', ['Facilities & IT Coordinator', 'Facilities and IT Coordinator'], 'the client-escalation email'),
      ],
      shortAnswer: prompt('Identify your two interview leads from today\'s evidence and, for each, state one specific question you\'d ask.', ['D. Voss — ask about the NOC ticket and any knowledge of unusual equipment', 'Marcus Iyer — ask about access-control history and the Hartwell Logistics lead']),
    },
    {
      code: 'CS', label: 'Computer Scientist', roleFilter: 'cyber_analyst',
      task: `Review the official asset inventory and characterize the technical gap around the exfiltrating host.`,
      mc: [
        mc('What does the official asset inventory show about host 10.14.8.77?', ['Listed as decommissioned', 'Absent from the inventory entirely', 'Listed as a guest workstation', 'Listed as the primary domain controller'], 1, 'the asset inventory'),
        mc('Why is this gap significant, technically?', ['It isn\'t — inventories are often incomplete', 'A device used for a 350GB exfiltration has no official record of existing', 'It only affects billing', 'It\'s a routine inventory delay'], 1, 'the asset inventory'),
        mc('What should CyberDyne be asked to produce next, given this gap?', ['Nothing further', 'A supplemental production explaining the unidentified host', 'A new inventory format', 'An HR record'], 1, 'the asset inventory'),
      ],
      blanks: [
        blank('The host responsible for exfiltration, 10.14.8.77, is completely ______ from CyberDyne\'s official asset inventory.', ['absent'], 'the asset inventory'),
        blank('No explanation for this gap appears anywhere in ______ evidence.', ['Day 1', 'Day 1 (Packet 1)', 'Packet 1', "today's"], 'today\'s evidence'),
      ],
      shortAnswer: prompt('What technical hypotheses would you want to test regarding this unlisted host?', ['E.g., a rogue/unauthorized device', 'A forgotten legacy device', 'A device intentionally kept off inventory — all plausible, none provable yet']),
    },
  ],
  squadQuiz: [
    mc('What is the single biggest technical anomaly your squad found today?', ['A missing host that exfiltrated 350GB and appears nowhere in official inventory', 'A missing vendor invoice', 'An unencrypted database', 'A firewall misconfiguration'], 0, 'today\'s evidence'),
    mc('What vendor appears as an unremarkable line item in CyberDyne\'s AP ledger?', ['Northwind Datacenters', 'RestonIT LLC', 'VeilStream LLC', 'CoinBridge'], 1, 'the vendor ledger'),
    mc('Who are your two best interview leads, combined?', ['Priya Shah and Raymond Colson', 'D. Voss and Marcus Iyer', 'Alex Reston and Sam Smith', 'Ted Whitlock and Danielle Osei'], 1, 'today\'s evidence'),
    mc('What is your squad\'s current estimate of financial exposure?', ['$72,550', '$109,950', '$400,000', 'Undetermined'], 2, 'the IC3 complaint'),
    mc('What is the most defensible summary of today\'s findings for CyberDyne?', ['RestonIT is confirmed responsible', 'A significant, externally-discovered data theft via an unlisted host, with no confirmed actor yet', 'The case is closed', 'The Hartwell Logistics lead is confirmed as the culprit'], 1, 'today\'s evidence'),
  ],
};

/* ── Dogwood Hotel (Squad 2) ───────────────────────────────────────────── */
const DOGWOOD = {
  code: 'DOGWOOD',
  // Must match backend/src/constants/victims.js exactly (the release
  // matcher's source of truth) — "Dogwood Hotel" (no "& Resort") silently
  // matched zero assignments to Squad 2 at release time.
  name: 'Dogwood Hotel & Resort',
  roles: [
    {
      code: 'SA', label: 'Special Agent', roleFilter: 'special_agent',
      task: `Review the General Manager's internal incident memo and set the squad's initial characterization.`,
      mc: [
        mc('Who authored the internal incident memo?', ['Marcus Iyer', 'Theodore "Ted" Whitlock', 'Carla Denning', 'Priya Shah'], 1, 'the GM\'s incident memo'),
        mc('What is Whitlock\'s role at Dogwood Hotel?', ['AP Manager', 'General Manager', 'IT Director', 'Owner'], 1, 'the GM\'s incident memo'),
        mc('What teaching point does this memo illustrate?', ['Logs are always wrong', 'Witness accounts vs. logs can differ in minor, honest ways', 'The GM was complicit', 'The memo is fabricated'], 1, 'the GM\'s incident memo'),
      ],
      blanks: [
        blank('The GM\'s memo reconstructs events for ______.', ['ownership'], 'the GM\'s incident memo'),
        blank('The memo is written in a "______-voice narrative" style.', ['human'], 'the GM\'s incident memo'),
      ],
      shortAnswer: prompt('Identify one detail in the GM\'s account that you would want to verify against the hard logs (mailbox audit, wire confirmations) rather than take at face value.', ['Any reasonable detail is acceptable', 'Recognizes a human recollection, even honest, should be checked against contemporaneous records']),
    },
    {
      code: 'IA', label: 'Intelligence Analyst', roleFilter: 'intelligence_analyst',
      task: `Review the email tenant's mailbox audit export for the malicious forwarding rule.`,
      mc: [
        mc('What external IP is tied to the forwarding rule\'s creation and logins?', ['203.0.113.61', '198.51.100.23', '203.0.113.148', '192.0.2.190'], 2, 'the mailbox audit export'),
        mc('Whose mailbox had the forwarding rule created on it?', ['Ted Whitlock\'s', 'The AP manager\'s (Carla Denning)', 'The front desk\'s', 'IT\'s'], 1, 'the mailbox audit export'),
        mc('What does the forwarding rule do?', ['Blocks external email', 'Forwards and marks-read certain invoice-related email, redirecting it externally', 'Deletes all mail', 'Nothing — it\'s disabled'], 1, 'the mailbox audit export'),
      ],
      blanks: [
        blank('The forwarding rule was created on ______.', ['May 9, 2026', 'May 9'], 'the mailbox audit export'),
        blank('The rule forwards mail to the external address ______.', ['dgw.apinvoices@relaymail.example'], 'the mailbox audit export'),
      ],
      shortAnswer: prompt('Explain, technically, how a single mailbox rule can lead to two large fraudulent wire transfers weeks later.', ['The rule intercepts/redirects legitimate vendor-invoice email', 'Enables the attacker to intercept or spoof payment-change instructions the AP manager believes are genuine — a classic BEC mechanism']),
    },
    {
      code: 'DA', label: 'Data Analyst', roleFilter: 'operational_support_da',
      task: `Parse the 2025 staff phishing-awareness test results.`,
      mc: [
        mc('What does this file record?', ['Payroll data', 'Results of an old phishing-awareness test', 'Wire transfer logs', 'Vendor invoices'], 1, 'the phishing-awareness test results'),
        mc('How many times did one employee fail the test?', ['Once', 'Twice', 'Three times', 'Not specified'], 1, 'the phishing-awareness test results'),
        mc('What is this data\'s role in the case, per design intent?', ['It identifies the actual intruder', 'It\'s a decoy — that employee is innocent', 'It proves an insider threat', 'It\'s unrelated padding'], 1, 'the phishing-awareness test results'),
      ],
      blanks: [
        blank('This is a phishing-awareness ______ from 2025.', ['test'], 'the phishing-awareness test results'),
        blank('The employee who failed twice should be treated, per design intent, as ______ despite the pattern.', ['innocent'], 'the phishing-awareness test results'),
      ],
      shortAnswer: prompt('Explain why it would be a mistake to treat this employee\'s repeated test failures as evidence of involvement in the actual fraud.', ['Failing a phishing test reflects general security awareness, not involvement', 'The actual fraud used a technically distinct BEC scheme (a mailbox rule and lookalike domain)']),
    },
    {
      code: 'FoA', label: 'Forensic Accountant', roleFilter: 'forensic_accountant',
      task: `Review the two wire confirmations and the recall request; quantify Dogwood's loss.`,
      mc: [
        mc('What were the two fraudulent wire amounts?', ['$37,400 and $72,550', '$48,200 and $61,750', '$61,750 and $72,550', '$109,950 and $37,400'], 1, 'the wire confirmations'),
        mc('How much was recovered via the recall request?', ['$0', '$37,400', '$48,200', 'The full amount'], 1, 'the recall request'),
        mc('What is Dogwood\'s net loss after recovery?', ['$48,200', '$61,750', '$72,550', '$109,950'], 2, 'the wire confirmations and recall request'),
      ],
      blanks: [
        blank('The recall request was submitted to ______.', ['First National', 'First National (bank)', 'First National bank'], 'the recall request'),
      ],
      dualBlankPrompt: prompt('The two wires were sent on May ___ and June ___, 2026. State both dates.', ['May 26, 2026', 'June 2, 2026'], BLANK_POINTS),
      shortAnswer: prompt('Walk through the financial timeline from wire 1 to recovery, noting each date and amount.', ['May 26 wire $48,200', 'June 2 wire $61,750', 'Recall initiated June 5', '$37,400 recovered/credited June 11', 'Net loss $72,550']),
    },
    {
      code: 'SOS', label: 'Staff Operations/Tactical Specialist', roleFilter: 'operational_support_sos',
      task: `Review the signed managed-services agreement with RestonIT and flag it administratively.`,
      mc: [
        mc('What is significant about this document compared to RestonIT\'s other vendor appearances?', ['It\'s identical to the other victims\' vendor records', 'It\'s the one place RestonIT appears as more than a ledger line — a full signed contract', 'It names Alex Reston as a suspect', 'It\'s unrelated to RestonIT'], 1, 'the managed-services agreement'),
        mc('What kind of document is this?', ['A signed managed-services agreement', 'A wire confirmation', 'A police report', 'A phishing test result'], 0, 'the managed-services agreement'),
        mc('What year was this agreement signed?', ['2023', '2024', '2025', '2026'], 1, 'the managed-services agreement'),
      ],
      blanks: [
        blank('This agreement is with ______, LLC, for managed IT services.', ['RestonIT'], 'the managed-services agreement'),
        blank('As SOS, this document should prompt a request for RestonIT\'s ______ records related to Dogwood\'s account.', ['engagement'], 'the managed-services agreement'),
      ],
      shortAnswer: prompt('Why might a squad asking "who has admin on our email?" lead directly to this document, and why does that matter administratively?', ['A BEC victim investigating email compromise would naturally ask who has admin access', 'The signed MSP contract is the answer, making it the strongest vendor-tie document in the packet — flag for priority follow-up']),
    },
    {
      code: 'TFO', label: 'Task Force Officer', roleFilter: 'task_force_officer',
      task: `Review the real AP thread with the genuine linen supplier — your witness framework.`,
      mc: [
        mc('What does this email thread show?', ['The fraudulent invoice itself', 'The real AP thread and the genuine vendor\'s "we never sent that" reply', 'A local police report', 'A phishing test result'], 1, 'the AP thread'),
        mc('What is this evidence useful for?', ['Financial loss calculation only', 'Witness framework and establishing the wire-recall timeline', 'Technical forensics only', 'It has no investigative use'], 1, 'the AP thread'),
        mc('Who would be a natural interview lead based on this thread?', ['The genuine linen supplier\'s contact and Dogwood\'s AP manager', 'Alex Reston', 'Marcus Iyer', 'D. Voss'], 0, 'the AP thread'),
      ],
      blanks: [
        blank('The genuine vendor\'s reply states they never sent the ______ change request.', ['banking'], 'the AP thread'),
        blank('This thread helps anchor the ______ timeline for the wire recall.', ['wire-recall', 'wire recall'], 'the AP thread'),
      ],
      shortAnswer: prompt('Identify your interview leads from this file and one question for each.', ['The AP manager (Carla Denning) — ask what she recalls about the banking-change instruction', 'The genuine vendor contact — confirm legitimate account details and when they realized the fraud']),
    },
    {
      code: 'CS', label: 'Computer Scientist', roleFilter: 'cyber_analyst',
      task: `Review the spoofed vendor email's full headers and technically characterize the phishing infrastructure.`,
      mc: [
        mc('What kind of email is this?', ['A genuine vendor email', 'A spoofed "vendor" email from a lookalike domain, instructing a banking change', 'An internal IT alert', 'A phishing test result'], 1, 'the spoofed email headers'),
        mc('What does the lookalike domain closely resemble?', ['Dogwood\'s own domain', 'A linen supplier\'s legitimate domain', 'A bank\'s domain', 'RestonIT\'s domain'], 1, 'the spoofed email headers'),
        mc('What technical detail in the headers is most useful?', ['The subject line only', 'The originating IP and registration timing of the lookalike domain', 'The email\'s font', 'The time zone setting'], 1, 'the spoofed email headers'),
      ],
      blanks: [
        blank('The spoofed email\'s originating IP is ______.', ['203.0.113.148'], 'the spoofed email headers'),
        blank('The lookalike domain was registered ______ before the email.', ['three weeks'], 'the spoofed email headers'),
      ],
      shortAnswer: prompt('What two pieces of legal process would you request based on the full headers in this email?', ['A subpoena/legal process to the email provider for account details', 'A WHOIS/registrar subpoena for the lookalike domain\'s registration information']),
    },
  ],
  squadQuiz: [
    mc('What mailbox had the malicious forwarding rule, and when was it created?', ['Ted Whitlock\'s, Feb 28', 'The AP manager\'s, May 9', 'IT\'s, June 5', 'Front desk\'s, May 26'], 1, 'today\'s evidence'),
    mc('What is Dogwood\'s net financial loss after recovery?', ['$48,200', '$61,750', '$72,550', '$109,950'], 2, 'the wire confirmations and recall request'),
    mc('What document ties RestonIT to Dogwood beyond a simple vendor line item?', ['The phishing test results', 'A signed managed-services agreement', 'The wire confirmations', 'The GM\'s memo'], 1, 'the managed-services agreement'),
    mc('Should the twice-failed phishing-test employee be treated as a suspect?', ['Yes, clearly involved', 'No — it\'s a decoy; that employee is innocent', 'Only if the wires clear', 'Only after Day 3'], 1, 'today\'s evidence'),
    mc('What is the most defensible characterization of today\'s findings for Dogwood?', ['RestonIT is confirmed as the intruder', 'A BEC scheme via a spoofed vendor email and a malicious mailbox rule, with RestonIT noted as the IT vendor for cross-reference', 'The case is closed', 'An insider employee is confirmed responsible'], 1, 'today\'s evidence'),
  ],
};

/* ── Pixel Play Arcade (Squad 4) ───────────────────────────────────────── */
const PIXELPLAY = {
  code: 'PIXELPLAY',
  name: 'Pixel Play Arcade',
  roles: [
    {
      code: 'SA', label: 'Special Agent', roleFilter: 'special_agent',
      task: `Review the owner's email to their insurance broker and set the squad's initial characterization of the incident.`,
      mc: [
        mc('What does the owner\'s email to the insurance broker mention considering?', ['Suing RestonIT', 'Paying the ransom', 'Closing the business', 'Contacting the FBI first'], 1, 'the owner\'s email'),
        mc('What does the owner say about who set up their systems?', ['They set it up themselves', '"Our IT guy set everything up years ago"', 'A national franchise IT team', 'No one is mentioned'], 1, 'the owner\'s email'),
        mc('What practical question does the owner ask in the email?', ['"How do we replace our servers?"', '"How do we even buy bitcoin?"', '"Who is our insurance agent?"', '"Should we close permanently?"'], 1, 'the owner\'s email'),
      ],
      blanks: [
        blank('The owner\'s email is addressed to their ______ broker.', ['insurance'], 'the owner\'s email'),
        blank('The owner\'s tone in the email is best described as ______.', ['panicked'], 'the owner\'s email'),
      ],
      shortAnswer: prompt('Based on this email alone, characterize the owner\'s technical sophistication and what that implies for how this investigation should communicate with them.', ['Owner is not technically sophisticated and relies entirely on outside IT help', 'Plan for plain-language communication and limited independent technical insight from the victim']),
    },
    {
      code: 'IA', label: 'Intelligence Analyst', roleFilter: 'intelligence_analyst',
      task: `Review the Windows security-event log for the RDP intrusion.`,
      mc: [
        mc('What external IP authenticated the RDP logon before encryption began?', ['198.51.100.23', '203.0.113.61', '203.0.113.148', '10.14.8.77'], 1, 'the security-event log'),
        mc('What account was used for this RDP logon?', ['Administrator', 'arcade_support', 'guest', 'owner'], 1, 'the security-event log'),
        mc('How does the business owner describe this account?', ['A normal account used daily', 'An account they don\'t recognize', 'Their personal account', 'A shared family account'], 1, 'the security-event log'),
      ],
      blanks: [
        blank('The RDP logon occurred at ______ via account arcade_support.', ['01:58'], 'the security-event log'),
        blank('The logon type recorded is "Logon Type 10," described technically as ______.', ['RemoteInteractive'], 'the security-event log'),
      ],
      shortAnswer: prompt('What does the combination of an unrecognized account and an unfamiliar external IP suggest about how this intrusion likely began?', ['Suggests a previously provisioned/dormant account was used remotely by someone outside the business', 'A pattern worth comparing against other victims later']),
    },
    {
      code: 'DA', label: 'Data Analyst', roleFilter: 'operational_support_da',
      task: `Parse the POS daily summary and quantify the business impact.`,
      mc: [
        mc('What does the POS daily summary show?', ['Revenue spiking after the incident', 'Revenue impact from the ransomware incident', 'No relevant data', 'Employee schedules'], 1, 'the POS daily summary'),
        mc('What is this evidence primarily used for?', ['Technical forensics', 'Grounding a triage/prioritization discussion about severity', 'Legal process', 'Witness interviews'], 1, 'the POS daily summary'),
        mc('Relative to other victims, how would you characterize Pixel Play\'s dollar-loss profile so far?', ['The highest of all victims', 'Comparatively low', 'Impossible to estimate', 'Unrelated to loss'], 1, 'the POS daily summary'),
      ],
      blanks: [
        blank('This file is a ______ summary, covering the month of May.', ['POS', 'point-of-sale', 'POS (point-of-sale) daily', 'POS daily'], 'the POS daily summary'),
        blank('This evidence helps ground a "______, low priority" discussion point in triage.', ['non-critical'], 'the POS daily summary'),
      ],
      shortAnswer: prompt('Using this file, make the case for why Pixel Play might reasonably be ranked lower priority than another victim — while still justifying full investigation.', ['Lower dollar impact doesn\'t mean lower evidentiary value', 'The RDP/account anomaly remains investigatively significant regardless of loss size']),
    },
    {
      code: 'FoA', label: 'Forensic Accountant', roleFilter: 'forensic_accountant',
      task: `Review the ransom note and quantify the financial demand.`,
      mc: [
        mc('What ransomware strain is named in the ransom note?', ['BlackOyster', 'CRYPTLOCK-V', 'VOID PIPER', 'LockBit'], 1, 'the ransom note'),
        mc('What ransom amount is demanded?', ['0.4 BTC', '4.0 BTC', '$4,000', '$40,000'], 0, 'the ransom note'),
        mc('What contact method does the note provide for negotiation?', ['Email', 'Phone', 'A TOX ID', 'Physical mail'], 2, 'the ransom note'),
      ],
      blanks: [
        blank('The ransom note directs payment to placeholder wallet ______.', ['PACT{PLACEHOLDER-w1}'], 'the ransom note'),
        blank('Per the case record, was this ransom ultimately paid? (yes/no)', ['No', 'no'], 'the ransom note'),
      ],
      shortAnswer: prompt('What financial/legal advice would you give the owner regarding the ransom demand, and why?', ['Standard guidance against paying (no decryption guarantee, funds crime, may complicate the legal case)', 'Recognizes payment is the victim\'s decision, not compelled by law enforcement']),
    },
    {
      code: 'SOS', label: 'Staff Operations/Tactical Specialist', roleFilter: 'operational_support_sos',
      task: `Review the QuickBooks vendor export and track RestonIT's invoicing pattern administratively.`,
      mc: [
        mc('What pattern does RestonIT LLC\'s invoicing show in this export?', ['Steadily increasing invoices through 2026', 'Recurring small invoices 2024–2025, then none', 'A single large invoice', 'Invoices paid late every quarter'], 1, 'the QuickBooks vendor export'),
        mc('What administrative step should follow from noticing RestonIT in this export?', ['Nothing, it\'s irrelevant', 'Log it and flag for cross-reference with other victims\' vendor records', 'Immediately name RestonIT as a suspect', 'Discard the export'], 1, 'the QuickBooks vendor export'),
        mc('What kind of file is this?', ['A bank statement', 'A QuickBooks vendor payment export', 'A tax filing', 'A payroll report'], 1, 'the QuickBooks vendor export'),
      ],
      blanks: [
        blank('RestonIT\'s invoicing to Pixel Play stopped sometime after ______.', ['2025'], 'the QuickBooks vendor export'),
        blank('As SOS, you should track this vendor stop-date as a detail that "matters later, unremarkable ______."', ['now'], 'the QuickBooks vendor export'),
      ],
      shortAnswer: prompt('Draft a one-sentence case-file note flagging RestonIT LLC\'s presence in this vendor export for future cross-reference.', ['Should be neutral/factual', 'Notes RestonIT\'s presence and invoice-stop date without asserting significance, consistent with Day 1\'s inference ceiling']),
    },
    {
      code: 'TFO', label: 'Task Force Officer', roleFilter: 'task_force_officer',
      task: `Review the local police report and act as the case's local-liaison lead.`,
      mc: [
        mc('What agency did the owner contact first?', ['FBI', 'Huntsville Police Department', 'Alabama State Police', 'Madison County Sheriff'], 1, 'the local police report'),
        mc('What follow-up does the local police report note?', ['An arrest was made', 'The case was referred to a federal task force', 'No follow-up is noted', 'A suspect was identified'], 2, 'the local police report'),
        mc('What is your responsibility as TFO regarding this local report?', ['Ignore it', 'Deconflict and confirm no parallel investigation conflicts with this one', 'Take over the local case without notice', 'Ask the owner to withdraw it'], 1, 'the local police report'),
      ],
      blanks: [
        blank('The local police report number is ______.', ['2026-05123'], 'the local police report'),
        blank('This report was filed with the ______ Police Department.', ['Huntsville'], 'the local police report'),
      ],
      shortAnswer: prompt('Describe your deconfliction step today and why doing it now matters.', ['Contact Huntsville PD, confirm no active parallel investigation, document the contact', 'Avoids later evidentiary or jurisdictional conflict']),
    },
    {
      code: 'CS', label: 'Computer Scientist', roleFilter: 'cyber_analyst',
      task: `Review the encrypted directory listing and technically characterize the ransomware event.`,
      mc: [
        mc('What file extension does the ransomware apply?', ['.locked', '.cryptlk', '.encrypted', '.ransom'], 1, 'the encrypted directory listing'),
        mc('What do the encryption timestamps show?', ['Spread evenly over a month', 'Clustered within about a half-hour window', 'A single instant', 'Random, unclustered times'], 1, 'the encrypted directory listing'),
        mc('What does this directory listing technically confirm?', ['Data was exfiltrated, not encrypted', 'The scope and timing of the on-device encryption event', 'The attacker\'s identity', 'The ransom was paid'], 1, 'the encrypted directory listing'),
      ],
      blanks: [
        blank('The `dir /s` capture was taken of the ______ post-encryption.', ['office PC'], 'the encrypted directory listing'),
      ],
      dualBlankPrompt: prompt('Encryption timestamps cluster between ___ and ___. State both times.', ['02:13', '02:41'], BLANK_POINTS),
      shortAnswer: prompt('What does the tight encryption time window (about 28 minutes) suggest about the attacker\'s tooling or automation?', ['A tight, consistent window suggests automated/scripted encryption rather than manual, file-by-file action']),
    },
  ],
  squadQuiz: [
    mc('What account, unrecognized by the owner, was used for the RDP intrusion?', ['Administrator', 'arcade_support', 'guest', 'support_admin'], 1, 'today\'s evidence'),
    mc('What vendor\'s invoicing to Pixel Play stopped after 2025?', ['Northwind Datacenters', 'RestonIT LLC', 'VeilStream LLC', 'Ozark Valley Bank'], 1, 'the QuickBooks vendor export'),
    mc('Was the 0.4 BTC ransom paid?', ['Yes, in full', 'Yes, partially', 'No', 'Unknown'], 2, 'the ransom note'),
    mc('What local agency was contacted before any federal involvement?', ['FBI field office', 'Huntsville PD', 'State police', 'County sheriff'], 1, 'the local police report'),
    mc('What is the most defensible characterization of today\'s findings for Pixel Play?', ['RestonIT is confirmed as the intruder', 'An intrusion via an unrecognized account and external IP, with a former IT vendor noted for later cross-reference', 'The case is closed', 'The ransom was fully paid and recovered'], 1, 'today\'s evidence'),
  ],
};

/* ── Redstone Memorial Hospital (Squad 1) ──────────────────────────────── */
const REDSTONE = {
  code: 'REDSTONE',
  name: 'Redstone Memorial Hospital',
  roles: [
    {
      code: 'SA', label: 'Special Agent', roleFilter: 'special_agent',
      task: `Review the HIPAA compliance officer's risk memo and set the squad's initial severity characterization.`,
      mc: [
        mc('What is the compliance officer\'s assessment of PHI exposure?', ['Confirmed breach of over 500 patient records', 'No PHI was accessed prior to containment', 'Assessment is still pending', 'PHI access is confirmed but scope is unknown'], 1, 'the HIPAA risk memo'),
        mc('What kind of organization is Redstone Memorial?', ['A data center', 'A hospital', 'A hotel', 'An arcade'], 1, 'the HIPAA risk memo'),
        mc('What does this memo ground, per design intent?', ['A financial loss estimate', 'The severity/urgency discussion, given the healthcare context', 'A ransom negotiation', 'A wire-fraud timeline'], 1, 'the HIPAA risk memo'),
      ],
      blanks: [
        blank('The compliance officer\'s memo concludes no ______ was accessed prior to containment.', ['PHI'], 'the HIPAA risk memo'),
        blank('This memo grounds a severity/urgency discussion when compared against a lower-sensitivity but higher-dollar victim like ______.', ['CyberDyne', 'Pixel Play', 'CyberDyne (or Pixel Play)'], 'the HIPAA risk memo'),
      ],
      shortAnswer: prompt('Explain why "no confirmed PHI loss" does not automatically mean "low priority" for a hospital victim.', ['Healthcare sensitivity, regulatory exposure, and patient-safety stakes can justify high priority even absent confirmed data loss', 'Severity and confirmed loss are different axes']),
    },
    {
      code: 'IA', label: 'Intelligence Analyst', roleFilter: 'intelligence_analyst',
      task: `Review the domain-controller auth log excerpt for the anomalous logons.`,
      mc: [
        mc('What external IP preceded the anomalous logons via VPN association?', ['203.0.113.148', '198.51.100.23', '203.0.113.61', '192.0.2.190'], 2, 'the domain-controller auth log'),
        mc('What internal IP pool received the VPN association?', ['192.0.2.190', '10.14.8.77', '198.51.100.23', '203.0.113.148'], 0, 'the domain-controller auth log'),
        mc('What time did the anomalous logons occur?', ['01:58', '03:12', '03:40', '22:38'], 1, 'the domain-controller auth log'),
      ],
      blanks: [
        blank('The anomalous logons at 03:12 were preceded by a VPN association from external IP ______.', ['203.0.113.61'], 'the domain-controller auth log'),
        blank('This domain-controller log is described as an excerpt from the ______.', ['auth log'], 'the domain-controller auth log'),
      ],
      shortAnswer: prompt('State the external IP you found and describe, in one sentence, what kind of connection preceded the anomalous authentication.', ['203.0.113.61, via a VPN association into the internal VPN pool', 'Credit any answer correctly identifying the IP and connection type']),
    },
    {
      code: 'DA', label: 'Data Analyst', roleFilter: 'operational_support_da',
      task: `Parse the EDR alert bundle and quantify the anomaly's technical details.`,
      mc: [
        mc('How many servers did the anomalous account authenticate to?', ['One', 'Two', 'Three', 'Five'], 2, 'the EDR alert bundle'),
        mc('What is notable about this authentication, per the alert?', ['It was routine', 'It was the first activity ever recorded for that account', 'It failed repeatedly', 'It came from an internal workstation only'], 1, 'the EDR alert bundle'),
        mc('What service account is involved?', ['rmm_admin', 'svc_backup_rst', 'arcade_support', 'svc_mailmgmt'], 1, 'the EDR alert bundle'),
      ],
      blanks: [
        blank('The anomalous authentication occurred at approximately ______.', ['03:12'], 'the EDR alert bundle'),
        blank('This is described as the ______ activity ever recorded for this account.', ['first'], 'the EDR alert bundle'),
      ],
      shortAnswer: prompt('Quantify, in one sentence, why "first activity ever recorded" for an existing account is itself a significant data point.', ['An account that exists but has never been used before suddenly activating is a strong dormancy/staging indicator', 'Worth flagging even without knowing the account\'s creation date yet']),
    },
    {
      code: 'FoA', label: 'Forensic Accountant', roleFilter: 'forensic_accountant',
      task: `Assess the financial-impact picture for Redstone Memorial, given that no loss document exists in today's evidence.`,
      mc: [
        mc('Which of these financial documents exists in Redstone Memorial\'s Day 1 evidence?', ['Wire confirmations', 'A ransom note', 'None — no financial-loss document is included', 'An insurance claim'], 2, 'today\'s evidence'),
        mc('What does the HIPAA risk memo primarily address?', ['Financial loss', 'PHI exposure assessment', 'Vendor payment history', 'Wire fraud'], 1, 'the HIPAA risk memo'),
        mc('Given no financial-loss file exists yet, what should FoA request?', ['Nothing, there\'s no cost to this incident', 'IT/containment cost records and any related insurance or vendor invoices', 'A ransom note', 'A wire confirmation'], 1, 'today\'s evidence'),
      ],
      blanks: [
        blank('The HIPAA risk memo concludes that no ______ was accessed prior to containment.', ['PHI'], 'the HIPAA risk memo'),
        blank('Because no financial-loss document exists yet, your first FoA action today is to request ______ records.', ['containment-cost', 'IT expense', 'containment-cost / IT expense'], 'today\'s evidence'),
      ],
      shortAnswer: prompt('Explain why "no confirmed PHI loss" does not mean "no cost" to this incident, and what kind of costs you\'d still expect.', ['Containment, IT remediation, and compliance-review costs can exist even with zero confirmed PHI loss', 'Severity and cost aren\'t the same axis']),
    },
    {
      code: 'SOS', label: 'Staff Operations/Tactical Specialist', roleFilter: 'operational_support_sos',
      task: `Review the outdated 2023 network diagram and log it as background context.`,
      mc: [
        mc('How old is the network diagram in this file?', ['Current, updated this year', 'From a 2023 audit', 'From 2026', 'Undated'], 1, 'the network diagram'),
        mc('What does this diagram quietly document, relevant later?', ['Nothing useful', 'That the imaging-wing segment RestonIT touched has domain-admin-adjacent service paths', 'A confirmed intrusion path', 'RestonIT\'s home address'], 1, 'the network diagram'),
        mc('What tier of evidence is this file?', ['Must-Find', 'Benign/background corroboration', 'A decoy', 'A financial record'], 1, 'the network diagram'),
      ],
      blanks: [
        blank('This network diagram is from a ______ audit.', ['2023'], 'the network diagram'),
        blank('As SOS, log this as background/context evidence, useful for later ______.', ['corroboration'], 'the network diagram'),
      ],
      shortAnswer: prompt('Why keep an outdated (2023) diagram in the case file at all, administratively?', ['Even outdated technical documentation can corroborate later findings about network segments and access paths', 'Discarding it as "just old" would lose a potentially relevant reference']),
    },
    {
      code: 'TFO', label: 'Task Force Officer', roleFilter: 'task_force_officer',
      task: `Review the helpdesk email thread describing a pre-intrusion vishing call — your interview lead.`,
      mc: [
        mc('What did a nurse recall receiving before the intrusion?', ['A phishing email', 'A "weird call from IT support" asking to confirm the remote-access portal address', 'A text message', 'An in-person visit from IT'], 1, 'the helpdesk email thread'),
        mc('What did the nurse preserve from that call?', ['A recording', 'The caller ID number', 'An email', 'Nothing'], 1, 'the helpdesk email thread'),
        mc('What is your responsibility as TFO regarding this witness?', ['Nothing further needed', 'Identify her as an interview lead and pursue a phone-records subpoena on the preserved number', 'Dismiss the call as irrelevant', 'Refer her to HR only'], 1, 'the helpdesk email thread'),
      ],
      blanks: [
        blank('The nurse who received the vishing call is ______.', ['Danielle Osei', 'Danielle Osei (RN)'], 'the helpdesk email thread'),
        blank('The call occurred on approximately July ______.', ['8'], 'the helpdesk email thread'),
      ],
      shortAnswer: prompt('What legal process would you pursue based on the preserved caller ID, and what would you hope it returns?', ['A subpoena to the VoIP provider for the DID\'s subscriber and call detail records', 'Hoping to identify the registrant and any related account/email correlations']),
    },
    {
      code: 'CS', label: 'Computer Scientist', roleFilter: 'cyber_analyst',
      task: `Review the IT containment ticket and technically characterize the detection-to-containment timeline.`,
      mc: [
        mc('How long was the window between detection and containment?', ['About 5 minutes', 'About 28 minutes', 'About 2 hours', 'About 24 hours'], 1, 'the IT containment ticket'),
        mc('What does IT staff say about the involved account?', ['They created it recently', '"Nobody on the team knows what this account is. It predates all of us."', 'It\'s a well-known service account', 'It belongs to a specific known employee'], 1, 'the IT containment ticket'),
        mc('What technical action was taken at containment?', ['Nothing', 'The account was disabled and sessions were killed', 'The server was unplugged', 'The network was fully shut down'], 1, 'the IT containment ticket'),
      ],
      blanks: [
        blank('The account involved, svc_backup_rst, is described by staff as predating ______.', ['everyone', 'the current team', 'everyone/the current team'], 'the IT containment ticket'),
      ],
      dualBlankPrompt: prompt('The anomalous authentication was detected at approximately ___, and the account was disabled by ___. State both times.', ['Detected ~03:12', 'Disabled by 03:40'], BLANK_POINTS),
      shortAnswer: prompt('What does staff\'s statement that the account "predates all of us" suggest about how long this access may have existed, and why is it worth flagging even without a creation date in today\'s file?', ['Suggests a long-standing, unexplained account no current staff provisioned or recognizes', 'Worth flagging for a supplemental account-creation-records request']),
    },
  ],
  squadQuiz: [
    mc('What service account authenticated anomalously at 03:12?', ['rmm_admin', 'svc_backup_rst', 'arcade_support', 'svc_mailmgmt'], 1, 'the EDR alert bundle'),
    mc('What external IP preceded the anomalous logons via VPN association?', ['203.0.113.148', '198.51.100.23', '203.0.113.61', '192.0.2.190'], 2, 'the domain-controller auth log'),
    mc('What is the HIPAA risk memo\'s conclusion about PHI exposure?', ['Confirmed breach', 'No PHI accessed prior to containment', 'Pending', 'Unknown'], 1, 'the HIPAA risk memo'),
    mc('What witness detail should be pursued via legal process?', ['The GM\'s memo', 'A preserved caller ID from a vishing call to a nurse', 'A wire confirmation', 'A phishing test result'], 1, 'today\'s evidence'),
    mc('What is the most defensible characterization of today\'s findings for Redstone Memorial?', ['RestonIT is confirmed as the intruder', 'An unexplained, long-standing dormant account was used briefly and contained quickly, with no confirmed PHI loss', 'The case is closed', 'A nurse is a confirmed suspect'], 1, 'today\'s evidence'),
  ],
};

const VICTIMS = [CYBERDYNE, DOGWOOD, PIXELPLAY, REDSTONE];

function buildRoleQuestions(role) {
  const items = [...role.mc, ...role.blanks];
  if (role.dualBlankPrompt) items.push(role.dualBlankPrompt);
  items.push(role.shortAnswer);
  return items;
}

async function insertAssignment(seq, transaction, { title, description, victimName, roleFilters, gradingMode, questions, orderIndex }) {
  const maxScore = questions.reduce((sum, q) => sum + (q.kind === 'prompt' ? q.points : q.scoring.points), 0);
  await seq.query(
    `INSERT INTO assignments
       (id, course_id, title, description, type, grading_mode, max_score, order_index,
        is_published, scenario_name, drop_number, victim_name, questions, role_filters,
        created_at, updated_at)
     VALUES
       (:id, :courseId, :title, :description, 'challenge', :gradingMode, :maxScore, :orderIndex,
        false, :scenario, :drop, :victimName, :questions, ARRAY[:roleFilters]::text[],
        NOW(), NOW())`,
    {
      replacements: {
        id: uuidv4(),
        courseId: COURSE_ID,
        title,
        description,
        gradingMode,
        maxScore,
        orderIndex,
        scenario: SCENARIO,
        drop: DROP,
        victimName,
        questions: JSON.stringify(questions),
        roleFilters,
      },
      transaction,
    },
  );
  console.log(`Seeded unpublished: ${title} (${questions.length} items, ${maxScore} pts)`);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const seq = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false,
  });

  try {
    await seq.authenticate();
    await seq.transaction(async (transaction) => {
      const [existing] = await seq.query(
        `SELECT id FROM assignments WHERE course_id = :courseId AND scenario_name = :scenario AND drop_number = :drop`,
        { replacements: { courseId: COURSE_ID, scenario: SCENARIO, drop: DROP }, transaction },
      );
      if (existing.length > 0) {
        const ids = existing.map((r) => r.id);
        const [[{ count: subCount }]] = await seq.query('SELECT count(*)::int AS count FROM submissions WHERE assignment_id IN (:ids)', { replacements: { ids }, transaction });
        if (subCount > 0) {
          throw new Error(`Refusing to replace Drop 1 v2 assignments — ${subCount} submission(s) already exist. Reseed manually if you're sure.`);
        }
        await seq.query('DELETE FROM assignments WHERE id IN (:ids)', { replacements: { ids }, transaction });
        console.log(`Deleted ${ids.length} prior untouched Drop 1 v2 assignment(s) before reseeding.`);
      }

      const [[{ next }]] = await seq.query(
        "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
        { replacements: { courseId: COURSE_ID }, transaction },
      );
      let orderIndex = Number(next);

      for (const victim of VICTIMS) {
        for (const role of victim.roles) {
          await insertAssignment(seq, transaction, {
            title: `${TITLE_PREFIX} ${victim.name} — ${role.code} (${role.label})`,
            description: `${role.label} individual assessment for ${victim.name}: ${role.task}`,
            victimName: victim.name,
            roleFilters: [role.roleFilter],
            gradingMode: 'individual',
            questions: buildRoleQuestions(role),
            orderIndex: orderIndex++,
          });
        }

        await insertAssignment(seq, transaction, {
          title: `${TITLE_PREFIX} ${victim.name} — Squad Quiz`,
          description: `Squad quiz for ${victim.name} — complete together after every role has finished its individual assessment. Scope: your victim only.`,
          victimName: victim.name,
          roleFilters: [],
          gradingMode: 'squad',
          questions: victim.squadQuiz,
          orderIndex: orderIndex++,
        });
      }
    });

    console.log(`Seeded Drop 1 v2 role + squad-quiz assignments for ${VICTIMS.length} victims, all unpublished.`);
  } finally {
    await seq.close();
  }
}

module.exports = { COURSE_ID, SCENARIO, DROP, VICTIMS };

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
