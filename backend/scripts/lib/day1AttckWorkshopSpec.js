'use strict';
/**
 * Definitions for the Day 1 "ATT&CK Mapping Workshop" — the squad follow-up
 * to "Day 1 Challenge — MITRE ATT&CK Mapping" (seed-attck-mapping-day1.js).
 * That quiz maps one-line summaries of four real DOJ cases; this workshop
 * hands squads raw intrusion artifacts (email gateway, EDR, Sysmon, proxy,
 * Windows event logs) from one end-to-end intrusion and has them map each
 * to a tactic and technique, including the common near-miss confusions
 * (link vs. attachment, scheduled task vs. run key, cleared vs. disabled
 * logging, groups vs. accounts discovery).
 *
 * Ashgrove Freight & Logistics is fictional and authored for this workshop —
 * NOT tied to Operation BROKERED EXIT or any packet-heist/packet-heist-v2
 * drop, same standalone pattern as the Sable Ridge and Harlow Dental
 * workshops. No source packet exists in "PACT Challenges"; every fact below
 * originates here.
 *
 * All-auto-graded by explicit request (no kind:'prompt' items), so
 * AssignmentPage.jsx routes it to QuizFlow, not ChallengeFlow. QuizFlow shows
 * launch_briefing only once (TransmissionInterceptor) and renders each stem
 * as plain text, so every stem restates its own evidence item rather than
 * pointing back to the briefing. feedback.reference is the INTEL BRIEF hint
 * (spending it costs points), so it nudges toward the tactic/distinction
 * without naming the answer.
 *
 * Technique IDs follow ATT&CK Enterprise (v15+; T1098.007 was added in v15).
 * Pure data — no database access — so seed-pact-day1-attck-workshop.js and
 * its tests share it.
 */
const { v4: uuidv4 } = require('uuid');

const TITLE = 'Day 1 Workshop — ATT&CK Mapping (Ashgrove Freight & Logistics)';

const MC_POINTS = 10;
const BLANK_POINTS = 10;
const TF_POINTS = 10;
const MATCH_POINTS = 20;

function mc(stem, options, correctIndex, hint, explanation) {
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
    feedback: { correct: explanation, incorrect: explanation, reference: hint },
  };
}

// Technique-ID entry. Accepts the ID with or without the leading "T" — the
// grader lowercases both sides, so case is already handled.
function techniqueId(stem, id, hint, explanation) {
  return {
    id: uuidv4(),
    stem,
    payload: { kind: 'fill_blank', blanks: [{ accepted: [id, id.slice(1)], caseSensitive: false }] },
    scoring: { points: BLANK_POINTS, mustPass: false },
    feedback: { correct: explanation, incorrect: explanation, reference: hint },
  };
}

function tf(stem, correct, hint, explanation) {
  return {
    id: uuidv4(),
    stem,
    payload: { kind: 'true_false', correct },
    scoring: { points: TF_POINTS, mustPass: false },
    feedback: { correct: explanation, incorrect: explanation, reference: hint },
  };
}

// pairs: [[action, tactic], ...]. DragMatch is strictly one-to-one (each
// tactic slot holds one action), so every tactic in a set must be distinct.
function tacticSort(stem, pairs, hint, explanation) {
  return {
    id: uuidv4(),
    stem,
    payload: {
      kind: 'drag_match',
      shuffle: true,
      sources: pairs.map(([action], i) => ({ id: `src_${i + 1}`, text: action })),
      targets: pairs.map(([, tactic], i) => ({ id: `tgt_${i + 1}`, text: tactic })),
      matches: pairs.map((_, i) => ({ sourceId: `src_${i + 1}`, targetId: `tgt_${i + 1}` })),
    },
    scoring: { points: MATCH_POINTS, mustPass: false },
    feedback: { correct: explanation, incorrect: explanation, reference: hint },
  };
}

