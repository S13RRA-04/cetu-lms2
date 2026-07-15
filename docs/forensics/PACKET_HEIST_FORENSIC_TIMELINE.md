# PACKET HEIST — Consolidated Forensic Timeline

**Classification:** UNCLASSIFIED // FOR TRAINING USE ONLY (FOUO) // PACT EXERCISE — FICTIONAL  
**Scope:** Unique evidentiary artifacts in R2 releases `scenarios/PACKET HEIST/Drop 0` through `Drop 5`  
**Prepared:** 2026-07-15  
**Source timezone:** `America/Chicago`  
**Time basis:** Artifact-local time. December–February events are CST (`UTC−06:00`); March–April events are CDT (`UTC−05:00`). The companion CSV contains normalized UTC timestamps for exact events.  
**Stable identifiers:** The corrected Drop 5 master uses semantic exhibit IDs. The companion CSV assigns deterministic `PH-EVT-*` event IDs and `PH-EXH-*` exhibit IDs derived from canonical event/source content.

## Executive finding

The evidence supports a four-stage access-broker lifecycle across four victims:

1. RestonIT-associated support projects caused privileged, non-expiring, non-MFA accounts to be created between December 2025 and February 2026.
2. Those accounts remained enabled after legitimate work ended and went dormant.
3. Victim-specific access descriptions were advertised by `BRKR_AL` from March 26 through April 4, 2026; foreign reporting says `BRKR_RU` advertised BRKR_AL-supplied packages through April 6 and that different buyers acquired them.
4. Different downstream operators used the four retained accounts from April 7 through April 10, 2026. Their infrastructure, tooling, and objectives differ. The common element is upstream credential custody and RestonIT-associated provisioning—not a common hands-on-keyboard intruder.

The evidence strongly supports RestonIT as the shared access custodian. Drop 5 assesses Alex Morgan Reston as `BRKR_AL`, but the packet itself repeatedly cautions that this identity link is not conclusive. Financial, badge, mailbox-header, KYC, and business records create a substantial nexus; they do not independently prove that Reston exported or sold credentials.

## Reliability model

- **Observed:** Direct system telemetry or a contemporaneous system record.
- **Corroborated:** The same fact appears in independent victim/provider records.
- **Reported:** Interview, partner, or legal-process return that is not raw victim telemetry.
- **Assessed:** Analytical inference. It should not be represented as a directly observed fact.
- Duplicate Drop 0/Drop 1 files and Markdown/PDF renderings were counted once.
- Where Drop 5 conflicts with earlier raw telemetry, the earlier telemetry controls pending correction or reconciliation.

## Master chronology

