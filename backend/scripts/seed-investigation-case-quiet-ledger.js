'use strict';
/**
 * Seeds the MVP vertical-slice case for the AI-driven investigation
 * simulation engine: "Operation Quiet Ledger" — a business-email-compromise
 * wire-fraud case designed to walk a squad through the full loop —
 * complaint -> lead -> action -> evidence -> hypothesis revision -> legal
 * process -> attribution -> a command-post inject revealing a second,
 * connected victim.
 *
 * Idempotent: deletes any prior seed of this case (by Assignment title)
 * before recreating it, so this can be safely re-run during development.
 *
 * Run: node backend/scripts/seed-investigation-case-quiet-ledger.js
 */
require('dotenv').config();
const {
  Assignment, InvestigationCase, CaseEntity, CaseEntityRelationship,
  CaseEvidence, CasePersona,
} = require('../src/models');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const TITLE = 'Operation Quiet Ledger — Wire Fraud Investigation';

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
      'Northgate Millwork reports a $340,000 wire fraud loss. Investigate, develop attribution, and pursue ' +
      'the legal process needed to identify who is responsible.',
    type: 'investigation',
    grading_mode: 'squad',
    is_published: false,
    role_filters: [],
  });

  const investigationCase = await InvestigationCase.create({
    assignment_id: assignment.id,
    slug: 'quiet-ledger',
    title: TITLE,
    synopsis:
      'Northgate Millwork, a manufacturing company, wired $340,000 to what it believed were updated payment ' +
      'instructions from its longtime steel supplier, Vantage Steel Supply. The request came by email and ' +
      'appeared routine. The funds have not been recovered. The squad must determine how the fraud was ' +
      'carried out, trace the destination account, and identify who is responsible.',
    learning_objectives: [
      'Distinguish a lookalike/spoofed domain from a legitimate one using registration evidence',
      'Build an escalating legal-process case (subpoena -> court order -> search warrant) tied to specific facts',
      'Recognize when isolated evidence indicates a broader pattern rather than an isolated incident',
      'Revise a hypothesis in response to contradicting or unexplained evidence',
    ],
    status: 'published',
  });

  // ── Entities ──────────────────────────────────────────────────────────
  const orgNorthgate = await CaseEntity.create({
    case_id: investigationCase.id, type: 'organization', name: 'Northgate Millwork',
    attributes: { role: 'victim' },
  });
  const personDenise = await CaseEntity.create({
    case_id: investigationCase.id, type: 'person', name: 'Denise Okafor',
    attributes: { role: 'victim_contact', title: 'Controller, Northgate Millwork' },
  });
  const orgVantage = await CaseEntity.create({
    case_id: investigationCase.id, type: 'organization', name: 'Vantage Steel Supply',
    attributes: { role: 'impersonated_vendor', legitimate_domain: 'vantagesteel.com' },
  });
  const domainPhish = await CaseEntity.create({
    case_id: investigationCase.id, type: 'domain', name: 'vantage-steelsupply.com',
    aliases: [], attributes: { role: 'phishing_infrastructure' },
  });
  const accountMule = await CaseEntity.create({
    case_id: investigationCase.id, type: 'bank_account', name: 'Ridgeline Community Bank ****4471',
    attributes: { role: 'destination_account' },
  });
  const emailRegistrant = await CaseEntity.create({
    case_id: investigationCase.id, type: 'email_address', name: 'm.delaney1988@protonmail-mail.com',
    attributes: { role: 'domain_registrant_contact' },
  });
  const personDelaney = await CaseEntity.create({
    case_id: investigationCase.id, type: 'person', name: 'Marcus Delaney',
    attributes: { role: 'subject' },
  });

  await CaseEntityRelationship.bulkCreate([
    { case_id: investigationCase.id, from_entity_id: domainPhish.id, to_entity_id: orgVantage.id, relationship_type: 'impersonates' },
    { case_id: investigationCase.id, from_entity_id: personDenise.id, to_entity_id: orgNorthgate.id, relationship_type: 'works_for' },
    { case_id: investigationCase.id, from_entity_id: orgNorthgate.id, to_entity_id: accountMule.id, relationship_type: 'wired_payment_to' },
    { case_id: investigationCase.id, from_entity_id: personDelaney.id, to_entity_id: domainPhish.id, relationship_type: 'registered' },
    { case_id: investigationCase.id, from_entity_id: personDelaney.id, to_entity_id: accountMule.id, relationship_type: 'controls' },
    { case_id: investigationCase.id, from_entity_id: personDelaney.id, to_entity_id: emailRegistrant.id, relationship_type: 'controls' },
  ]);

  // ── Personas ──────────────────────────────────────────────────────────
  const deniseP = await CasePersona.create({
    case_id: investigationCase.id, role_type: 'victim', name: 'Denise Okafor', related_entity_id: personDenise.id,
    personality: 'Cooperative but embarrassed and anxious — worried she personally missed something.',
    known_facts: [
      'She received an email on 2026-07-18 that appeared to come from Vantage Steel Supply\'s usual contact, asking to update wiring instructions ahead of a routine payment.',
      'The email arrived the same afternoon as a legitimate invoice from Vantage, which is part of why it did not raise suspicion — it felt like a normal follow-up.',
      'She wired $340,000 to the new account the email specified.',
      'She did not call Vantage Steel Supply to verbally confirm the change before wiring funds.',
      'She has not personally examined the email\'s technical headers.',
    ],
    unknown_facts: [
      'Who actually sent the email or controls the destination account.',
      'Any technical infrastructure details (domains, IPs, registration records).',
      'Whether other companies were targeted the same way.',
    ],
    allowed_disclosures: ['Anything about what she personally saw, received, or did — she has nothing to hide and will answer directly.'],
    objectives: ['Cooperate fully', 'Get the money back if possible'],
    constraints: ['Never speculate about who is responsible — she genuinely does not know.'],
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

  // ── Evidence ──────────────────────────────────────────────────────────
  await CaseEvidence.bulkCreate([
    {
      case_id: investigationCase.id, evidence_key: 'intake-victim-report', source_type: 'complaint_intake',
      authoritative_facts: {
        summary: 'Northgate Millwork reports a $340,000 wire sent 2026-07-18 to updated payment instructions received by email, purportedly from longtime vendor Vantage Steel Supply. Funds not recovered.',
        reported_by: 'Denise Okafor, Controller', date_reported: '2026-07-19',
      },
      unlock_conditions: { always: true },
      related_entity_ids: [orgNorthgate.id, personDenise.id, orgVantage.id],
      reliability: 'victim-reported, unverified',
    },
    {
      case_id: investigationCase.id, evidence_key: 'email-headers', source_type: 'email_headers',
      authoritative_facts: {
        from_display_name: 'Vantage Steel Supply — Accounts Receivable',
        from_domain: 'vantage-steelsupply.com',
        legitimate_vendor_domain: 'vantagesteel.com',
        note: 'Sending domain differs from the vendor\'s real domain by one hyphenated word — a classic lookalike registration.',
      },
      unlock_conditions: { action_type: 'request_victim_records', requires_entity_id: orgNorthgate.id },
      related_entity_ids: [domainPhish.id],
      reliability: 'business record, victim-provided',
    },
    {
      case_id: investigationCase.id, evidence_key: 'wire-transfer-confirmation', source_type: 'bank_confirmation',
      authoritative_facts: {
        amount: '$340,000.00', date: '2026-07-18',
        destination_bank: 'Ridgeline Community Bank', destination_account: '****4471',
      },
      unlock_conditions: { action_type: 'request_victim_records', requires_entity_id: orgNorthgate.id },
      related_entity_ids: [accountMule.id],
      reliability: 'business record, victim-provided',
    },
    {
      case_id: investigationCase.id, evidence_key: 'domain-whois', source_type: 'public_osint',
      authoritative_facts: {
        registration_date: '2026-07-15', registrant: 'privacy-protected', registrar: 'NameShield Registrar LLC',
        note: 'Domain was registered only three days before the fraudulent email was sent.',
      },
      unlock_conditions: { action_type: 'conduct_osint', requires_entity_id: domainPhish.id },
      related_entity_ids: [],
      reliability: 'public record',
    },
    {
      case_id: investigationCase.id, evidence_key: 'domain-subpoena-return', source_type: 'registrar_subpoena_return',
      authoritative_facts: {
        subscriber_email: 'm.delaney1988@protonmail-mail.com', payment_method: 'prepaid debit card',
      },
      unlock_conditions: { action_type: 'request_domain_registration', requires_entity_id: domainPhish.id, requires_legal_process: 'subpoena' },
      related_entity_ids: [emailRegistrant.id],
      legal_authority_required: 'subpoena', reliability: 'business record, compelled production',
    },
    {
      case_id: investigationCase.id, evidence_key: 'mule-account-holder', source_type: 'bank_subpoena_return',
      authoritative_facts: {
        account_holder: 'Marcus Delaney', account_opened: '2026-06-02',
        id_on_file: 'State driver\'s license, verified at account opening', phone_on_file: '(555) 019-2231',
      },
      unlock_conditions: { action_type: 'request_financial_records', requires_entity_id: accountMule.id, requires_legal_process: 'subpoena' },
      related_entity_ids: [personDelaney.id],
      legal_authority_required: 'subpoena', reliability: 'business record, compelled production',
    },
    {
      case_id: investigationCase.id, evidence_key: 'mule-account-pattern', source_type: 'bank_records_order_return',
      authoritative_facts: {
        note: 'Account ****4471 received four other similarly-sized incoming wires from four different companies in the preceding 60 days, each followed within 24 hours by an outbound transfer.',
      },
      unlock_conditions: { action_type: 'request_financial_records', requires_entity_id: accountMule.id, requires_legal_process: 'court_order' },
      related_entity_ids: [],
      legal_authority_required: 'court_order', reliability: 'business record, compelled production',
    },
    {
      case_id: investigationCase.id, evidence_key: 'crypto-off-ramp-trace', source_type: 'bank_records_order_return',
      authoritative_facts: {
        note: 'Within hours of the Northgate wire landing, the account swept the funds to a cryptocurrency exchange account held in Marcus Delaney\'s name.',
      },
      unlock_conditions: { action_type: 'request_financial_records', requires_entity_id: accountMule.id, requires_legal_process: 'court_order' },
      related_entity_ids: [],
      legal_authority_required: 'court_order', reliability: 'business record, compelled production',
    },
    {
      case_id: investigationCase.id, evidence_key: 'search-warrant-return', source_type: 'search_warrant_return',
      authoritative_facts: {
        note: 'A laptop seized from Delaney\'s residence contains browser history showing the registration of vantage-steelsupply.com and a spreadsheet tracking payment timelines for several target companies, including Northgate Millwork.',
      },
      unlock_conditions: { action_type: 'execute_search_warrant', requires_entity_id: personDelaney.id, requires_legal_process: 'search_warrant' },
      related_entity_ids: [],
      legal_authority_required: 'search_warrant', reliability: 'physical evidence, judicially authorized seizure',
    },
    {
      case_id: investigationCase.id, evidence_key: 'inject-second-victim', source_type: 'command_post_inject',
      authoritative_facts: {
        note: 'A second company, Bramwell Fixtures, has just reported an identical fraud pattern — funds wired to the same account, ****4471, after a near-identical lookalike-domain email.',
      },
      unlock_conditions: { action_type: 'command_post_inject' },
      related_entity_ids: [accountMule.id],
      reliability: 'new complaint, unverified',
    },
  ]);

  // ── Legal process ladder ─────────────────────────────────────────────
  await investigationCase.update({
    legal_process_rules: [
      {
        id: 'subpoena', label: 'Grand Jury Subpoena', threshold: 'relevance', persona_id: ausaP.id,
        elements: [
          {
            id: 'states_target',
            keywords: ['domain', 'registrar', 'subscriber', 'account holder', 'ridgeline', 'vantage-steelsupply', '4471', 'who registered', 'who owns'],
            probeHint: 'Ask the trainee, in one sentence, exactly which records from which provider they want — a subpoena naming nothing specific won\'t be signed.',
          },
          {
            id: 'ties_to_investigation',
            keywords: ['fraud', 'wire', 'lookalike', 'phishing', 'northgate', 'relevant', 'relate', 'investigation', 'impersonat'],
            probeHint: 'Ask the trainee to connect the requested records back to the specific fraud already reported — why do these records matter to this case?',
          },
        ],
        caseContextAfterApproval: '\n\nThe subpoena has been served and returned — see the registrar and bank subscriber-information returns.',
      },
      {
        id: 'court_order', label: 'Court Order for Account Records', threshold: 'specific and articulable facts', persona_id: ausaP.id,
        elements: [
          {
            id: 'pattern_of_facts',
            keywords: ['delaney', 'account holder', 'opened', 'id on file', 'identified', 'named', 'confirmed'],
            probeHint: 'Ask the trainee what specific fact from the subpoena return justifies going further into this account\'s full history — who does the account actually belong to?',
          },
          {
            id: 'materiality',
            keywords: ['transaction', 'history', 'pattern', 'other victims', 'other companies', 'outbound', 'destination', 'material'],
            probeHint: 'Ask why the account\'s broader transaction history specifically — as opposed to just this one wire — would be material to the investigation.',
          },
        ],
        caseContextAfterApproval: '\n\nThe court order has been served and returned — see the account pattern and crypto off-ramp returns.',
      },
      {
        id: 'search_warrant', label: 'Search Warrant', threshold: 'probable cause', persona_id: ausaP.id,
        elements: [
          {
            id: 'nexus_to_residence',
            keywords: ['residence', 'home', 'address', 'his house', 'apartment', 'personal device'],
            probeHint: 'Ask the trainee why they believe evidence would actually be found at Delaney\'s residence specifically.',
          },
          {
            id: 'particularity',
            keywords: ['laptop', 'computer', 'phone', 'device', 'browser history', 'spreadsheet', 'storage'],
            probeHint: 'Ask the trainee to name the specific items to be seized — a warrant can\'t authorize an unlimited search.',
          },
          {
            id: 'probable_cause_basis',
            keywords: ['account', 'opened', 'crypto', 'exchange', 'sweep', 'delaney\'s name', 'identified', 'named'],
            probeHint: 'Ask what, taken together, establishes that Delaney himself — not just the account — was behind this.',
          },
        ],
      },
    ],
  });

  console.log(`Seeded investigation case "${investigationCase.title}"`);
  console.log(`  assignment_id: ${assignment.id}`);
  console.log(`  case_id:       ${investigationCase.id}`);
  console.log('  Publish + unlock this assignment for a cohort/squad via the usual Content Gating flow when ready.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