const LAUNCH_BRIEFING = `Ashgrove Freight & Logistics is a 300-employee regional freight carrier. On the morning of March 13, 2025, dispatchers arrived to find file shares and roughly 40 servers encrypted with a ".ashlock" extension and a ransom note on every desktop. Ashgrove's incident-response firm has pulled the artifacts below from the email gateway, EDR, Sysmon, the web proxy, and Windows event logs. Your squad's job is to map each one to MITRE ATT&CK.

This case is fictional and unrelated to anything else in the course — it's built fresh for this workshop.

**Two rules from this morning:**
• Tactic is the adversary's WHY (the goal of the step). Technique is the HOW (the behavior that achieved it). Sub-technique is the more specific HOW.
• Map the behavior, not the tool. A legitimate tool used for an adversary purpose still maps.

Squads may keep attack.mitre.org open throughout. Each question restates the artifact it's about, so you won't need to memorize this briefing — but read the whole timeline once as a squad before starting.

**TIMELINE** (all times Eastern; Mar 10–13, 2025)
| # | Time | Artifact |
|---|---|---|
| E0 | — | WHOIS: ashgrove-fuelpartners[.]com and fuelpartners-docs[.]com registered 2025-03-03 through a privacy-protected registrar. |
| E1 | Mar 10, 08:41 | Dispatch coordinator M. Okafor receives "Updated Fuel Surcharge Schedule — Q2" from ashgrove-fuelpartners[.]com. The body links to hxxps://fuelpartners-docs[.]com/schedule. Clicked 08:47. |
| E2 | 08:48 | Browser downloads Q2_Surcharge_Schedule.zip containing Q2_Surcharge_Schedule.pdf.lnk. Okafor double-clicks it. |
| E3 | 08:48 | EDR: the shortcut launches powershell.exe -nop -w hidden -enc <base64>, which downloads a payload from fuelpartners-docs[.]com. |
| E4 | 08:49 | Payload written to C:\\Users\\mokafor\\AppData\\Roaming\\Microsoft\\OneDriveUpdate\\OneDriveSync.exe. |
| E5 | 08:50 | Scheduled task "OneDrive Standalone Update Task-S-1-5-21" created to run OneDriveSync.exe at every logon. |
| E6 | 08:50 onward | Proxy: HTTPS POSTs to cdn-telemetry-sync[.]net every ~60 seconds with jitter. |
| E7 | Mar 11, 22:15 | Sysmon Event 10: rundll32.exe opens lsass.exe and calls comsvcs.dll MiniDump. |
| E8 | 22:31 | net group "Domain Admins" /domain run on WKS-DISP-07. |
| E9 | 22:40 | WKS-DISP-07 sweeps 10.20.0.0/16 for TCP 3389 and 445. |
| E10 | Mar 12, 01:05 | Event 4624, logon type 10, account svc_backup (a Domain Admin) from WKS-DISP-07 to file server FS-01. |
| E11 | 01:20 | New domain account helpdesk.adm created on the DC and added to Domain Admins. |
| E12 | 02:10 | 7z.exe compresses \\\\FS-01\\Finance and \\\\FS-01\\HR into password-protected archives under C:\\PerfLogs\\. |
| E13 | 02:45–05:30 | rclone.exe uploads 61 GB from C:\\PerfLogs\\ to a MEGA cloud-storage account. |
| E14 | Mar 13, 03:00 | Set-MpPreference -DisableRealtimeMonitoring $true runs on every server. |
| E15 | 03:12 | vssadmin delete shadows /all /quiet on every server. |
| E16 | 03:15 | Files on FS-01 and ~40 servers encrypted (.ashlock); ransom note dropped. |
| E17 | 03:40 | Event 1102 — the Security log on FS-01 is cleared. |`;

const DESCRIPTION = 'Squad workshop following the Day 1 ATT&CK Mapping challenge — map raw artifacts from one end-to-end fictional intrusion (Ashgrove Freight & Logistics) to ATT&CK tactics and techniques, including the common near-miss confusions. Fully auto-graded; attack.mitre.org allowed.';

