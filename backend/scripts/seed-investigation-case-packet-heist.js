'use strict';
/**
 * Seeds the investigation-simulation engine's case content from PACKET
 * HEIST's real, already-taught scenario — NOT invented content. Every
 * fact in authoritative_facts below is drawn directly from
 * docs/forensics/PACKET_HEIST_FORENSIC_TIMELINE.md (the "Consolidated
 * Forensic Timeline," the project's own curated ground truth for this
 * scenario). Where that doc explicitly says something is NOT conclusively
 * established (whether Alex Reston is BRKR_AL, whether he personally
 * sold/exported credentials, whether the crypto was sale proceeds), this
 * seed preserves that uncertainty rather than resolving it — see the
 * ATTRIBUTION_BOUNDARY evidence item and the entity relationship marked
 * `assessed_as_possibly` with `confidence: 'not_conclusive'`.
 *
 * This is additive, not a replacement: PACKET HEIST's existing 7 drops,
 * quizzes, and grades (already migrated from Neon) are untouched. This
 * creates one new, unpublished `type: 'investigation'` assignment that
 * squads can work through independently, using the same underlying facts.
 *
 * Squads are each assigned one victim via Squad.victim_code (REDSTONE /
 * DOGWOOD / CYBERDYNE / PIXELPLAY — see backend/src/constants/victims.js).
 * Victim-specific technical evidence in this case is gated with
 * `requires_squad_victim_code` so a squad only ever unlocks their own
 * victim's deep telemetry — mirroring how the real drops are already
 * victim-scoped. The RestonIT/broker/financial/badge layer that connects
 * all four victims has no victim restriction: any squad that investigates
 * far enough reaches it, which is the entire point of the scenario
 * (design brief §3 — students must discover the connection themselves).
 *
 * Run: node backend/scripts/seed-investigation-case-packet-heist.js
 */
require('dotenv').config();
const {
  Assignment, InvestigationCase, CaseEntity, CaseEntityRelationship,
  CaseEvidence, CasePersona,
} = require('../src/models');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const TITLE = 'PACKET HEIST — Investigation Desk';

const VICTIMS = {
  REDSTONE:  { org: 'Redstone Memorial Hospital', account: 'fac-vendor-svc17', creator: 'RMH\\admin.provision' },
  DOGWOOD:   { org: 'Dogwood Hotel & Resort',      account: 'netops_guest_admin3', creator: 'dw-admin.provision' },
  CYBERDYNE: { org: 'CyberDyne Data Center',       account: 'custsync_api02', creator: 'cyd-admin.provision' },
  PIXELPLAY: { org: 'Pixel Play Arcade',           account: 'pos-maint08', creator: 'PX\\admin.provision' },
};