| Local date/time | Phase | Event | Victim/entity | Evidentiary status | Primary artifact(s) |
|---|---|---|---|---|---|
| 2025-11-01 | Relationship | RestonIT–Dogwood contract becomes effective. | Dogwood / RestonIT | Reported business record | D4 `RestonIT Contracts Excerpts` |
| 2025-12-11 08:42 | Provisioning | CyberDyne integration ticket opens for metadata synchronization requested by RestonIT. | CyberDyne | Corroborated | D3 `Integration Request Ticket`; D4 support-ticket index |
| 2025-12-11 10:18:54 | Provisioning | `custsync_api02` created by `cyd-admin.provision`; no MFA or expiration. | CyberDyne | Observed | D1 `Account Metadata`; D3 `Integration Account Creation Record` |
| 2025-12-11 11:10:09 | Legitimate use | Account validation from `10.61.5.19`. | CyberDyne | Observed | D3 `Prior Account Activity` |
| 2025-12-12 03:10:44 | Legitimate use | Metadata synchronization test succeeds from `10.61.5.19`. | CyberDyne | Observed | D3 `Prior Account Activity` |
| 2025-12-15 | Relationship | RestonIT–Redstone contract becomes effective. | Redstone / RestonIT | Reported business record | D4 `RestonIT Contracts Excerpts` |
| 2025-12-16 03:10:44 | Legitimate use | Final approved CyberDyne validation/sync succeeds. | CyberDyne | Observed | D1 `Account Metadata`; D3 `Prior Account Activity` |
| 2025-12-16 15:04 | Project close | CyberDyne ticket closes. Account remains enabled. | CyberDyne | Corroborated | D3 `Integration Request Ticket`; D5 lifecycle addendum |
| 2025-12-17 | Dormancy | CyberDyne account enters dormant period. | CyberDyne | Assessed from close/use records | D3 account history; D5 master timeline |
| 2025-12-28 | Relationship | RestonIT–Pixel Play contract becomes effective. | Pixel Play / RestonIT | Reported business record | D4 `RestonIT Contracts Excerpts` |
| 2026-01-18 09:31 | Provisioning | Redstone support ticket opens for facilities support-server cleanup/vendor validation. | Redstone | Corroborated | D3 `Support Ticket`; D4 support-ticket index |
| 2026-01-18 14:22:09 | Provisioning | `fac-vendor-svc17` created by `RMH\admin.provision`; no MFA or expiration. | Redstone | Observed | D1 `Account Metadata`; D3 `Account Creation Record` |
| 2026-01-18 15:02:44 | Legitimate use | Account validation from `10.20.5.14`. | Redstone | Observed | D3 `Prior Login History` |
| 2026-01-19 09:18:22 | Legitimate use | Approved support session from `10.20.5.14`. | Redstone | Observed | D3 `Prior Login History` |
| 2026-01-21 16:22:03 | Legitimate use | Project closeout validation from `10.20.5.14`; last approved use in victim artifact. | Redstone | Observed | D3 `Prior Login History` |
| 2026-01-21 16:44 | Project close | Redstone support ticket closes. Account remains enabled. | Redstone | Observed | D3 `Support Ticket` |
| 2026-01-22 | Dormancy | Redstone account is dormant after support work. | Redstone | Assessed | D3 support/login artifacts |
| 2026-01-29 10:04 | Provisioning | Pixel Play ticket opens for POS maintenance and remote-support setup. | Pixel Play | Corroborated | D3 `Support Ticket`; D4 support-ticket index |
| 2026-01-29 13:57:40 | Provisioning | `pos-maint08` created by `PX\admin.provision`; no MFA or expiration. | Pixel Play | Observed | D1 `Account Metadata`; D3 `Account Creation Record` |
| 2026-01-29 14:22:31 | Legitimate use | Account validation from `10.55.5.18`. | Pixel Play | Observed | D3 `Prior Login History` |
| 2026-01-30 19:11:03 | Legitimate use | Approved POS support session from `10.55.5.18`. | Pixel Play | Observed | D3 `Prior Login History` |
| 2026-01-31 17:48:22 | Legitimate use | Vendor validation from `10.55.5.18`; last approved use in victim artifact. | Pixel Play | Observed | D3 `Prior Login History` |
| 2026-01-31 18:12 | Project close | Pixel Play support ticket closes. Account remains enabled. | Pixel Play | Observed | D3 `Support Ticket` |
| 2026-02-01 | Dormancy | Pixel Play account is dormant after support work. | Pixel Play | Assessed | D3 support/login artifacts |
| 2026-02-03 13:10 | Provisioning | Dogwood change record opens for guest Wi-Fi/tenant segmentation work. | Dogwood | Corroborated | D3 `Change Record`; D4 support-ticket index |
| 2026-02-03 16:34:22 | Provisioning | `netops_guest_admin3` created by `dw-admin.provision`; no MFA or expiration. | Dogwood | Observed | D1 `Account Metadata Export`; D3 `Account Creation Record` |
| 2026-02-03 17:04:19 | Legitimate use | Account validation from `10.44.5.20`. | Dogwood | Observed | D3 `Prior Login History` |
| 2026-02-04 18:21:44 | Legitimate use | Approved segmentation support from `10.44.5.20`. | Dogwood | Observed | D3 `Prior Login History` |
| 2026-02-07 19:22:18 | Legitimate use | Follow-up testing from `10.44.5.20`; last approved use. | Dogwood | Observed | D1 account metadata; D3 `Prior Login History` |
| 2026-02-07 20:14 | Project close | Dogwood change record closes. Account remains enabled. | Dogwood | Observed | D3 `Change Record` |
| 2026-02-08 | Dormancy | Dogwood account enters dormant period. | Dogwood | Assessed | D3 change/login artifacts; D5 master timeline |
| Feb–Mar 2026 | Motive/context | RestonIT receives overdraft and late-payment warnings; credit balance rises; one mortgage payment is returned. | Alex Reston / RestonIT | Reported; non-dispositive | D5 `Alex Reston Financial Pressure Summary` |
| 2026-03-24 20:30–22:00 | Credential review | Alex’s calendar shows “Q2 client access cleanup,” providing a facially legitimate reason to review stale access. | Alex Reston / RestonIT | Reported | D5 `Q2 Client Access Cleanup` |
| 2026-03-24 20:42:18 | Physical nexus | Badge 214-A enters Dogwood second-floor tenant area. | Alex Reston | Reported access-control record | D5 `Dogwood Badge Access Return` |
| 2026-03-24 20:44:03 | Physical nexus | Badge 214-A enters RestonIT Suite 214. | Alex Reston | Reported access-control record | D5 `Dogwood Badge Access Return` |
| 2026-03-24 21:33:09 | Credential handling | `alex@restit.example` sends itself a message with `client_access_review_0324.csv`; provider has header metadata, not content. | Alex Reston / RestonIT | Reported metadata | D5 `Support Email Header Return` |
| 2026-03-26 | Brokering | `BRKR_AL` posts Alabama healthcare administrative-support access matching Redstone. | Redstone / BRKR_AL | Reported; match assessed moderate–high | D5 `Dark Web Access Listing Summary`; correlation matrix |
| 2026-03-28 | Brokering | `BRKR_AL` posts hotel wireless-admin access matching Dogwood. | Dogwood / BRKR_AL | Reported; match assessed high | D5 dark-web summary; correlation matrix |
| 2026-03-29 | Financial | Approx. $2,400 cryptocurrency reaches exchange account `EX-48291`, KYC-linked to Alex Reston. | Alex Reston | Reported legal-process return | D5 `Crypto - Payment Lead Return` |
| 2026-04-01 | Brokering | `BRKR_AL` posts regional data-center metadata-portal access matching CyberDyne. | CyberDyne / BRKR_AL | Reported; match assessed high | D5 dark-web summary; correlation matrix |
| 2026-04-02 | Financial | Approx. $3,100 cryptocurrency received by `EX-48291`. | Alex Reston | Reported; source not identified | D5 crypto return |
| 2026-04-02 23:31:55 | Physical nexus | Alex’s badge enters Dogwood second-floor tenant area. | Alex Reston | Reported access-control record | D5 badge return |
| 2026-04-02 23:33:10–2026-04-03 00:19:44 | Physical nexus | Alex’s badge enters and later exits Suite 214 during the listing/sale window. | Alex Reston | Reported; activity inside unknown | D5 badge return |
| 2026-04-04 | Brokering | `BRKR_AL` posts arcade/POS back-office access matching Pixel Play. | Pixel Play / BRKR_AL | Reported; match assessed high | D5 dark-web summary; correlation matrix |
| 2026-04-05 | Financial | Approx. $1,850 cryptocurrency received by `EX-48291`. | Alex Reston | Reported; source not identified | D5 crypto return |
| 2026-04-06 | Brokering | End of foreign partner’s reported March 26–April 6 BRKR_AL-supplied advertising window. Different buyers reportedly acquired the packages. | BRKR_AL / BRKR_RU | Reported foreign intelligence | D5 `Foreign Partner BRKR_RU Intelligence Report` |
| 2026-04-07 | Financial | Approx. $4,600 cryptocurrency received by `EX-48291`; funds in the return were converted to USD and sent to bank account ending 4471. | Alex Reston | Reported; payer/purpose unresolved | D5 crypto return |
| 2026-04-07 22:14:06 | Intrusion | `fac-vendor-svc17` logs in from **198.51.100.77**. | Redstone | Observed | D3 `Prior Login History`; D1 firewall/IOC artifacts |
| 2026-04-07 22:15:41–22:24:37 | Intrusion | Shell and PowerShell launch; administrative shares enumerated; `WinSvcUpdate` scheduled task and `rmh_admin_dirs.txt` created. | Redstone | Observed | D1 incident timeline, PowerShell, scheduled-task, EDR artifacts |
| 2026-04-07 22:30:11 | Intrusion | RMH host connects outbound to **203.0.113.44:443**. | Redstone | Observed | D1 firewall log and incident timeline |
| 2026-04-07 22:33:58 | Intrusion | Redstone account logs off. | Redstone | Observed | D1 incident timeline |
| 2026-04-08 00:47:19 | Intrusion | `netops_guest_admin3` logs in from **198.51.100.91**. | Dogwood | Observed | D3 prior-login artifact; D1 portal telemetry |
| 2026-04-08 00:49:02–00:53:10 | Intrusion | Guest inventory exported; tenant VLAN and network-closet notes viewed; `backup-netops-token` created. | Dogwood | Observed | D1 audit log, token export, incident timeline |
| 2026-04-08 00:58:33 | Intrusion | Dogwood account logs out. | Dogwood | Observed | D1 incident timeline |
| 2026-04-08 08:37:15–09:42:00 | Response | Redstone reviews EDR alert, isolates RMH-FAC-SUP01, and reports to FBI. | Redstone | Observed/reported | D1 incident timeline and EDR summary |
| 2026-04-08 08:42:08–10:18:00 | Response | Dogwood reviews alert, disables token, suspends account, and reports to FBI. | Dogwood | Observed/reported | D1 incident timeline, security alert, token export |
| 2026-04-09 21:13:07 | Intrusion | `custsync_api02` interactively logs in from **192.0.2.44**. | CyberDyne | Observed | D1 portal audit log; D3 prior-account activity |
| 2026-04-09 21:15:40 | Intrusion | Account creates `sync-maint-0426` with customer-metadata-read scope. | CyberDyne | Observed | D1 API-key record and audit log |
| 2026-04-09 21:17:22–21:19:31 | Intrusion | Operator queries Huntsville customers and views Dogwood, Pixel Play, and Nano Corp profiles. | CyberDyne | Observed | D1 audit log and profile-view summary |
| 2026-04-09 21:20:02 | Data access | `hsv_customer_summary.csv` exported: nine customer-metadata records. This is the only confirmed export/data theft in the four-victim set. | CyberDyne | Observed | D1 exported-file record and audit log; D2 matrix |
| 2026-04-09 21:22:15 | Intrusion | CyberDyne account logs out. | CyberDyne | Observed | D1 audit log |
| 2026-04-09 21:24:38–22:36:00 | Response | Alert generated; API key disabled; account suspended; CyberDyne reports to FBI. | CyberDyne | Observed/reported | D1 alert, key record, incident timeline |
| 2026-04-10 23:38:11 | Intrusion | `pos-maint08` logs in from **198.51.100.128** through remote-support tooling. | Pixel Play | Observed | D1 event log, remote-access artifact; D3 prior-login artifact |
| 2026-04-10 23:39:02–23:40:18 | Intrusion | `remoteassist.exe` launches and executes `enum_terms.bat`. | Pixel Play | Observed | D1 process/event and script-execution artifacts |
| 2026-04-10 23:41:19 | Intrusion attempt | Settlement-batch metadata query fails with access denied. No card-data theft is confirmed. | Pixel Play | Observed | D1 query-failure record and payment alert |
| 2026-04-10 23:42:05 | Intrusion | `term_list.txt` created under `C:\ProgramData\pxmaint`. | Pixel Play | Observed | D1 file artifact and event log |
| 2026-04-10 23:44:20 | Intrusion | Pixel Play account logs out; remote session ends. | Pixel Play | Observed | D1 remote-access artifact and event log |
| 2026-04-11 00:05:32–09:11:00 | Response | Processor alert arrives; host isolated; Pixel Play reports to FBI. | Pixel Play | Observed/reported | D1 payment alert and incident timeline |