/* ── Part A — Tactic sort (the WHY) ── */
const TACTIC_SORTS = [
  tacticSort(
    'Part A1 — Early intrusion. Match each Ashgrove action to the tactic it served.',
    [
      ['E1: Okafor clicks a link in the fuel-surcharge email', 'Initial Access'],
      ['E3: Hidden, encoded PowerShell downloads a payload', 'Execution'],
      ['E5: Scheduled task relaunches the payload at every logon', 'Persistence'],
      ['E7: rundll32 dumps lsass.exe memory', 'Credential Access'],
      ['E8: net group "Domain Admins" /domain', 'Discovery'],
    ],
    'Ask what the adversary needed at each step: a way in, a way to run code, a way to survive a reboot, secrets, or knowledge of the environment.',
    'E1 Initial Access (getting in), E3 Execution (running code), E5 Persistence (surviving logoff/reboot), E7 Credential Access (stealing secrets), E8 Discovery (learning who the admins are).',
  ),
  tacticSort(
    'Part A2 — Late intrusion. Match each Ashgrove action to the tactic it served.',
    [
      ['E6: HTTPS POSTs to cdn-telemetry-sync[.]net every ~60 seconds', 'Command and Control'],
      ['E10: RDP from WKS-DISP-07 to FS-01 as svc_backup', 'Lateral Movement'],
      ['E12: 7-Zip archives the Finance and HR shares', 'Collection'],
      ['E13: rclone uploads 61 GB to MEGA', 'Exfiltration'],
      ['E16: Files encrypted with .ashlock', 'Impact'],
    ],
    'Collection gathers and packages data; Exfiltration moves it out. Lateral Movement is reaching a new system; Command and Control is talking to the operator.',
    'E6 Command and Control (beaconing), E10 Lateral Movement (pivoting to a new host), E12 Collection (gathering and packaging), E13 Exfiltration (moving it out), E16 Impact (disrupting the victim).',
  ),
];