async function main() {
  const existing = await Assignment.findOne({ where: { course_id: COURSE_ID, title: TITLE } });
  if (existing) {
    await existing.destroy(); // cascades through investigation_cases -> every case_* table
    console.log('Removed previous seed of this case');
  }

  const assignment = await Assignment.create({
    course_id: COURSE_ID,
    title: TITLE,
    description:
      'Four victims — Redstone Memorial Hospital, Dogwood Hotel & Resort, CyberDyne Data Center, and Pixel Play ' +
      'Arcade — each reported unauthorized access to a dormant, privileged account. Your squad has lead on one ' +
      'victim. Investigate it, and find out whether — and how — it connects to the others.',
    type: 'investigation',
    grading_mode: 'squad',
    is_published: false,
    role_filters: [],
  });

  const investigationCase = await InvestigationCase.create({
    assignment_id: assignment.id,
    slug: 'packet-heist',
    title: TITLE,
    synopsis:
      'Between December 2025 and February 2026, four organizations each had a privileged, non-expiring, non-MFA ' +
      'account created during legitimate support work performed by the same IT vendor, RestonIT. Each account went ' +
      'dormant after its project closed. Between April 7 and April 10, 2026, all four accounts were used in ' +
      'intrusions — by operators with different infrastructure, tooling, and objectives. The evidence points to a ' +
      'shared upstream access-broker operation, not a single intruder. Vendor principal Alex Morgan Reston is a ' +
      'person of interest, but the evidence available does not conclusively establish that he is responsible.',
    learning_objectives: [
      'Build a victim-specific technical timeline from account, login, and intrusion telemetry',
      'Recognize a shared third-party vendor as a potential common thread across separately-reported incidents',
      'Build an escalating legal-process case (subpoena -> court order) tied to specific, articulable facts',
      'Distinguish evidence that supports an attribution theory from evidence that would be needed to conclusively prove it',
    ],
    status: 'published',
  });

  // ── Entities ──────────────────────────────────────────────────────────
  const orgRestonIT = await CaseEntity.create({ case_id: investigationCase.id, type: 'organization', name: 'RestonIT', attributes: { role: 'shared_it_vendor' } });
  const personReston = await CaseEntity.create({ case_id: investigationCase.id, type: 'person', name: 'Alex Morgan Reston', attributes: { role: 'subject', controls: 'RestonIT', badge_id: '214-A' } });
  const aliasBrkrAl = await CaseEntity.create({ case_id: investigationCase.id, type: 'alias', name: 'BRKR_AL', attributes: { role: 'dark_web_broker_handle' } });
  const aliasBrkrRu = await CaseEntity.create({ case_id: investigationCase.id, type: 'alias', name: 'BRKR_RU', attributes: { role: 'foreign_reseller_broker_handle' } });
  const walletEx48291 = await CaseEntity.create({ case_id: investigationCase.id, type: 'cryptocurrency_wallet', name: 'Exchange account EX-48291', attributes: { kyc_linked_to: 'Alex Morgan Reston' } });
  const account4471 = await CaseEntity.create({ case_id: investigationCase.id, type: 'bank_account', name: 'Bank account ****4471', attributes: { role: 'usd_conversion_destination' } });
  const locSuite214 = await CaseEntity.create({ case_id: investigationCase.id, type: 'physical_location', name: 'RestonIT Suite 214', attributes: {} });

  const orgs = {}, accounts = {}, ips = {};
  const IPS = { REDSTONE: '198.51.100.77', DOGWOOD: '198.51.100.91', CYBERDYNE: '192.0.2.44', PIXELPLAY: '198.51.100.128' };
  for (const [code, v] of Object.entries(VICTIMS)) {
    orgs[code] = await CaseEntity.create({ case_id: investigationCase.id, type: 'organization', name: v.org, attributes: { role: 'victim', victim_code: code } });
    accounts[code] = await CaseEntity.create({ case_id: investigationCase.id, type: 'account', name: v.account, attributes: { created_by: v.creator, mfa: false, expiration: 'none' } });
    ips[code] = await CaseEntity.create({ case_id: investigationCase.id, type: 'ip_address', name: IPS[code], attributes: { role: 'intrusion_source' } });
  }
  const ipRedstoneC2 = await CaseEntity.create({ case_id: investigationCase.id, type: 'ip_address', name: '203.0.113.44', attributes: { role: 'outbound_c2_destination', victim_code: 'REDSTONE' } });

  const rel = (from, to, relationship_type, attributes = {}) =>
    CaseEntityRelationship.create({ case_id: investigationCase.id, from_entity_id: from.id, to_entity_id: to.id, relationship_type, attributes });

  await Promise.all([
    rel(orgRestonIT, orgs.DOGWOOD, 'contracted_with', { effective: '2025-11-01' }),
    rel(orgRestonIT, orgs.CYBERDYNE, 'engaged_by', { note: 'integration ticket opened 2025-12-11' }),
    rel(orgRestonIT, orgs.REDSTONE, 'contracted_with', { effective: '2025-12-15' }),
    rel(orgRestonIT, orgs.PIXELPLAY, 'contracted_with', { effective: '2025-12-28' }),
    rel(personReston, orgRestonIT, 'controls'),
    rel(accounts.REDSTONE, orgRestonIT, 'provisioned_by'),
    rel(accounts.DOGWOOD, orgRestonIT, 'provisioned_by'),
    rel(accounts.CYBERDYNE, orgRestonIT, 'provisioned_by'),
    rel(accounts.PIXELPLAY, orgRestonIT, 'provisioned_by'),
    rel(accounts.REDSTONE, ips.REDSTONE, 'logged_in_from', { timestamp: '2026-04-07T22:14:06' }),
    rel(accounts.DOGWOOD, ips.DOGWOOD, 'logged_in_from', { timestamp: '2026-04-08T00:47:19' }),
    rel(accounts.CYBERDYNE, ips.CYBERDYNE, 'logged_in_from', { timestamp: '2026-04-09T21:13:07' }),
    rel(accounts.PIXELPLAY, ips.PIXELPLAY, 'logged_in_from', { timestamp: '2026-04-10T23:38:11' }),
    rel(personReston, locSuite214, 'physical_access_to'),
    rel(personReston, walletEx48291, 'kyc_linked_to'),
    rel(walletEx48291, account4471, 'converted_and_transferred_to'),
    rel(personReston, aliasBrkrAl, 'assessed_as_possibly', { confidence: 'not_conclusive', note: 'Drop 5 assesses this link; the packet repeatedly cautions it is not conclusive.' }),
    rel(aliasBrkrAl, orgs.REDSTONE, 'advertised_access_to', { date: '2026-03-26', match_confidence: 'moderate_to_high' }),
    rel(aliasBrkrAl, orgs.DOGWOOD, 'advertised_access_to', { date: '2026-03-28', match_confidence: 'high' }),
    rel(aliasBrkrAl, orgs.CYBERDYNE, 'advertised_access_to', { date: '2026-04-01', match_confidence: 'high' }),
    rel(aliasBrkrAl, orgs.PIXELPLAY, 'advertised_access_to', { date: '2026-04-04', match_confidence: 'high' }),
    rel(aliasBrkrRu, aliasBrkrAl, 'resold_packages_from', { window: '2026-03-26 to 2026-04-06' }),
  ]);

  // ── Personas ──────────────────────────────────────────────────────────
  const redstoneContactP = await CasePersona.create({
    case_id: investigationCase.id, role_type: 'victim', name: 'Redstone Memorial Hospital — IT Security Manager',
    related_entity_id: orgs.REDSTONE.id,
    personality: 'Professional and cooperative, somewhat rattled — this is the first real incident they have handled.',
    known_facts: [
      'A facilities-support vendor account, fac-vendor-svc17, was used to log in and run PowerShell commands on the night of 2026-04-07, enumerate administrative shares, and create a scheduled task.',
      'The host made an outbound connection to an external IP shortly after that activity.',
      'Their EDR tooling alerted the morning of 2026-04-08; they isolated the affected host (RMH-FAC-SUP01) and reported to the FBI the same morning.',
      'That account was originally created in January 2026 for a legitimate vendor support engagement (RestonIT) and was not disabled when the engagement ended.',
    ],
    unknown_facts: [
      'Anything about the other three victims, RestonIT\'s broader business relationships, or any broker/financial/badge evidence.',
      'Who specifically carried out the intrusion.',
    ],
    allowed_disclosures: ['Anything about what their own team observed, logged, or did in response.'],
    objectives: ['Cooperate fully', 'Understand whether their systems are still exposed'],
    constraints: ['Never speculate about who is responsible beyond what their own telemetry shows.'],
  });

  const ausaP = await CasePersona.create({
    case_id: investigationCase.id, role_type: 'prosecutor', name: 'AUSA Priya Anand',
    personality: 'Professional, exacting, and terse. Will not approve process on a hunch.',
    known_facts: ['Only what the investigating squad has actually established and articulated to her in this conversation.'],
    unknown_facts: ['Anything not yet stated to her by the squad.'],
    allowed_disclosures: ['Whether the current request meets the legal standard for the process being requested.'],
    objectives: ['Only authorize legal process that is properly justified', 'Coach the squad toward articulating the right facts without supplying them'],
    constraints: ['Never approve process until every element is actually addressed', 'Never enumerate the checklist she is evaluating against'],
  });

  // ── Evidence: per-victim (gated to the squad assigned that victim) ─────
  const INTRUSION_FACTS = {
    REDSTONE: {
      login: '2026-04-07T22:14:06', source_ip: '198.51.100.77',
      activity: 'Shell and PowerShell launched 22:15:41-22:24:37; administrative shares enumerated; WinSvcUpdate scheduled task and rmh_admin_dirs.txt created.',
      outbound: 'Outbound connection to 203.0.113.44:443 at 22:30:11.',
      logoff: '22:33:58', result: 'Persistence mechanism established; no confirmed data theft.',
    },
    DOGWOOD: {
      login: '2026-04-08T00:47:19', source_ip: '198.51.100.91',
      activity: 'Guest inventory exported; tenant VLAN and network-closet notes viewed 00:49:02-00:53:10; backup-netops-token created.',
      outbound: null, logoff: '00:58:33', result: 'Guest data and network-configuration notes accessed; token created for possible reuse.',
    },
    CYBERDYNE: {
      login: '2026-04-09T21:13:07', source_ip: '192.0.2.44',
      activity: 'sync-maint-0426 API key created (customer-metadata-read scope) 21:15:40; Huntsville customers queried; Dogwood, Pixel Play, and Nano Corp profiles viewed 21:17:22-21:19:31.',
      outbound: 'hsv_customer_summary.csv exported at 21:20:02 — nine customer-metadata records. This is the only confirmed data export/theft in the four-victim set.',
      logoff: '21:22:15', result: 'Confirmed data exfiltration (9 records).',
    },
    PIXELPLAY: {
      login: '2026-04-10T23:38:11', source_ip: '198.51.100.128',
      activity: 'remoteassist.exe launched and executed enum_terms.bat 23:39:02-23:40:18.',
      outbound: 'Settlement-batch metadata query failed with access denied at 23:41:19 — no card-data theft confirmed. term_list.txt created under C:\\ProgramData\\pxmaint at 23:42:05.',
      logoff: '23:44:20', result: 'Attempted settlement-data access denied; no confirmed card-data theft.',
    },
  };

  const INTAKE_FACTS = {
    REDSTONE:  { window: '2026-04-08 08:37-09:42', note: 'Reviewed EDR alert, isolated RMH-FAC-SUP01, reported to FBI.' },
    DOGWOOD:   { window: '2026-04-08 08:42-10:18', note: 'Reviewed alert, disabled the created token, suspended the account, reported to FBI.' },
    CYBERDYNE: { window: '2026-04-09 21:24-22:36', note: 'Alert generated; API key disabled; account suspended; reported to FBI.' },
    PIXELPLAY: { window: '2026-04-11 00:05-09:11', note: 'Processor alert arrived; host isolated; reported to FBI.' },
  };

  const PRIOR_USE_FACTS = {
    REDSTONE:  { first_validation: '2026-01-18T15:02:44 from 10.20.5.14', last_approved_use: '2026-01-21T16:22:03', ticket_close: '2026-01-21T16:44', dormancy_begins: '2026-01-22' },
    DOGWOOD:   { first_validation: '2026-02-03T17:04:19 from 10.44.5.20', last_approved_use: '2026-02-07T19:22:18', ticket_close: '2026-02-07T20:14', dormancy_begins: '2026-02-08' },
    CYBERDYNE: { first_validation: '2025-12-11T11:10:09 from 10.61.5.19', last_approved_use: '2025-12-16T03:10:44', ticket_close: '2025-12-16T15:04', dormancy_begins: '2025-12-17' },
    PIXELPLAY: { first_validation: '2026-01-29T14:22:31 from 10.55.5.18', last_approved_use: '2026-01-31T17:48:22', ticket_close: '2026-01-31T18:12', dormancy_begins: '2026-02-01' },
  };

  const CREATION_FACTS = {
    REDSTONE: '2026-01-18T14:22:09', DOGWOOD: '2026-02-03T16:34:22', CYBERDYNE: '2025-12-11T10:18:54', PIXELPLAY: '2026-01-29T13:57:40',
  };

  for (const [code, v] of Object.entries(VICTIMS)) {
    const intake = await CaseEvidence.create({
      case_id: investigationCase.id, evidence_key: `intake-${code.toLowerCase()}`, source_type: 'complaint_intake',
      authoritative_facts: { victim: v.org, ...INTAKE_FACTS[code] },
      unlock_conditions: { always: true, requires_squad_victim_code: code },
      related_entity_ids: [orgs[code].id, accounts[code].id],
      reliability: 'observed/reported',
    });

    const acctMeta = await CaseEvidence.create({
      case_id: investigationCase.id, evidence_key: `account-metadata-${code.toLowerCase()}`, source_type: 'account_metadata',
      authoritative_facts: { account: v.account, created: CREATION_FACTS[code], created_by: v.creator, mfa: false, expiration: 'none' },
      unlock_conditions: { action_type: 'request_account_metadata', requires_entity_id: orgs[code].id, requires_squad_victim_code: code },
      related_entity_ids: [accounts[code].id],
      reliability: 'observed',
    });

    const priorUse = await CaseEvidence.create({
      case_id: investigationCase.id, evidence_key: `prior-use-${code.toLowerCase()}`, source_type: 'account_activity_history',
      authoritative_facts: PRIOR_USE_FACTS[code],
      unlock_conditions: { action_type: 'request_prior_use_records', requires_entity_id: accounts[code].id, requires_squad_victim_code: code, requires_evidence_ids: [acctMeta.id] },
      related_entity_ids: [accounts[code].id],
      reliability: 'observed',
    });

    await CaseEvidence.create({
      case_id: investigationCase.id, evidence_key: `intrusion-telemetry-${code.toLowerCase()}`, source_type: 'incident_timeline',
      authoritative_facts: INTRUSION_FACTS[code],
      unlock_conditions: { action_type: 'request_intrusion_telemetry', requires_entity_id: accounts[code].id, requires_squad_victim_code: code, requires_evidence_ids: [priorUse.id] },
      related_entity_ids: [ips[code].id, ...(code === 'REDSTONE' ? [ipRedstoneC2.id] : [])],
      reliability: 'observed',
    });
  }

  // ── Evidence: shared RestonIT / broker / financial / badge layer (no victim gate) ──
  const restonBusinessRecords = await CaseEvidence.create({
    case_id: investigationCase.id, evidence_key: 'restonit-business-records', source_type: 'business_records',
    authoritative_facts: {
      note: 'RestonIT is a shared IT support vendor with active or recently-closed engagements at all four organizations: Dogwood (effective 2025-11-01), CyberDyne (integration ticket opened 2025-12-11), Redstone (effective 2025-12-15), Pixel Play (effective 2025-12-28).',
    },
    unlock_conditions: { action_type: 'conduct_osint', requires_entity_id: orgRestonIT.id },
    related_entity_ids: [orgRestonIT.id, orgs.REDSTONE.id, orgs.DOGWOOD.id, orgs.CYBERDYNE.id, orgs.PIXELPLAY.id],
    reliability: 'reported business record',
  });

  const financialPressure = await CaseEvidence.create({
    case_id: investigationCase.id, evidence_key: 'reston-financial-pressure', source_type: 'financial_records',
    authoritative_facts: { note: 'February-March 2026: RestonIT/Alex Reston received overdraft and late-payment warnings, a rising credit balance, and one returned mortgage payment. Reported; explicitly non-dispositive on its own.' },
    unlock_conditions: { action_type: 'request_financial_records', requires_entity_id: personReston.id, requires_legal_process: 'subpoena' },
    related_entity_ids: [personReston.id],
    legal_authority_required: 'subpoena', reliability: 'reported',
  });

  const calendarEmail = await CaseEvidence.create({
    case_id: investigationCase.id, evidence_key: 'reston-calendar-and-email', source_type: 'email_headers',
    authoritative_facts: {
      calendar: '2026-03-24 20:30-22:00: "Q2 client access cleanup" — a facially legitimate reason to review stale access.',
      email: '2026-03-24 21:33:09: alex@restit.example sent a message to himself referencing client_access_review_0324.csv. Provider return is header metadata only, not content.',
    },
    unlock_conditions: { action_type: 'request_email_records', requires_entity_id: personReston.id, requires_legal_process: 'subpoena' },
    related_entity_ids: [personReston.id],
    legal_authority_required: 'subpoena', reliability: 'reported metadata',
  });

  const badgeRecords = await CaseEvidence.create({
    case_id: investigationCase.id, evidence_key: 'reston-badge-access', source_type: 'access_control_records',
    authoritative_facts: {
      note: 'Badge 214-A entered the Dogwood second-floor tenant area at 2026-03-24 20:42:18, then RestonIT Suite 214 at 20:44:03. It entered the Dogwood tenant area again at 2026-04-02 23:31:55, then entered and later exited Suite 214 between 23:33:10 and 00:19:44 during the BRKR_AL listing/sale window — activity inside is unknown.',
    },
    unlock_conditions: { action_type: 'request_badge_access_records', requires_entity_id: personReston.id, requires_legal_process: 'subpoena' },
    related_entity_ids: [personReston.id, locSuite214.id],
    legal_authority_required: 'subpoena', reliability: 'reported access-control record',
  });

  const cryptoReturn = await CaseEvidence.create({
    case_id: investigationCase.id, evidence_key: 'exchange-account-return', source_type: 'financial_records',
    authoritative_facts: {
      kyc: 'EX-48291 is KYC-linked to Alex Reston.',
      receipts: 'Approx $2,400 (2026-03-29); $3,100 (2026-04-02, source not identified); $1,850 (2026-04-05, source not identified); $4,600 (2026-04-07, payer/purpose unresolved).',
      disposition: 'The 2026-04-07 receipt was converted to USD and sent to bank account ending 4471.',
    },
    unlock_conditions: { action_type: 'request_financial_records', requires_entity_id: walletEx48291.id, requires_legal_process: 'court_order', requires_evidence_ids: [financialPressure.id] },
    related_entity_ids: [walletEx48291.id, account4471.id],
    legal_authority_required: 'court_order', reliability: 'reported legal-process return',
  });

  const darkWebListings = await CaseEvidence.create({
    case_id: investigationCase.id, evidence_key: 'dark-web-listings', source_type: 'threat_intelligence',
    authoritative_facts: {
      note: 'BRKR_AL posted, in order: Alabama healthcare administrative-support access matching Redstone (2026-03-26, match assessed moderate-high); hotel wireless-admin access matching Dogwood (2026-03-28, high); regional data-center metadata-portal access matching CyberDyne (2026-04-01, high); arcade/POS back-office access matching Pixel Play (2026-04-04, high). All four listings preceded their respective intrusions.',
    },
    unlock_conditions: { action_type: 'query_threat_intelligence', requires_entity_id: aliasBrkrAl.id, requires_evidence_ids: [restonBusinessRecords.id] },
    related_entity_ids: [aliasBrkrAl.id, orgs.REDSTONE.id, orgs.DOGWOOD.id, orgs.CYBERDYNE.id, orgs.PIXELPLAY.id],
    reliability: 'reported',
  });

  const foreignPartnerReport = await CaseEvidence.create({
    case_id: investigationCase.id, evidence_key: 'foreign-partner-report', source_type: 'foreign_partner_intelligence',
    authoritative_facts: { note: 'A foreign partner reports that BRKR_RU advertised BRKR_AL-supplied access packages from 2026-03-26 through 2026-04-06, and that different buyers reportedly acquired them.' },
    unlock_conditions: { action_type: 'request_foreign_partner_assistance', requires_entity_id: aliasBrkrRu.id, requires_evidence_ids: [darkWebListings.id] },
    related_entity_ids: [aliasBrkrRu.id, aliasBrkrAl.id],
    reliability: 'reported foreign intelligence',
  });

  await CaseEvidence.create({
    case_id: investigationCase.id, evidence_key: 'attribution-boundary-finding', source_type: 'analytical_assessment',
    authoritative_facts: {
      supported: [
        'All four retained accounts originated during RestonIT-associated work and remained enabled without MFA or expiration.',
        'The advertised environment descriptions closely match knowledge available through those accounts.',
        'Listings preceded the intrusions and were reportedly sold to different buyers.',
        'Different downstream infrastructure and behaviors support multiple buyers rather than one common operator.',
        'Alex Reston controlled RestonIT, had physical access to Suite 214 during relevant late-evening periods, handled a similarly-named access-review attachment, and controlled the KYC-linked exchange account receiving funds during the listing window.',
      ],
      not_conclusively_established: [
        'That Alex Reston is BRKR_AL.',
        'That Alex personally exported, advertised, sold, or supplied any credential.',
        'That the cryptocurrency transfers were access-sale proceeds or came from BRKR_RU.',
        'That any one downstream buyer was responsible for another victim\'s intrusion.',
        'That attempted access equals confirmed theft — only CyberDyne has a confirmed metadata export; Pixel Play\'s settlement query failed.',
      ],
    },
    unlock_conditions: { action_type: 'review_attribution_assessment', requires_evidence_ids: [cryptoReturn.id, badgeRecords.id, calendarEmail.id, darkWebListings.id] },
    related_entity_ids: [personReston.id, aliasBrkrAl.id],
    reliability: 'analytical assessment — not a directly observed fact',
  });

  // ── Legal process ladder (only what the source material actually supports) ──
  await investigationCase.update({
    legal_process_rules: [
      {
        id: 'subpoena', label: 'Grand Jury Subpoena', threshold: 'relevance', persona_id: ausaP.id,
        elements: [
          {
            id: 'states_target',
            keywords: ['reston', 'restonit', 'financial', 'email', 'badge', 'records', 'account', 'who'],
            probeHint: 'Ask the trainee, in one sentence, exactly whose records they want and from where — a subpoena naming no specific target and provider won\'t be signed.',
          },
          {
            id: 'ties_to_investigation',
            keywords: ['common vendor', 'restonit', 'pattern', 'four', 'multiple victims', 'provisioned', 'dormant', 'connect', 'shared'],
            probeHint: 'Ask the trainee to connect the request back to the RestonIT common-vendor pattern already observed across the victims — why does this particular record matter?',
          },
        ],
        caseContextAfterApproval: '\n\nThe subpoena has been served and returned — see Reston\'s financial-pressure summary, calendar/email header return, and badge access records.',
      },
      {
        id: 'court_order', label: 'Court Order for Exchange Account Records', threshold: 'specific and articulable facts', persona_id: ausaP.id,
        elements: [
          {
            id: 'pattern_of_facts',
            keywords: ['badge', 'calendar', 'email', 'financial pressure', 'suite 214', 'specific', 'dated', 'overdraft'],
            probeHint: 'Ask the trainee to point to specific, dated facts already returned by the subpoena rather than a general impression — which of Reston\'s own records make this account worth pursuing?',
          },
          {
            id: 'materiality_to_exchange',
            keywords: ['exchange', 'crypto', 'kyc', 'wallet', 'ex-48291', 'transaction', 'material', 'payment', 'listing'],
            probeHint: 'Ask why the exchange account\'s transaction history specifically — timed against the dark-web listing window — would be material to this investigation.',
          },
        ],
        caseContextAfterApproval: '\n\nThe court order has been served and returned — see the exchange account\'s transaction history.',
      },
    ],
  });

  console.log(`Seeded investigation case "${investigationCase.title}"`);
  console.log(`  assignment_id: ${assignment.id}`);
  console.log(`  case_id:       ${investigationCase.id}`);
  console.log('  Publish + unlock this assignment for a cohort/squad via the usual Content Gating flow when ready.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
