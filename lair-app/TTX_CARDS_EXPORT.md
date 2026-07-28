# LAIR TTX Facilitator — Card Export

Source of truth: `lair-app/src/data/ttxCards.js`. Card **text** here is final;
if you add illustrations as images, you'll wire them in as an `icon`/`image`
field per card in that file (component update on my end when you're ready).

## Scenarios (12) — drawn once per session

| # | Title | Text |
|---|---|---|
| s01 | Ransomware Encryption Event | File shares across three departments are inaccessible. A ransom note references a 48-hour countdown before the price doubles. |
| s02 | Unauthorized Wire Transfer | Finance reports a $340,000 wire sent to an unfamiliar account after an email that looked like it came from the CFO. |
| s03 | Suspicious Off-Hours Login | A service account authenticates from an unrecognized IP address at 3:14 AM, then triggers a password reset on two other accounts. |
| s04 | Lost Company Laptop | A sales director's laptop, containing unencrypted client contracts, was left in a taxi after a conference. |
| s05 | Public Web Server Defacement | The company's marketing site now displays a message from an unknown group, and the changes bypass the usual deploy pipeline. |
| s06 | Insider Data Exfiltration | A departing employee's account shows a large upload to a personal cloud storage account the night before their last day. |
| s07 | Third-Party Vendor Breach Notification | A vendor with API access to your systems reports they were compromised last month and are only now disclosing it. |
| s08 | Active Phishing Campaign | Multiple employees report a convincing email impersonating IT, asking them to "verify" credentials on a lookalike login page. |
| s09 | Unexplained Database Query Spike | A production database shows a tenfold increase in queries against the customer table overnight, from an application service account. |
| s10 | Rogue Access Point Detected | Facilities finds an unfamiliar wireless access point plugged into a conference room network jack, broadcasting a spoofed corporate SSID. |
| s11 | Terminated Employee, Active Access | Two weeks after termination, badge logs show building access under a former employee's credentials — twice, overnight. |
| s12 | Public Cloud Storage Misconfiguration | A security researcher emails to report a publicly readable cloud storage bucket containing internal financial documents. |

## Procedures (20) — rolled with a d20, roll number = table index

| Roll | Procedure |
|---|---|
| 1 | Network Traffic Analysis |
| 2 | Endpoint Detection & Response (EDR) Sweep |
| 3 | Memory Forensics / Live RAM Capture |
| 4 | Centralized Log Review (SIEM) |
| 5 | Threat Intelligence Lookup |
| 6 | Malware Static & Dynamic Analysis |
| 7 | Disk Imaging & Forensic Acquisition |
| 8 | Firewall Rule Change / Network Segmentation |
| 9 | Account Lockdown & Credential Reset |
| 10 | Multi-Factor Authentication Enforcement |
| 11 | Backup Restoration & Integrity Validation |
| 12 | Legal & Regulatory Notification Review |
| 13 | Law Enforcement Coordination |
| 14 | Public Relations / Customer Communication Plan |
| 15 | Vendor & Third-Party Coordination |
| 16 | Chain-of-Custody Documentation |
| 17 | Vulnerability Scan of Affected Systems |
| 18 | Emergency Patch Deployment |
| 19 | Physical Security Review |
| 20 | Tabletop Debrief & Lessons Learned |

## Injects (12) — drawn on demand during the discussion

| # | Text |
|---|---|
| i01 | The CEO wants a status update in the next 10 minutes. What do you tell them? |
| i02 | A key system administrator is on a flight and unreachable for the next 6 hours. |
| i03 | A local news reporter has called asking to confirm rumors of a breach. |
| i04 | The backup you planned to restore from fails integrity validation. |
| i05 | Legal informs you a regulatory notification deadline is in 24 hours. |
| i06 | A second, unrelated alert fires on a different system. Is it connected? |
| i07 | An employee posts about the incident on social media before it's public. |
| i08 | The attacker posts a public countdown timer, threatening to leak data. |
| i09 | Your primary incident response tool loses connectivity mid-investigation. |
| i10 | A board member demands to be added to every communication thread. |
| i11 | The vendor whose product is implicated denies any vulnerability exists. |
| i12 | Cyber insurance requires you to use their approved forensics firm. Do you comply? |