/* ── Part B — Technique mapping (the HOW), chronological ── */
const TECHNIQUES = [
  mc(
    'E0 — WHOIS shows both lookalike domains (ashgrove-fuelpartners[.]com, fuelpartners-docs[.]com) were registered on 2025-03-03, a week before the phishing email. Which tactic does registering these domains fall under?',
    ['Resource Development', 'Reconnaissance', 'Initial Access', 'Command and Control'],
    0,
    'This happened before any contact with Ashgrove. Was the adversary learning about the target, or building something to use against it?',
    'Resource Development (T1583.001 Acquire Infrastructure: Domains). The adversary was building capability before touching the victim. Reconnaissance is gathering information about the target; Initial Access starts only when the email lands.',
  ),
  mc(
    'E1 — Okafor receives "Updated Fuel Surcharge Schedule — Q2" from ashgrove-fuelpartners[.]com. The body contains a link to hxxps://fuelpartners-docs[.]com/schedule, which he clicks. Which Initial Access technique best fits?',
    ['T1566.002 Phishing: Spearphishing Link', 'T1566.001 Phishing: Spearphishing Attachment', 'T1189 Drive-by Compromise', 'T1078 Valid Accounts'],
    0,
    'Look at what the email itself carried — was the malicious file in the message, or somewhere the message pointed to?',
    'T1566.002 Spearphishing Link. The email carried a link, not the file — the ZIP came from a web download after the click. It is not Drive-by Compromise because the user was targeted and lured, not infected by simply browsing a compromised site.',
  ),
  mc(
    'E2 — The link downloads Q2_Surcharge_Schedule.zip containing Q2_Surcharge_Schedule.pdf.lnk. Nothing runs until Okafor double-clicks the shortcut. Which technique captures that step?',
    ['T1204.002 User Execution: Malicious File', 'T1204.001 User Execution: Malicious Link', 'T1566.001 Phishing: Spearphishing Attachment', 'T1059.001 Command and Scripting Interpreter: PowerShell'],
    0,
    'The click on the link was E1. What did the user have to open at E2 for code to run?',
    'T1204.002 Malicious File. Code ran because the user opened a file (the .lnk disguised as a PDF). The link click was delivery; this is execution that depended on the user.',
  ),
  mc(
    'E3 — EDR shows the shortcut launching powershell.exe -nop -w hidden -enc <base64>, which downloads a payload. Which technique best describes how the code ran?',
    ['T1059.001 Command and Scripting Interpreter: PowerShell', 'T1059.003 Command and Scripting Interpreter: Windows Command Shell', 'T1047 Windows Management Instrumentation', 'T1106 Native API'],
    0,
    'Name the interpreter in the process tree.',
    'T1059.001 PowerShell. The -enc base64 also supports T1027 Obfuscated Files or Information, and the download supports T1105 Ingress Tool Transfer — one artifact can map to several techniques.',
  ),
  mc(
    'E4 — The payload is written to C:\\Users\\mokafor\\AppData\\Roaming\\Microsoft\\OneDriveUpdate\\OneDriveSync.exe. Which technique best fits the choice of name and folder?',
    ['T1036.005 Masquerading: Match Legitimate Name or Location', 'T1027 Obfuscated Files or Information', 'T1564.001 Hide Artifacts: Hidden Files and Directories', 'T1055 Process Injection'],
    0,
    'Nothing is encoded or hidden from a directory listing. Why that name, in that folder?',
    'T1036.005 Match Legitimate Name or Location. The file is in plain sight but named and placed to look like a Microsoft OneDrive component, so an analyst skims past it.',
  ),
  mc(
    'E5 — A scheduled task named "OneDrive Standalone Update Task-S-1-5-21" is created to run OneDriveSync.exe at every logon. Which technique?',
    ['T1053.005 Scheduled Task/Job: Scheduled Task', 'T1547.001 Boot or Logon Autostart Execution: Registry Run Keys / Startup Folder', 'T1543.003 Create or Modify System Process: Windows Service', 'T1037.001 Boot or Logon Initialization Scripts: Logon Script (Windows)'],
    0,
    'All four options can relaunch something at logon. What mechanism does the artifact actually name?',
    'T1053.005 Scheduled Task. A Run key, service, or logon script would all achieve the same persistence — map the mechanism the evidence shows, not the effect. (The task name also mimics a real OneDrive task, supporting T1036.004 Masquerade Task or Service.)',
  ),
  mc(
    'E6 — From 08:50 onward the proxy logs HTTPS POSTs from WKS-DISP-07 to cdn-telemetry-sync[.]net roughly every 60 seconds with jitter. Which technique best fits?',
    ['T1071.001 Application Layer Protocol: Web Protocols', 'T1572 Protocol Tunneling', 'T1090 Proxy', 'T1041 Exfiltration Over C2 Channel'],
    0,
    'This is the implant checking in with its operator. What protocol is it using, and is anything wrapped inside something else?',
    'T1071.001 Web Protocols. C2 rides ordinary HTTPS to blend with normal web traffic. No other protocol is encapsulated (not Protocol Tunneling), no intermediary is shown (not Proxy), and the bulk data theft at E13 went elsewhere (not Exfiltration Over C2).',
  ),
  mc(
    'E7 — Sysmon Event 10 shows rundll32.exe opening lsass.exe and calling comsvcs.dll MiniDump. Which technique?',
    ['T1003.001 OS Credential Dumping: LSASS Memory', 'T1003.002 OS Credential Dumping: Security Account Manager', 'T1558.003 Steal or Forge Kerberos Tickets: Kerberoasting', 'T1555 Credentials from Password Stores'],
    0,
    'Which process holds the credentials of users who are currently logged on?',
    'T1003.001 LSASS Memory. Dumping the LSASS process captures credentials for logged-on users. The rundll32/comsvcs.dll proxy also supports T1218.011 System Binary Proxy Execution: Rundll32.',
  ),
  techniqueId(
    'E8 — On WKS-DISP-07 the attacker runs: net group "Domain Admins" /domain. Enter the ATT&CK sub-technique ID (e.g. T1234.001).',
    'T1069.002',
    'Is the attacker listing accounts, or listing who belongs to a privileged group? Those are two different Discovery techniques.',
    'T1069.002 Permission Groups Discovery: Domain Groups. Querying the membership of a domain group is permission-group discovery. T1087.002 Account Discovery: Domain Account would fit "net user /domain" (listing accounts).',
  ),
  techniqueId(
    'E9 — WKS-DISP-07 sweeps 10.20.0.0/16 for hosts listening on TCP 3389 and 445. Enter the ATT&CK technique ID.',
    'T1046',
    'The attacker is learning which services are listening, not just which hosts exist.',
    'T1046 Network Service Discovery. Scanning for specific listening ports (RDP and SMB) identifies services to move to next — note that E10 uses exactly one of them.',
  ),
  mc(
    'E10 — Event 4624, logon type 10, account svc_backup (a Domain Admin whose credentials were in the E7 dump), from WKS-DISP-07 to file server FS-01. Which technique describes how the attacker MOVED to FS-01?',
    ['T1021.001 Remote Services: Remote Desktop Protocol', 'T1021.002 Remote Services: SMB/Windows Admin Shares', 'T1133 External Remote Services', 'T1570 Lateral Tool Transfer'],
    0,
    'Logon type 10 is RemoteInteractive. Both hosts are inside Ashgrove\'s network.',
    'T1021.001 RDP. Logon type 10 is a Remote Desktop session. It is not External Remote Services because the session ran workstation-to-server inside the network. Use of the stolen svc_backup credentials separately maps to T1078.002 Valid Accounts: Domain Accounts.',
  ),
  mc(
    'E11 — On the domain controller, a new domain account named helpdesk.adm is created. Which technique describes creating it?',
    ['T1136.002 Create Account: Domain Account', 'T1136.001 Create Account: Local Account', 'T1078.002 Valid Accounts: Domain Accounts', 'T1087.002 Account Discovery: Domain Account'],
    0,
    'Was the account already there, and is it local to one machine or stored in Active Directory?',
    'T1136.002 Create Account: Domain Account. It is new (not Valid Accounts, which is using an existing one) and lives in AD (not Local). Adding it to Domain Admins is a separate change that maps to T1098.007 Account Manipulation: Additional Local or Domain Groups.',
  ),
  mc(
    'E12 — 7z.exe compresses \\\\FS-01\\Finance and \\\\FS-01\\HR into password-protected archives. Which technique describes the act of compressing and password-protecting the data?',
    ['T1560.001 Archive Collected Data: Archive via Utility', 'T1486 Data Encrypted for Impact', 'T1027 Obfuscated Files or Information', 'T1213 Data from Information Repositories'],
    0,
    'Was the goal here to deny Ashgrove its data, or to package the data for the attacker to take?',
    'T1560.001 Archive via Utility. The password protects the archive in transit — it is preparation for theft, not Impact. Related mappings: reading the shares is T1039 Data from Network Shared Drive, and holding the archives in C:\\PerfLogs\\ is T1074.001 Local Data Staging.',
  ),
  mc(
    'E13 — rclone.exe uploads 61 GB from C:\\PerfLogs\\ to a MEGA cloud-storage account between 02:45 and 05:30. Which technique?',
    ['T1567.002 Exfiltration Over Web Service: Exfiltration to Cloud Storage', 'T1041 Exfiltration Over C2 Channel', 'T1537 Transfer Data to Cloud Account', 'T1030 Data Transfer Size Limits'],
    0,
    'Did the data travel over the beacon channel from E6, or to a separate, legitimate service?',
    'T1567.002 Exfiltration to Cloud Storage. The data left through a legitimate storage service, not the E6 C2 channel. T1537 is for moving data between cloud accounts inside a cloud environment, not uploading from on-premises. rclone being a legitimate tool doesn\'t change the mapping.',
  ),
  techniqueId(
    'E14 — Set-MpPreference -DisableRealtimeMonitoring $true runs on every server. Enter the ATT&CK sub-technique ID.',
    'T1562.001',
    'Tactic: Defense Evasion. Which security control is being switched off?',
    'T1562.001 Impair Defenses: Disable or Modify Tools. Turning off Defender real-time protection disables a security tool ahead of encryption.',
  ),
  mc(
    'E15 — vssadmin delete shadows /all /quiet runs on every server minutes before encryption. Which technique?',
    ['T1490 Inhibit System Recovery', 'T1485 Data Destruction', 'T1486 Data Encrypted for Impact', 'T1070.004 Indicator Removal: File Deletion'],
    0,
    'What do Volume Shadow Copies let a victim do after ransomware runs?',
    'T1490 Inhibit System Recovery. Shadow copies are a built-in restore path; deleting them removes Ashgrove\'s ability to recover without paying. The intent is to block recovery, not to destroy business data or hide tracks.',
  ),
  techniqueId(
    'E16 — Files on FS-01 and about 40 servers are encrypted with a .ashlock extension and a ransom note is dropped. Enter the ATT&CK technique ID.',
    'T1486',
    'Tactic: Impact.',
    'T1486 Data Encrypted for Impact. Encrypting data to coerce payment for the key is the defining ransomware technique.',
  ),
  mc(
    'E17 — FS-01 records Event 1102: "The audit log was cleared." Which technique?',
    ['T1070.001 Indicator Removal: Clear Windows Event Logs', 'T1562.002 Impair Defenses: Disable Windows Event Logging', 'T1070.004 Indicator Removal: File Deletion', 'T1112 Modify Registry'],
    0,
    'Did logging stop going forward, or were existing records wiped?',
    'T1070.001 Clear Windows Event Logs. Existing records were erased after the fact. T1562.002 is when logging is turned off so future events are never recorded. Event 1102 itself is the artifact that proves the clearing happened.',
  ),
];

