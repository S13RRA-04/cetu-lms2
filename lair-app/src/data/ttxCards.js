/**
 * LAIR Tabletop Exercise (TTX) Facilitator — original card content.
 *
 * An instructor-facilitated live-session tool: draw a scenario, roll a d20
 * for a response procedure, and introduce inject cards mid-discussion.
 * Same generic tabletop-exercise structure used by many IR training
 * formats, but every scenario/procedure/inject below is original text
 * written for this course — not sourced from any commercial card game.
 *
 * `illustration` paths point at /public/ttx-cards/*.svg (served as static
 * assets, not bundled) — hand-drawn by the instructor for this deck.
 */

const ART = '/ttx-cards';

export const SCENARIOS = [
  { id: 's01', title: 'Ransomware Encryption Event',
    text: 'File shares across three departments are inaccessible. A ransom note references a 48-hour countdown before the price doubles.',
    illustration: `${ART}/scenario_s01_ransomware_encryption.svg` },
  { id: 's02', title: 'Unauthorized Wire Transfer',
    text: 'Finance reports a $340,000 wire sent to an unfamiliar account after an email that looked like it came from the CFO.',
    illustration: `${ART}/scenario_s02_unauthorized_wire_transfer.svg` },
  { id: 's03', title: 'Suspicious Off-Hours Login',
    text: 'A service account authenticates from an unrecognized IP address at 3:14 AM, then triggers a password reset on two other accounts.',
    illustration: `${ART}/scenario_s03_suspicious_offhours_login.svg` },
  { id: 's04', title: 'Lost Company Laptop',
    text: 'A sales director\'s laptop, containing unencrypted client contracts, was left in a taxi after a conference.',
    illustration: `${ART}/scenario_s04_lost_company_laptop.svg` },
  { id: 's05', title: 'Public Web Server Defacement',
    text: 'The company\'s marketing site now displays a message from an unknown group, and the changes bypass the usual deploy pipeline.',
    illustration: `${ART}/scenario_s05_public_web_server_defacement.svg` },
  { id: 's06', title: 'Insider Data Exfiltration',
    text: 'A departing employee\'s account shows a large upload to a personal cloud storage account the night before their last day.',
    illustration: `${ART}/scenario_s06_insider_data_exfiltration.svg` },
  { id: 's07', title: 'Third-Party Vendor Breach Notification',
    text: 'A vendor with API access to your systems reports they were compromised last month and are only now disclosing it.',
    illustration: `${ART}/scenario_s07_vendor_breach_notification.svg` },
  { id: 's08', title: 'Active Phishing Campaign',
    text: 'Multiple employees report a convincing email impersonating IT, asking them to "verify" credentials on a lookalike login page.',
    illustration: `${ART}/scenario_s08_active_phishing_campaign.svg` },
  { id: 's09', title: 'Unexplained Database Query Spike',
    text: 'A production database shows a tenfold increase in queries against the customer table overnight, from an application service account.',
    illustration: `${ART}/scenario_s09_database_query_spike.svg` },
  { id: 's10', title: 'Rogue Access Point Detected',
    text: 'Facilities finds an unfamiliar wireless access point plugged into a conference room network jack, broadcasting a spoofed corporate SSID.',
    illustration: `${ART}/scenario_s10_rogue_access_point.svg` },
  { id: 's11', title: 'Terminated Employee, Active Access',
    text: 'Two weeks after termination, badge logs show building access under a former employee\'s credentials — twice, overnight.',
    illustration: `${ART}/scenario_s11_terminated_employee_active_access.svg` },
  { id: 's12', title: 'Public Cloud Storage Misconfiguration',
    text: 'A security researcher emails to report a publicly readable cloud storage bucket containing internal financial documents.',
    illustration: `${ART}/scenario_s12_cloud_storage_misconfiguration.svg` },
];