## Per-victim lifecycle summary

| Victim | Retained account | Provisioned | Last approved use supported by raw artifact | Intrusion | Intrusion source | Observed objective/result |
|---|---|---|---|---|---|---|
| CyberDyne | `custsync_api02` | 2025-12-11 10:18:54 | 2025-12-16 03:10:44 | 2026-04-09 21:13:07 | `192.0.2.44` | Customer discovery; nine-record metadata export confirmed |
| Redstone Memorial | `fac-vendor-svc17` | 2026-01-18 14:22:09 | 2026-01-21 16:22:03 | 2026-04-07 22:14:06 | `198.51.100.77` | Windows/share enumeration, persistence task, outbound TLS |
| Pixel Play | `pos-maint08` | 2026-01-29 13:57:40 | 2026-01-31 17:48:22 | 2026-04-10 23:38:11 | `198.51.100.128` | POS-terminal enumeration; settlement query denied |
| Dogwood Hotel | `netops_guest_admin3` | 2026-02-03 16:34:22 | 2026-02-07 19:22:18 | 2026-04-08 00:47:19 | `198.51.100.91` | Guest inventory export, network-note access, admin-token creation |

## Corrections applied to Drop 5 master timeline version 2.0

| Issue | Earlier/raw artifacts | Original Drop 5 value | Applied correction |
|---|---|---|---|
| Redstone intrusion source | Login source `198.51.100.77`; outbound TLS destination `203.0.113.44` | `203.0.113.44` as source IP | Source set to `198.51.100.77`; outbound destination retained separately. |
| Pixel Play intrusion source | `198.51.100.128` in event log, remote-session artifact, IOC list, and Drop 3 update | `198.51.100.61` | Source set to `198.51.100.128`. |
| Redstone last approved use/project close | Last approved login `2026-01-21 16:22:03`; ticket closed `16:44` | Last use `17:48:33`; project closed `2026-01-22` | Aligned to Drop 3 raw login and ticket records. Dormancy begins January 22. |
| Pixel Play last approved use/project close | Last approved login `2026-01-31 17:48:22`; ticket closed `18:12` | Last use `2026-02-01 11:05:12`; project closed `2026-02-02` | Aligned to Drop 3 raw login and ticket records. Dormancy begins February 1. |
| Scenario naming | Several D4/D5 documents render the support address/domain as `restit.example` although the company is RestonIT | Consistent within those documents | Verify whether this is an intentional fictional domain or a typo before publishing externally. |