/* ── Part C — Mapping judgment ── */
const JUDGMENT = [
  tf(
    'At E10 the attacker logged on to FS-01 over RDP using svc_backup\'s stolen credentials. True or false: this single artifact can be mapped to both T1021.001 Remote Desktop Protocol and T1078.002 Valid Accounts: Domain Accounts.',
    true,
    'Is ATT&CK mapping one artifact → one technique, or one behavior → every technique it shows?',
    'True. One artifact often shows more than one behavior: RDP is how the attacker moved; the stolen domain account is what let them in. Mapping both gives defenders two separate detection opportunities.',
  ),
  tf(
    'rclone is a legitimate, open-source file-sync tool. True or false: because of that, its use at E13 should not be mapped to ATT&CK.',
    false,
    'Recall the second rule from the briefing.',
    'False. Map the behavior, not the tool. Exfiltrating 61 GB to an attacker-controlled MEGA account is T1567.002 regardless of whether the tool is malware or a legitimate utility — attackers prefer legitimate tools precisely because they blend in.',
  ),
  tf(
    'True or false: every ATT&CK technique belongs to exactly one tactic.',
    false,
    'Look up T1053 Scheduled Task/Job or T1078 Valid Accounts on attack.mitre.org and check how many tactics are listed.',
    'False. Many techniques serve several tactics — Scheduled Task/Job is listed under Execution, Persistence, and Privilege Escalation; Valid Accounts under four. You pick the tactic based on what the step accomplished in this intrusion.',
  ),
  tf(
    'E5\'s scheduled task relaunched the payload at every logon. True or false: that is why it maps under Persistence here — if the same technique were used only to run a payload once, it would map under Execution instead.',
    true,
    'Tactic is the WHY. What did this particular task accomplish for the attacker?',
    'True. The technique (T1053.005) stays the same; the tactic follows the purpose. A recurring logon trigger serves Persistence; a one-time task to launch a payload serves Execution.',
  ),
];

function buildQuestions() {
  return [...TACTIC_SORTS, ...TECHNIQUES, ...JUDGMENT];
}

module.exports = {
  TITLE,
  LAUNCH_BRIEFING,
  DESCRIPTION,
  TACTIC_SORTS,
  TECHNIQUES,
  JUDGMENT,
  buildQuestions,
};