/** Rolled with a d20 — index 0 corresponds to a roll of 1. */
export const PROCEDURES = [
  { title: 'Network Traffic Analysis', illustration: `${ART}/procedure_01_network_traffic_analysis.svg` },
  { title: 'Endpoint Detection & Response (EDR) Sweep', illustration: `${ART}/procedure_02_edr_sweep.svg` },
  { title: 'Memory Forensics / Live RAM Capture', illustration: `${ART}/procedure_03_memory_forensics_ram_capture.svg` },
  { title: 'Centralized Log Review (SIEM)', illustration: `${ART}/procedure_04_centralized_log_review_siem.svg` },
  { title: 'Threat Intelligence Lookup', illustration: `${ART}/procedure_05_threat_intelligence_lookup.svg` },
  { title: 'Malware Static & Dynamic Analysis', illustration: `${ART}/procedure_06_malware_static_dynamic_analysis.svg` },
  { title: 'Disk Imaging & Forensic Acquisition', illustration: `${ART}/procedure_07_disk_imaging_forensic_acquisition.svg` },
  { title: 'Firewall Rule Change / Network Segmentation', illustration: `${ART}/procedure_08_firewall_rule_change_segmentation.svg` },
  { title: 'Account Lockdown & Credential Reset', illustration: `${ART}/procedure_09_account_lockdown_credential_reset.svg` },
  { title: 'Multi-Factor Authentication Enforcement', illustration: `${ART}/procedure_10_mfa_enforcement.svg` },
  { title: 'Backup Restoration & Integrity Validation', illustration: `${ART}/procedure_11_backup_restoration_integrity_validation.svg` },
  { title: 'Legal & Regulatory Notification Review', illustration: `${ART}/procedure_12_legal_regulatory_notification_review.svg` },
  { title: 'Law Enforcement Coordination', illustration: `${ART}/procedure_13_law_enforcement_coordination.svg` },
  { title: 'Public Relations / Customer Communication Plan', illustration: `${ART}/procedure_14_public_relations_customer_communication.svg` },
  { title: 'Vendor & Third-Party Coordination', illustration: `${ART}/procedure_15_vendor_third_party_coordination.svg` },
  { title: 'Chain-of-Custody Documentation', illustration: `${ART}/procedure_16_chain_of_custody_documentation.svg` },
  { title: 'Vulnerability Scan of Affected Systems', illustration: `${ART}/procedure_17_vulnerability_scan_affected_systems.svg` },
  { title: 'Emergency Patch Deployment', illustration: `${ART}/procedure_18_emergency_patch_deployment.svg` },
  { title: 'Physical Security Review', illustration: `${ART}/procedure_19_physical_security_review.svg` },
  { title: 'Tabletop Debrief & Lessons Learned', illustration: `${ART}/procedure_20_tabletop_debrief_lessons_learned.svg` },
];

export const INJECTS = [
  { id: 'i01', text: 'The CEO wants a status update in the next 10 minutes. What do you tell them?',
    illustration: `${ART}/inject_i01_ceo_status_update.svg` },
  { id: 'i02', text: 'A key system administrator is on a flight and unreachable for the next 6 hours.',
    illustration: `${ART}/inject_i02_sysadmin_unreachable.svg` },
  { id: 'i03', text: 'A local news reporter has called asking to confirm rumors of a breach.',
    illustration: `${ART}/inject_i03_reporter_calling.svg` },
  { id: 'i04', text: 'The backup you planned to restore from fails integrity validation.',
    illustration: `${ART}/inject_i04_backup_restore_fails.svg` },
  { id: 'i05', text: 'Legal informs you a regulatory notification deadline is in 24 hours.',
    illustration: `${ART}/inject_i05_legal_24hr_deadline.svg` },
  { id: 'i06', text: 'A second, unrelated alert fires on a different system. Is it connected?',
    illustration: `${ART}/inject_i06_second_alert_fires.svg` },
  { id: 'i07', text: 'An employee posts about the incident on social media before it\'s public.',
    illustration: `${ART}/inject_i07_employee_social_media_post.svg` },
  { id: 'i08', text: 'The attacker posts a public countdown timer, threatening to leak data.',
    illustration: `${ART}/inject_i08_leak_countdown.svg` },
  { id: 'i09', text: 'Your primary incident response tool loses connectivity mid-investigation.',
    illustration: `${ART}/inject_i09_ir_tool_loses_connectivity.svg` },
  { id: 'i10', text: 'A board member demands to be added to every communication thread.',
    illustration: `${ART}/inject_i10_board_member_demand.svg` },
  { id: 'i11', text: 'The vendor whose product is implicated denies any vulnerability exists.',
    illustration: `${ART}/inject_i11_vendor_denies_vulnerability.svg` },
  { id: 'i12', text: 'Cyber insurance requires you to use their approved forensics firm. Do you comply?',
    illustration: `${ART}/inject_i12_insurance_requires_approved_firm.svg` },
];