## Attribution and inference boundaries

### Supported by the packet

- All four retained accounts originated during RestonIT-associated work and remained enabled without MFA or expiration.
- The advertised environment descriptions closely match knowledge available through those accounts.
- Listings preceded the intrusions and were reportedly sold to different buyers.
- Different downstream infrastructure and behaviors support multiple buyers rather than one common operator.
- Alex Reston controlled RestonIT, had physical access to Suite 214 during relevant late-evening periods, handled a similarly named access-review attachment, and controlled the KYC-linked exchange account receiving funds during the listing window.

### Not conclusively established

- That Alex Reston is `BRKR_AL`.
- That Alex personally exported, advertised, sold, or supplied any credential.
- That cryptocurrency transfers were access-sale proceeds or came from `BRKR_RU`.
- That any one downstream buyer was responsible for another victim’s intrusion.
- That attempted access equals confirmed theft. Only CyberDyne has a confirmed metadata export; Pixel Play’s settlement query failed.

## Source map by release

- **Drop 0:** Duplicate/pre-release copy of the initial four-victim packet. No unique facts were used where an identical Drop 1 source existed.
- **Drop 1:** Primary victim telemetry, account metadata, alerts, incident timelines, interviews, IOCs, file/process records, and response actions.
- **Drop 2:** Cross-victim matrices and analytical products. Used for correlation and scoping, not as independent telemetry.
- **Drop 3:** Account-creation, support-ticket, and prior-use records plus downstream-investigation updates. These establish legitimate-use baselines and source-IP distinctions.
- **Drop 4:** RestonIT business, relationship, contract, employee, failed-login, phishing, and support-ticket correlation records.
- **Drop 5:** Legal-process, foreign-partner, dark-web, badge, financial, KYC, nexus, and master-timeline products. These strengthen the brokering and attribution theory but contain the conflicts documented above.

## Correction status and remaining normalization work

1. **Completed:** Redstone and Pixel Play source-IP fields were corrected in Drop 5 master version 2.0.
2. **Completed:** Redstone and Pixel Play approved-use/project-close values were aligned to the underlying Drop 3 system and ticket records.
3. **Completed for the consolidated products:** `America/Chicago`, CST/CDT offsets, and normalized UTC timestamps were added to the corrected master and CSV.
4. **Completed for the consolidated products:** Stable exhibit and event IDs were added. Extending IDs and hashes to every original artifact remains future work; PDF/Markdown twins should share one logical exhibit ID.
5. **Remaining:** Separate `event_time`, `detection_time`, `report_time`, and `document_created_time` in future source-system exports.
