'use strict';
/**
 * Definitions for PACKET HEIST v2 Drop 2's per-victim assessments: 7
 * individual role assessments plus 1 victim-scoped squad quiz per victim,
 * plus one cohort-wide Cross-Squad Sync quiz — transcribed from
 * "PACT Challenges"/PACT_Day2_Squad_<Victim>_Student.docx and its
 * _InstructorKey.docx counterpart, and PACT_Day2_CrossSquadSync_*.docx.
 *
 * Mirrors day1VictimRoleSpecs.js's shape exactly (see that file for the
 * seeder it feeds — seed-pact-day2-victim-roles.js follows the same
 * pattern as seed-pact-day1-victim-roles.js). Role codes/labels/roleFilters
 * are identical to Day 1's (SA/IA/DA/FoA/SOS/TFO/CS) and victim
 * codes/names match backend/src/constants/victims.js exactly — reused
 * verbatim from day1VictimRoleSpecs.js's VICTIMS array rather than
 * redeclared, so a future victim-name change only has one place to edit.
 *
 * The Cross-Squad Sync is NOT victim-scoped — it's a single cohort-wide
 * synthesis quiz every squad answers after comparing notes at the sync
 * (per the docx's own instructions). There's no "whole cohort" submission
 * unit in the data model, so — consistent with how every other squad-scoped
 * challenge here works — it's seeded as one grading_mode:'squad' assignment
 * with victim_name: null and role_filters: [], and each squad records its
 * own (same-content) submission for it, same as the victim quizzes.
 *
 * Run: node backend/scripts/seed-pact-day2-victim-roles.js
 */
const { v4: uuidv4 } = require('uuid');

const SCENARIO = 'packet-heist-v2';
const DROP = 2;
const TITLE_PREFIX = 'PACKET HEIST v2 — Drop 2:';

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

/* ── CyberDyne Data Center ──────────────────────────────────────────────── */
const CYBERDYNE = {
  code: 'CYBERDYNE',
  name: 'CyberDyne Data Center',
  roles: [
    {
      code: 'SA', label: 'Special Agent', roleFilter: 'special_agent',
      task: `Review the Alabama Secretary of State return on RestonIT LLC and decide whether today's returns change your squad's posture.`,
      mc: [
        mc('What does the Alabama Secretary of State record establish about RestonIT LLC?', ['It is the intruder in this case', 'Alex M. Reston is its member/principal — a neutral entity fact', 'It was dissolved in 2025', 'It has no registered agent'], 1, 'the Alabama SOS return'),
        mc('Why was RestonIT researched via the SOS record in the first place?', ['Random selection', "It was noticed in at least one victim's AP ledger — including CyberDyne's", 'A tip from Marcus Iyer', 'A ransom note reference'], 1, 'the Alabama SOS return'),
        mc('What does the SOS record NOT establish?', ["RestonIT's formation year", 'That RestonIT committed any crime', "The principal's name", 'The registered address'], 1, 'the Alabama SOS return'),
      ],
      blanks: [
        blank("RestonIT LLC's principal, per the SOS record, is ______.", ['Alex M. Reston'], 'the Alabama SOS return'),
        blank('This record does ______ label RestonIT as the intruder.', ['not'], 'the Alabama SOS return'),
      ],
      shortAnswer: prompt("Has this changed your Day 1 characterization of RestonIT's presence in CyberDyne's AP ledger? Explain.", ['RestonIT is now a named entity with a named principal — worth flagging for cross-squad comparison', 'Still just a vendor fact, not evidence of wrongdoing specific to CyberDyne']),
    },
    {
      code: 'IA', label: 'Intelligence Analyst', roleFilter: 'intelligence_analyst',
      task: `Review the ISP return identifying the foreign-hosted VPS used in CyberDyne's exfiltration.`,
      mc: [
        mc('What foreign hosting provider is identified as leasing the VPS used in the exfiltration?', ['VeilStream LLC', 'Northwind Datacenters OÜ', 'CoinBridge', 'Ozark Valley Bank'], 1, 'the Estonia ISP return'),
        mc('In what country is this provider located?', ['Romania', 'Estonia', 'Netherlands', 'Ireland'], 1, 'the Estonia ISP return'),
        mc("What does today's return NOT yet provide?", ["The hosting provider's name", 'Subscriber-level detail, which requires a request to the foreign provider', 'The country', 'The IP address'], 1, 'the Estonia ISP return'),
      ],
      blanks: [
        blank('This is a ______ indicator, driving a Tuesday-afternoon international request.', ['foreign'], 'the Estonia ISP return'),
        blank('Subscriber-level detail is expected no earlier than ______.', ['Wednesday'], 'the Estonia ISP return'),
      ],
      shortAnswer: prompt("What kind of legal process is required next to get subscriber detail from a foreign provider, and why can't a domestic subpoena alone get it?", ['An MLAT or equivalent international legal-assistance request is required', "Domestic subpoena power doesn't compel a foreign-based provider"]),
    },
    {
      code: 'DA', label: 'Data Analyst', roleFilter: 'operational_support_da',
      task: `Revisit CyberDyne's own Day 1 AP vendor ledger now that RestonIT is named, and quantify its relative share of vendor payments.`,
      mc: [
        mc("Roughly how many vendors does RestonIT sit among in CyberDyne's FY2025 AP ledger?", ['3', 'About a dozen', '50', 'Over 100'], 1, 'the vendor ledger'),
        mc("Does yesterday's ledger entry, reread today, change in content?", ['Yes, new numbers appear', 'No — the underlying file is unchanged; only your understanding of the name has changed', 'Yes, it now flags RestonIT explicitly', 'The file has been amended'], 1, 'the vendor ledger'),
        mc("What additional data would help quantify RestonIT's relative significance as a vendor?", ['Nothing further needed', "The dollar total of RestonIT's line items compared to other vendors' totals", 'A confession', 'A search warrant'], 1, 'the vendor ledger'),
      ],
      blanks: [
        blank('The ledger you\'re reviewing today is the same file from ______.', ['Day 1 (Monday)', 'Day 1', 'Monday'], 'the vendor ledger'),
        blank("To quantify RestonIT's relative vendor share, sum its line items and compare to the ledger's ______.", ['total (all-vendor total)', 'total', 'all-vendor total'], 'the vendor ledger'),
      ],
      shortAnswer: prompt("Now that RestonIT is a named entity with a known principal, restate in one sentence what has and hasn't changed about its significance to CyberDyne specifically.", ['What\'s changed: the name now has a face (Alex M. Reston)', "What hasn't changed: CyberDyne's own ledger still shows nothing more than a routine vendor relationship"]),
    },
    {
      code: 'FoA', label: 'Forensic Accountant', roleFilter: 'forensic_accountant',
      task: `Assess whether RestonIT's vendor relationship with CyberDyne shows any financial irregularity, based on what's available.`,
      mc: [
        mc("Does anything in CyberDyne's own Day 1 or Day 2 evidence show irregular payments to RestonIT?", ['Yes, clearly irregular payments', "No — nothing irregular is shown in CyberDyne's own records", 'Yes, but only in cash', 'The records are missing entirely'], 1, "CyberDyne's own records"),
        mc('What financial record, not yet available to your squad, might show irregularities elsewhere?', ['None exists', "RestonIT's own business banking records (expected later)", "CyberDyne's payroll", 'A federal reserve report'], 1, "CyberDyne's own records"),
        mc("Why is it important to note the absence of irregularity in CyberDyne's own vendor payments?", ["It isn't important", "It shows the relationship, from CyberDyne's side, looks entirely ordinary — irregularity, if any, lies elsewhere", 'It proves innocence conclusively', 'It ends the investigation'], 1, "CyberDyne's own records"),
      ],
      blanks: [
        blank("From CyberDyne's side, the RestonIT vendor relationship appears entirely ______.", ['ordinary', 'routine', 'ordinary/routine'], "CyberDyne's own records"),
        blank("Any financial irregularity in this case, if it exists, would more likely surface in RestonIT's own ______ records.", ['business banking', 'banking'], "CyberDyne's own records"),
      ],
      shortAnswer: prompt("State, honestly, what CyberDyne's financial records can and cannot tell you about RestonIT at this point.", ['Can confirm an ordinary, unremarkable vendor relationship', "Cannot speak to RestonIT's own financial conduct, which sits outside CyberDyne's records"]),
    },
    {
      code: 'SOS', label: 'Staff Operations/Tactical Specialist', roleFilter: 'operational_support_sos',
      task: `Update the legal-process tracker for CyberDyne's thread and prepare today's cross-squad sync summary.`,
      mc: [
        mc("What is the status of CyberDyne's international request as of today?", ['Answered in full', 'Submitted, pending a response no earlier than Wednesday', 'Not yet identified as necessary', 'Denied'], 1, "today's evidence"),
        mc('What new return did your squad receive today, common to all four squads?', ['A wire confirmation', 'The Alabama SOS record on RestonIT LLC', 'A ransom note', 'A phishing test result'], 1, "today's evidence"),
        mc('What should you flag for the cross-squad sync regarding RestonIT?', ['Nothing — keep it within your squad', "That RestonIT, now tied to a named principal, appeared in your victim's Day 1 vendor ledger too", 'That the case is closed', 'That RestonIT is unrelated to CyberDyne'], 1, "today's evidence"),
      ],
      blanks: [
        blank('Your international request tasking is logged as ______ as of today.', ['pending'], "today's evidence"),
        blank("Prepare a one-line summary of CyberDyne's RestonIT vendor appearance to bring to the ______.", ['cross-squad sync'], "today's evidence"),
      ],
      shortAnswer: prompt("Draft the one-paragraph summary you will bring to today's cross-squad sync, covering CyberDyne's own findings relevant to RestonIT and the foreign VPS.", ['Mentions RestonIT as an ordinary AP-ledger vendor', 'Mentions the SOS record naming Alex M. Reston', 'Mentions the pending Estonia/Northwind subscriber request']),
    },
    {
      code: 'TFO', label: 'Task Force Officer', roleFilter: 'task_force_officer',
      task: `Check local records for Alex Reston/RestonIT LLC and maintain custody of today's returns.`,
      mc: [
        mc("What administrative body produced today's confirmation of RestonIT LLC's ownership?", ['Huntsville PD', 'Alabama Secretary of State', 'Madison County Court', 'FBI Records'], 1, "today's returns"),
        mc('If your local-records check on Reston/RestonIT returns nothing, what should you do?', ['Skip logging it', 'Log it as a negative result', "Assume the check wasn't done", 'Escalate as a false positive'], 1, "today's returns"),
        mc("What should happen to today's two returns (SOS record, Estonia ISP return) from a custody standpoint?", ['Nothing, they self-file', 'Each logged with source, date received, and how obtained', 'Only the SOS record needs logging', 'Logging starts only after Day 3'], 1, "today's returns"),
      ],
      blanks: [
        blank("RestonIT LLC's registered agent is documented in the ______ record.", ['Alabama Secretary of State'], "today's returns"),
        blank('A local-records check with no hits is logged as a ______ result.', ['negative'], "today's returns"),
      ],
      shortAnswer: prompt("Describe your local-records check today and what you'll report to the cross-squad sync regardless of outcome.", ['Describes checking local court/PD/business records for Reston/RestonIT tied to CyberDyne', 'Commits to report the result — positive or negative — at the sync']),
    },
    {
      code: 'CS', label: 'Computer Scientist', roleFilter: 'cyber_analyst',
      task: `Technically assess what the Estonia VPS return does and doesn't establish.`,
      mc: [
        mc("What does today's Estonia return confirm?", ["The VPS's ultimate data destination", 'That 198.51.100.23 is sub-allocated to a specific named provider', 'The identity of the account holder', 'The full session logs'], 1, 'the Estonia ISP return'),
        mc('What does it NOT yet confirm?', ["The provider's name", 'Subscriber-level detail behind the lease', 'The country', 'The IP address'], 1, 'the Estonia ISP return'),
        mc('What additional legal process is required to get the missing detail?', ['None', 'An MLAT/international legal-assistance request', 'A local subpoena', 'A search warrant on CyberDyne'], 1, 'the Estonia ISP return'),
      ],
      blanks: [
        blank('The VPS at 198.51.100.23 is sub-allocated to ______, located in Tallinn, Estonia.', ['Northwind Datacenters OÜ', 'Northwind Datacenters'], 'the Estonia ISP return'),
        blank("A response with subscriber detail isn't expected before ______.", ['Wednesday'], 'the Estonia ISP return'),
      ],
      shortAnswer: prompt('What technical detail would you most want the eventual foreign return to include, and why?', ['Subscriber/lease-holder identity', "Payment method — exactly what Wednesday's partial return provides"]),
    },
  ],
  squadQuiz: [
    mc("What entity is now tied to a named principal, per today's SOS record?", ['CyberDyne Data Center', 'RestonIT LLC', 'Meridian Claims', 'Northwind Datacenters'], 1, "today's evidence"),
    mc('What foreign country is implicated in the VPS lease?', ['Romania', 'Estonia', 'Ireland', 'Netherlands'], 1, "today's evidence"),
    mc('What is still missing before your squad can act further on the foreign VPS lead?', ['Nothing', 'Subscriber-level detail from an international request', 'The IP address', "The provider's name"], 1, "today's evidence"),
    mc("Has anything in CyberDyne's own records shown financial irregularity involving RestonIT?", ['Yes, clearly', "No — the relationship looks ordinary from CyberDyne's side", "It's inconclusive", 'The records are missing'], 1, "today's evidence"),
    mc("What should your squad bring to today's cross-squad sync?", ['Nothing new', 'RestonIT\'s appearance in your AP ledger, now tied to a named principal, plus the pending Estonia lead', 'A completed charging document', 'A confession'], 1, "today's evidence"),
  ],
};

/* ── Dogwood Hotel & Resort ─────────────────────────────────────────────── */
const DOGWOOD = {
  code: 'DOGWOOD',
  name: 'Dogwood Hotel & Resort',
  roles: [
    {
      code: 'SA', label: 'Special Agent', roleFilter: 'special_agent',
      task: `Review the Alabama Secretary of State return and decide whether it changes your squad's posture toward RestonIT's signed agreement.`,
      mc: [
        mc('What does the Alabama SOS record establish?', ['RestonIT is the intruder', "Alex M. Reston is RestonIT's principal", 'RestonIT was dissolved', 'No vendor relationship exists'], 1, 'the Alabama SOS return'),
        mc('Dogwood already has the strongest RestonIT document of all four victims — what is it?', ['An AP ledger line item', 'A signed managed-services agreement', 'A phishing test result', 'A wire confirmation'], 1, "Dogwood's records"),
        mc('Does the SOS record change the significance of that signed agreement?', ["No, it's unrelated", 'Yes — it now attaches a named principal to the entity Dogwood contracted with', 'Yes, it invalidates the agreement', 'It has no bearing at all'], 1, 'the Alabama SOS return'),
      ],
      blanks: [
        blank("RestonIT LLC's principal is ______.", ['Alex M. Reston'], 'the Alabama SOS return'),
        blank("Dogwood's signed agreement was executed in ______.", ['2024'], "the managed-services agreement"),
      ],
      shortAnswer: prompt("Why does Dogwood's signed services agreement matter more now than it did Monday?", ['Ties a specific, named individual — not just an anonymous LLC — to the vendor', 'That vendor has plausible email/admin access', 'Worth flagging given three other victims also show RestonIT']),
    },
    {
      code: 'IA', label: 'Intelligence Analyst', roleFilter: 'intelligence_analyst',
      task: `Review the two lookalike-domain returns (email provider and registrar).`,
      mc: [
        mc('When was the lookalike domain email account created?', ['April 1, 2026', 'May 1, 2026', 'May 20, 2026', 'May 9, 2026'], 1, 'the lookalike-domain returns'),
        mc("What IP is tied to the account's creation and logins?", ['203.0.113.61', '198.51.100.23', '203.0.113.148', '192.0.2.190'], 2, 'the lookalike-domain returns'),
        mc('How was the lookalike domain paid for?', ['Credit card', 'BTC from the same wallet used for the VeilStream VPN subscription', 'Wire transfer', 'Cash'], 1, 'the lookalike-domain returns'),
      ],
      blanks: [
        blank('The lookalike domain is ______.', ['magnolia-linensupply.example'], 'the lookalike-domain returns'),
        blank('It was registered ______ before the malicious forwarding rule was created.', ['about a week (8 days)', 'about a week', '8 days'], 'the lookalike-domain returns'),
      ],
      shortAnswer: prompt("What does the shared wallet between this domain's registration and Pixel Play squad's VeilStream return suggest — and why can't you confirm it alone?", ['Suggests the same financially-connected actor or operation behind both threads', 'Confirming it requires comparing wallet IDs with the Pixel Play/Redstone Memorial squads at the sync']),
    },
    {
      code: 'DA', label: 'Data Analyst', roleFilter: 'operational_support_da',
      task: `Parse the Dogwood tenant admin audit for the svc_mailmgmt account.`,
      mc: [
        mc('When was svc_mailmgmt created?', ['2025-09-18', '2025-10-15', '2025-11-12', '2026-05-09'], 2, 'the tenant admin audit'),
        mc('Who created it, in UPN format?', ['RMH\\rmm_admin', 'rmm_admin@dogwoodhotel.example', 'arcade_support', 'svc_backup_rst'], 1, 'the tenant admin audit'),
        mc('What did this account do on May 9?', ['Nothing', 'Created the malicious forwarding rule', 'Was deleted', 'Was renamed'], 1, 'the tenant admin audit'),
      ],
      blanks: [
        blank('The dormancy gap for this account, creation to malicious use, is approximately ______ months.', ['5.9 (about 6)', '5.9', 'about 6', 'six'], 'the tenant admin audit'),
        blank('This account holds ______-equivalent privileges.', ['global-admin', 'global admin'], 'the tenant admin audit'),
      ],
      shortAnswer: prompt('Explain, technically, why this account\'s creation format ("rmm_admin@dogwoodhotel.example") still represents the same underlying identity as "rmm_admin" elsewhere.', ['The UPN format is just a different way of recording the same creating principal', 'An entity-resolution exercise, not a different actor']),
    },
    {
      code: 'FoA', label: 'Forensic Accountant', roleFilter: 'forensic_accountant',
      task: `Review the Ozark Valley Bank return for the fraud's beneficiary account.`,
      mc: [
        mc('What identity was used to open the beneficiary account?', ['Alex M. Reston', '"Raymond T. Colson," a synthetic/stolen identity', 'RestonIT LLC', 'Ted Whitlock'], 1, 'the Ozark Valley Bank return'),
        mc('What happened to the account after the fraud was identified?', ['Remains active', 'Closed and fraud-flagged', 'Seized by the FBI', 'Transferred'], 1, 'the Ozark Valley Bank return'),
        mc('What discrepancy was noted in the KYC identity?', ['Address mismatch only', 'DOB/SSN mismatch', 'Name misspelling', 'No discrepancy found'], 1, 'the Ozark Valley Bank return'),
      ],
      blanks: [
        blank('Funds were rapidly disbursed via ACH transfers, cash withdrawals, and one outbound transfer to a ______.', ['cryptocurrency exchange', 'crypto exchange'], 'the Ozark Valley Bank return'),
      ],
      dualBlankPrompt: prompt('The beneficiary account number is ______, opened remotely in ______ 2026. State both values.', ['Account number: 4471820963', 'Month: April'], BLANK_POINTS),
      shortAnswer: prompt('Trace the fund path described in this return, from incoming wire to final disposition.', ['Two incoming wires ($48,200, $61,750)', 'Rapid ACH transfers to two other accounts, cash withdrawals', 'One outbound transfer to a crypto exchange — a separate, later leg from the wallet-based correlation']),
    },
    {
      code: 'SOS', label: 'Staff Operations/Tactical Specialist', roleFilter: 'operational_support_sos',
      task: `Update the tracker and prepare today's cross-squad sync summary for Dogwood.`,
      mc: [
        mc("How many Day 2 returns did Dogwood's squad receive today?", ['One', 'Two', 'Four', 'None'], 2, "today's evidence"),
        mc('What shared element should you flag for the cross-squad sync?', ['Nothing', "The wallet paying for the lookalike domain, to compare against other squads' wallet findings", "The GM's memo", 'The phishing test'], 1, "today's evidence"),
        mc("What administrative status should today's four returns be logged as?", ['Pending', 'Answered', 'Denied', 'Not applicable'], 1, "today's evidence"),
      ],
      blanks: [
        blank("Update your tracker: today's four Dogwood-specific returns are now ______.", ['answered'], "today's evidence"),
        blank('The wallet common to your lookalike-domain return should be compared at the ______.', ['cross-squad sync'], "today's evidence"),
      ],
      shortAnswer: prompt("Draft your one-paragraph cross-squad sync summary for Dogwood's thread.", ['Mentions the lookalike domain and its wallet', 'Mentions the tenant-admin account and its dormancy/UPN format', 'Mentions the Ozark Valley synthetic identity', 'Mentions the RestonIT services agreement/SOS record']),
    },
    {
      code: 'TFO', label: 'Task Force Officer', roleFilter: 'task_force_officer',
      task: `Follow up on the synthetic identity and maintain custody of today's returns.`,
      mc: [
        mc('What synthetic identity did the beneficiary account use?', ['A real Dogwood employee', '"Raymond T. Colson"', 'Alex Reston', 'Ted Whitlock'], 1, 'the Ozark Valley Bank return'),
        mc('Should you expect legitimate local records for this synthetic identity?', ['Yes, definitely', "Likely not — synthetic identities often don't check out against real records", "Only if it's a common name", 'Only after Thursday'], 1, "today's returns"),
        mc('How should today\'s four Dogwood returns be logged for custody?', ['Informally', 'With source, date received, and how obtained', 'Only the bank return needs logging', 'Not until Friday'], 1, "today's returns"),
      ],
      blanks: [
        blank('A local-records check on "Raymond T. Colson" with no legitimate hits should still be logged as a ______ result.', ['negative'], "today's returns"),
        blank('The beneficiary account was ______ once the fraud was identified.', ['closed and fraud-flagged', 'closed'], 'the Ozark Valley Bank return'),
      ],
      shortAnswer: prompt('What would you report at the cross-squad sync about the beneficiary-account identity check?', ['Identity appears synthetic/stolen (DOB/SSN mismatch)', 'No expectation of a legitimate local-records match']),
    },
    {
      code: 'CS', label: 'Computer Scientist', roleFilter: 'cyber_analyst',
      task: `Technically review the tenant-admin audit's automation signature.`,
      mc: [
        mc('What log entries show the exact moment the forwarding rule was created and by what account?', ["The GM's memo", 'The tenant admin audit log (New-InboxRule event)', 'The wire confirmation', 'The phishing test'], 1, 'the tenant admin audit'),
        mc("What protocol/client is logged for the account's mailbox login right after creating the rule?", ['OWA/Chrome', 'IMAP', 'POP3', 'SMTP relay'], 0, 'the tenant admin audit'),
        mc('What does pairing an automated account action (rule creation) with a specific IP address let you do, technically?', ['Nothing useful', 'Tie a specific network origin to a specific automated mailbox action', 'Prove who physically typed the command', "Decrypt the account's password"], 1, 'the tenant admin audit'),
      ],
      blanks: [
        blank('The forwarding rule was created at ______ on May 9, 2026.', ['03:41:17 UTC', '3:41:17 UTC'], 'the tenant admin audit'),
        blank('The mailbox login immediately after, using IMAP, came from IP ______.', ['203.0.113.148'], 'the tenant admin audit'),
      ],
      shortAnswer: prompt("What would you want to technically compare between this account's activity and CyberDyne's appliance evidence, once it's available?", ['Looking for a consistent tool/agent signature', 'Would show the same actor or tool touched both', "Anticipates Wednesday's RMM-Agent/4.7 signature match"]),
    },
  ],
  squadQuiz: [
    mc("What identity was used for the fraud's beneficiary bank account?", ['Alex M. Reston', 'A synthetic identity, "Raymond T. Colson"', 'Ted Whitlock', 'RestonIT LLC'], 1, "today's evidence"),
    mc("What wallet paid for the lookalike domain's registration?", ['w1', 'w2', 'w3', 'A credit card, no wallet involved'], 1, "today's evidence"),
    mc("What does the tenant-admin account svc_mailmgmt's UPN-format name represent?", ['A different actor from rmm_admin', 'The same rmm_admin principal, different naming format', 'An unrelated IT admin', 'A customer account'], 1, "today's evidence"),
    mc('What is the strongest RestonIT-tie document your squad already holds?', ['The AP ledger', 'A signed managed-services agreement', 'The phishing test', 'The wire confirmations'], 1, "today's evidence"),
    mc("What's the most defensible characterization of today's findings?", ['RestonIT is confirmed as the intruder', 'A financially-connected BEC scheme using a dormant provisioned account, a lookalike domain, and a synthetic-identity bank account — not yet an established actor', 'The case is closed', 'Ted Whitlock is a confirmed suspect'], 1, "today's evidence"),
  ],
};

/* ── Pixel Play Arcade ──────────────────────────────────────────────────── */
const PIXELPLAY = {
  code: 'PIXELPLAY',
  name: 'Pixel Play Arcade',
  roles: [
    {
      code: 'SA', label: 'Special Agent', roleFilter: 'special_agent',
      task: `Review the Alabama Secretary of State return on RestonIT LLC and decide whether today's returns change your squad's posture.`,
      mc: [
        mc('What does the Alabama SOS record establish?', ['RestonIT is the intruder', "Alex M. Reston is RestonIT LLC's principal", 'RestonIT was dissolved', 'No vendor relationship exists'], 1, 'the Alabama SOS return'),
        mc("RestonIT was researched because it appeared in which of Pixel Play's Day 1 records?", ['The POS summary', 'The QuickBooks vendor export', 'The local PD report', 'The ransom note'], 1, "Pixel Play's records"),
        mc('What does the SOS record NOT establish?', ['The formation year', 'That RestonIT committed a crime', "The principal's name", 'The registered address'], 1, 'the Alabama SOS return'),
      ],
      blanks: [
        blank("RestonIT LLC's principal is ______.", ['Alex M. Reston'], 'the Alabama SOS return'),
        blank('The SOS record does ______ label RestonIT as the intruder.', ['not'], 'the Alabama SOS return'),
      ],
      shortAnswer: prompt("Has this changed your Day 1 view of RestonIT's invoicing pattern to Pixel Play (recurring, then stopped)?", ['The stop-date is more interesting given a named principal now exists', 'Still requires more than a vendor-ledger fact to mean anything', 'Worth flagging for cross-squad comparison']),
    },
    {
      code: 'IA', label: 'Intelligence Analyst', roleFilter: 'intelligence_analyst',
      task: `Review the VeilStream VPN subscriber return tied to the intrusion IP.`,
      mc: [
        mc('What subscriber ID is assigned to the VPN account tied to exit IP 203.0.113.61?', ['VS-88213', 'BH-0314', 'RMM-4.7', 'VS-61203'], 0, 'the VeilStream subscriber return'),
        mc('What registration email is tied to this VPN subscription?', ['amr.secure@protonrelay.example', 'd.kort92@protonrelay.example', 'brkr_al@protonrelay.example', 't.whitlock@dogwoodhotel.example'], 1, 'the VeilStream subscriber return'),
        mc('How was the VPN subscription paid for?', ['Credit card', 'BTC from a specific wallet', 'Wire transfer', 'Cash'], 1, 'the VeilStream subscriber return'),
      ],
      blanks: [
        blank("This exit IP, 203.0.113.61, is the same IP found in Pixel Play's own Day 1 ______ log.", ['security-event (RDP)', 'security-event', 'RDP'], 'the VeilStream subscriber return'),
        blank('The wallet used for this VPN payment is ______.', ['PACT{PLACEHOLDER-w2}'], 'the VeilStream subscriber return'),
      ],
      shortAnswer: prompt("This return is about the IP found in your own victim's intrusion log. What does it tell you about who was likely on the other end of that RDP connection?", ['Someone using a paid, anonymized VPN service under a registered identity (email + wallet)', "Suggests some operational security, though the VPN's own logging is minimal"]),
    },
    {
      code: 'DA', label: 'Data Analyst', roleFilter: 'operational_support_da',
      task: `Review the Pixel Play local account-creation export and quantify the dormancy gap.`,
      mc: [
        mc('When was the arcade_support account created?', ['2025-09-18', '2025-10-15', '2025-11-12', '2026-07-11'], 1, 'the local account-creation export'),
        mc('Who created it, per the export?', ['The business owner', 'rmm_admin', 'arcade_support itself', 'An unknown party'], 1, 'the local account-creation export'),
        mc('What group memberships does it hold?', ['Guests only', 'Administrators and Remote Desktop Users', 'Standard user', 'Backup Operators only'], 1, 'the local account-creation export'),
      ],
      blanks: [
        blank('The account\'s last logon — the intrusion itself — occurred on ______.', ['2026-07-11'], 'the local account-creation export'),
        blank('The gap between creation and first malicious use is approximately ______ months.', ['nine (~9)', 'nine', '9'], 'the local account-creation export'),
      ],
      shortAnswer: prompt("Quantify the dormancy pattern for this one account in a sentence usable in tomorrow's package.", ['arcade_support sat dormant roughly nine months between provisioning (Oct 2025) and its use in the July 2026 intrusion', 'Note the pattern, not just the dates']),
    },
    {
      code: 'FoA', label: 'Forensic Accountant', roleFilter: 'forensic_accountant',
      task: `Reassess the financial angle now that VeilStream payment info exists.`,
      mc: [
        mc("What new financial detail does today's evidence add for Pixel Play's thread?", ['A ransom payment confirmation', 'A wallet used to pay for the VPN tied to the intrusion IP', 'A wire transfer', 'A bank loan'], 1, 'the VeilStream subscriber return'),
        mc('Is this the same wallet used elsewhere in the case, as far as your squad knows today?', ['Confirmed yes, cross-referenced already', 'Unknown to your squad yet — that requires cross-squad comparison', 'Confirmed no', 'Not applicable'], 1, 'the VeilStream subscriber return'),
        mc('What should your squad flag for financial follow-up?', ['Nothing new', "The wallet ID, for comparison against other squads' financial threads", 'The POS summary', 'The ransom note only'], 1, 'the VeilStream subscriber return'),
      ],
      blanks: [
        blank("The wallet tied to today's VeilStream payment is ______.", ['PACT{PLACEHOLDER-w2}'], 'the VeilStream subscriber return'),
        blank('Confirming whether this wallet appears elsewhere in the case requires a ______.', ['cross-squad sync'], 'the VeilStream subscriber return'),
      ],
      shortAnswer: prompt("Why can't your squad alone determine whether this wallet is significant across the whole case?", ["Your squad only sees Pixel Play's thread", 'Determining whether this wallet recurs elsewhere requires comparing notes with the other three squads']),
    },
    {
      code: 'SOS', label: 'Staff Operations/Tactical Specialist', roleFilter: 'operational_support_sos',
      task: `Update the tracker and prepare today's cross-squad sync summary for Pixel Play.`,
      mc: [
        mc('What shared return did your squad receive today, in common with another squad?', ['The Ozark Valley Bank return', 'The VeilStream subscriber return', 'The Northwind ISP return', 'The Dogwood tenant audit'], 1, "today's evidence"),
        mc('Which other squad likely received the same VeilStream return?', ['Squad CyberDyne', 'Squad Dogwood', 'Squad Redstone Memorial', 'No other squad'], 2, "today's evidence"),
        mc('Why would two squads receive the same return?', ['A mistake in distribution', "Because it names an IP shared by both victims' logs", 'Random assignment', "It shouldn't happen"], 1, "today's evidence"),
      ],
      blanks: [
        blank("Your squad and ______ squad should compare notes on the VeilStream return at today's sync.", ['Redstone Memorial'], "today's evidence"),
        blank('The registration email on the VeilStream return is ______.', ['d.kort92@protonrelay.example'], 'the VeilStream subscriber return'),
      ],
      shortAnswer: prompt("Draft your one-paragraph cross-squad sync summary for Pixel Play's thread.", ['Mentions the VeilStream return (subscriber ID/email/wallet)', 'Mentions the arcade_support dormancy pattern', 'Mentions the RestonIT/SOS record finding']),
    },
    {
      code: 'TFO', label: 'Task Force Officer', roleFilter: 'task_force_officer',
      task: `Check local records for Pixel Play's thread and maintain custody of today's returns.`,
      mc: [
        mc('What local report already exists for Pixel Play, from Day 1?', ['None', 'A Huntsville PD report filed by the owner', 'A federal complaint', 'A state audit'], 1, "Pixel Play's records"),
        mc('What is your task today regarding that local report?', ['Nothing further', "Confirm with Huntsville PD there's no parallel investigation affecting today's new returns", 'Close the local report entirely', 'Ignore it now that federal evidence exists'], 1, "today's returns"),
        mc("How should today's VeilStream and SOS returns be logged?", ['Informally, no log needed', 'With source, date received, and how obtained', 'Only if they mention Pixel Play by name', 'Only after Thursday'], 1, "today's returns"),
      ],
      blanks: [
        blank("Pixel Play's existing local police report number is ______.", ['2026-05123'], "Pixel Play's records"),
        blank('A negative result on any further local check should still be ______.', ['logged'], "today's returns"),
      ],
      shortAnswer: prompt('What would you report at the cross-squad sync regarding local/liaison matters for Pixel Play?', ['Confirmation of no parallel local investigation', 'Readiness to compare custody logs with other squads if evidence needs to be cross-referenced']),
    },
    {
      code: 'CS', label: 'Computer Scientist', roleFilter: 'cyber_analyst',
      task: "Technically review arcade_support's permissions and VeilStream's logging limitations.",
      mc: [
        mc('What group memberships does arcade_support hold that exceed typical support-account needs?', ["None, it's a standard account", 'Administrators and Remote Desktop Users', 'Guest only', 'Read-only auditor'], 1, 'the local account-creation export'),
        mc('What does "real-source logging minimal (anonymized upstream)" mean about the VeilStream return?', ["VeilStream fully identifies the original user's IP", "The VPN's own logs don't reveal the user's true originating IP", 'There are no logs at all', 'The account was never used'], 1, 'the VeilStream subscriber return'),
        mc("What technical follow-up would help even without VeilStream's own logs?", ['Nothing further is possible', "Comparing the account-creation tool signature against other victims' account-creation records", 'A ransom note analysis', 'A local PD interview'], 1, "today's evidence"),
      ],
      blanks: [
        blank("arcade_support's permissions include Administrators and ______ Users.", ['Remote Desktop'], 'the local account-creation export'),
        blank("VeilStream's own logging of the true originating IP is described as ______.", ['minimal'], 'the VeilStream subscriber return'),
      ],
      shortAnswer: prompt("Given VeilStream's limited logging, what other technical avenue remains for identifying who used this VPN connection?", ['The registration email', 'Wallet', 'Any tool-signature comparisons across victims remain viable technical/financial avenues']),
    },
  ],
  squadQuiz: [
    mc('What subscriber ID and email are tied to the VeilStream VPN account?', ['BH-0314 / amr.secure@protonrelay.example', 'VS-88213 / d.kort92@protonrelay.example', 'RMM-4.7 / t.whitlock@dogwoodhotel.example', 'VS-61203 / brkr_al@protonrelay.example'], 1, "today's evidence"),
    mc('What is the dormancy gap for arcade_support, creation to intrusion?', ['About 2 months', 'About 9 months', 'About 18 months', 'Same day'], 1, "today's evidence"),
    mc('Which other squad should you compare notes with regarding the VeilStream return?', ['CyberDyne', 'Dogwood', 'Redstone Memorial', 'None'], 2, "today's evidence"),
    mc('What does the Alabama SOS record establish about RestonIT?', ["It's confirmed as the intruder", 'A named principal, Alex M. Reston — a neutral entity fact', 'It has no relationship to Pixel Play', 'It was dissolved'], 1, "today's evidence"),
    mc("What's the most defensible characterization of today's findings?", ['The case against RestonIT is proven', 'A named VPN subscription and wallet behind the intrusion IP, plus a confirmed provisioning identity — not yet an established actor', 'The case is closed', 'VeilStream is confirmed uninvolved'], 1, "today's evidence"),
  ],
};

/* ── Redstone Memorial Hospital ─────────────────────────────────────────── */
const REDSTONE = {
  code: 'REDSTONE',
  name: 'Redstone Memorial Hospital',
  roles: [
    {
      code: 'SA', label: 'Special Agent', roleFilter: 'special_agent',
      task: `Review the Alabama Secretary of State return and decide whether it changes your squad's posture toward RestonIT's PO history.`,
      mc: [
        mc('What does the Alabama SOS record establish?', ['RestonIT is the intruder', "Alex M. Reston is RestonIT's principal", 'RestonIT was dissolved', 'No vendor relationship exists'], 1, 'the Alabama SOS return'),
        mc("RestonIT appeared in which of Redstone Memorial's Day 1 records?", ['The HIPAA memo', 'The vendor PO history', 'The helpdesk thread', 'The EDR alert'], 1, "Redstone Memorial's records"),
        mc('What work did RestonIT perform for Redstone Memorial, per that PO history?', ['Full network redesign', '"Network support — imaging wing project"', 'Payroll services', 'Building maintenance'], 1, 'the vendor PO history'),
      ],
      blanks: [
        blank("RestonIT LLC's principal is ______.", ['Alex M. Reston'], 'the Alabama SOS return'),
        blank('RestonIT\'s engagement with Redstone Memorial covered the ______ wing.', ['imaging'], 'the vendor PO history'),
      ],
      shortAnswer: prompt('Does the imaging-wing engagement take on new significance now that a named principal exists? Explain your reasoning.', ["It's now attached to a real person, worth flagging for cross-squad comparison", "A vendor engagement alone still isn't evidence of wrongdoing at Redstone Memorial specifically"]),
    },
    {
      code: 'IA', label: 'Intelligence Analyst', roleFilter: 'intelligence_analyst',
      task: `Review the VoIP provider return for the burner account tied to the vishing call.`,
      mc: [
        mc('What registration email is tied to the burner VoIP account?', ['amr.secure@protonrelay.example', 'd.kort92@protonrelay.example', 'brkr_al@protonrelay.example', 't.whitlock@dogwoodhotel.example'], 1, 'the VoIP provider return'),
        mc('When was the burner VoIP account created?', ['June 6', 'July 6', 'May 6', 'August 6'], 1, 'the VoIP provider return'),
        mc('What calls do the CDRs show?', ['Only internal hospital calls', "A call to nurse Danielle Osei and a call to RMH's remote-portal help line", 'Calls to law enforcement', 'No calls at all'], 1, 'the VoIP provider return'),
      ],
      blanks: [
        blank('The burner VoIP account is tied to DID ______.', ['256-555-0147'], 'the VoIP provider return'),
        blank("This registration email is the same one found on your own squad's other Day 2 return, the ______ return.", ['VeilStream (subscriber)', 'VeilStream'], 'the VoIP provider return'),
      ],
      shortAnswer: prompt('You now have two Day 2 returns — the VoIP return and the VeilStream return — that share a registration email your own squad can see independently. State the shared email and why finding this WITHIN your own evidence, without another squad\'s help, is notable.', ['d.kort92@protonrelay.example ties the burner VoIP account to the VeilStream VPN account', 'A correlation your squad can make entirely on its own, unlike the shared-IP correlation with Pixel Play, which requires the cross-squad sync']),
    },
    {
      code: 'DA', label: 'Data Analyst', roleFilter: 'operational_support_da',
      task: `Parse the Redstone Memorial AD account export for svc_backup_rst.`,
      mc: [
        mc('When was svc_backup_rst created?', ['2025-09-18', '2025-10-15', '2025-11-12', '2026-07-30'], 0, 'the AD account export'),
        mc('Who created it, per the export?', ['IT staff', 'RMH\\rmm_admin', 'The nurse', 'An external auditor'], 1, 'the AD account export'),
        mc('What group memberships does it hold?', ['Standard user only', 'Backup Operators plus a domain-admin-adjacent group', 'Guest', 'Read-only'], 1, 'the AD account export'),
      ],
      blanks: [
        blank('The account\'s last logon — the anomalous use — was on ______.', ['2026-07-30'], 'the AD account export'),
        blank('The dormancy gap for this account is approximately ______ months.', ['10.4 (about ten)', '10.4', 'about ten', 'ten'], 'the AD account export'),
      ],
      shortAnswer: prompt("Quantify this account's dormancy pattern in a sentence usable in tomorrow's package.", ['svc_backup_rst sat dormant roughly ten months between provisioning (Sept 2025) and its anomalous use in the July 2026 detection event', 'The longest dormancy of the three provisioned accounts found so far']),
    },
    {
      code: 'FoA', label: 'Forensic Accountant', roleFilter: 'forensic_accountant',
      task: `Assess the financial angle for RMH given today's returns.`,
      mc: [
        mc('Does the VoIP return show how the burner account was paid for?', ['Yes, by wire transfer', "The return centers on registration/CDR details; payment-method specifics aren't the focus", 'Cash only', "It wasn't paid for"], 1, 'the VoIP provider return'),
        mc("What financial detail DOES exist in your squad's Day 2 evidence?", ['A confirmed loss figure for RMH', 'The wallet used to pay for the related VeilStream VPN subscription', 'A ransom demand', 'A wire confirmation'], 1, 'the VeilStream subscriber return'),
        mc("Why is that wallet relevant to your squad even though it's on a VeilStream return, not a hospital financial record?", ["It isn't relevant", "It's tied to the same external IP found in your own victim's auth log", "It's unrelated padding", 'It proves the hospital lost money'], 1, 'the VeilStream subscriber return'),
      ],
      blanks: [
        blank("The wallet used for the VeilStream subscription tied to your victim's IP is ______.", ['PACT{PLACEHOLDER-w2}'], 'the VeilStream subscriber return'),
        blank("Confirming this wallet's broader significance requires comparing notes at the ______.", ['cross-squad sync'], 'the VeilStream subscriber return'),
      ],
      shortAnswer: prompt("Explain why Redstone Memorial's financial picture is different in kind from Dogwood's, based on what you've seen so far.", ['Dogwood has direct fraud/wire-transfer losses', "Redstone Memorial's financial thread so far is indirect — a wallet tied to VPN infrastructure used in the intrusion, not a direct loss to the hospital"]),
    },
    {
      code: 'SOS', label: 'Staff Operations/Tactical Specialist', roleFilter: 'operational_support_sos',
      task: `Update the tracker and prepare today's cross-squad sync summary for Redstone Memorial.`,
      mc: [
        mc('Which other squad likely received the same VeilStream return as yours?', ['CyberDyne', 'Pixel Play', 'Dogwood', 'No other squad'], 1, "today's evidence"),
        mc("What two registration identifiers can your OWN squad already tie together, without another squad's help?", ['A wallet and a bank account', 'An email address shared between the VoIP and VeilStream returns', 'A phone number and a badge number', 'Nothing can be tied together yet'], 1, "today's evidence"),
        mc('What should you prepare to share at today\'s sync?', ['Nothing', "The shared email you found, plus your victim's shared IP for comparison against Pixel Play's findings", 'Only the HIPAA memo', 'A completed charging document'], 1, "today's evidence"),
      ],
      blanks: [
        blank('The email common to your own two Day 2 returns is ______.', ['d.kort92@protonrelay.example'], "today's evidence"),
        blank("The IP your squad should compare against Pixel Play's findings is ______.", ['203.0.113.61'], "today's evidence"),
      ],
      shortAnswer: prompt("Draft your one-paragraph cross-squad sync summary for Redstone Memorial's thread.", ['Mentions the shared registration email (self-discovered)', 'Mentions the account dormancy figures', 'Mentions the RestonIT vendor tie', 'Explicitly flags the shared IP for comparison with Pixel Play']),
    },
    {
      code: 'TFO', label: 'Task Force Officer', roleFilter: 'task_force_officer',
      task: `Follow up on witness leads and maintain custody of today's returns.`,
      mc: [
        mc("What subpoena outcome gave you the nurse's vishing-call details?", ['A local PD report', 'A VoIP provider subpoena on the preserved DID', 'A bank subpoena', 'A search warrant'], 1, 'the VoIP provider return'),
        mc("What should you do with nurse Danielle Osei as a witness, given today's VoIP return?", ['Nothing further needed', "Consider a follow-up interview now that the caller's registration details are known", 'Refer her to HR', 'Close her out as a witness'], 1, "today's evidence"),
        mc("How should today's returns be logged for custody?", ['Informally', 'With source, date received, and how obtained', 'Only if RMH is named directly', 'Not until Thursday'], 1, "today's returns"),
      ],
      blanks: [
        blank('The nurse who received the vishing call is ______.', ['Danielle Osei'], 'the VoIP provider return'),
        blank('A negative result on any local-records check should still be ______.', ['logged'], "today's returns"),
      ],
      shortAnswer: prompt('What follow-up interview question would you now ask Nurse Osei, given what the VoIP return reveals?', ["E.g., ask her to describe anything else about the caller's voice, claimed identity, or specific questions asked", 'Now knowing the call was part of a broader reconnaissance effort tied to a registered burner account']),
    },
    {
      code: 'CS', label: 'Computer Scientist', roleFilter: 'cyber_analyst',
      task: "Technically compare svc_backup_rst's creation signature against the broader pattern.",
      mc: [
        mc("What group memberships make svc_backup_rst's permissions excessive for a routine backup account?", ["None, it's standard", 'Backup Operators plus a domain-admin-adjacent group', 'Guest only', 'Read-only auditor'], 1, 'the AD account export'),
        mc('What creator identity is logged for this account?', ['IT staff', 'RMH\\rmm_admin', 'The nurse', 'An external vendor with a different name'], 1, 'the AD account export'),
        mc("How does this creator identity format compare to Pixel Play's and Dogwood's?", ['Completely unrelated', 'Same underlying principal, different naming convention', 'Identical string in all three', 'No comparison is possible'], 1, "today's evidence"),
      ],
      blanks: [
        blank("This account's creator is recorded as ______ (domain-qualified format).", ['RMH\\rmm_admin'], 'the AD account export'),
        blank("All three accounts' permission sets share the trait of being ______ for what a routine support account should need.", ['over-permissioned'], "today's evidence"),
      ],
      shortAnswer: prompt('What technical artifact, not yet available, would let you prove these three accounts were created by the same automated tool rather than three separate manual actions?', ['A consistent tool/agent signature in creation logs', "Which Wednesday's appliance session log will show as RMM-Agent/4.7, tying back to this identity's activity"]),
    },
  ],
  squadQuiz: [
    mc("What registration email ties together your squad's own VoIP and VeilStream returns?", ['amr.secure@protonrelay.example', 'd.kort92@protonrelay.example', 'brkr_al@protonrelay.example', 't.whitlock@dogwoodhotel.example'], 1, "today's evidence"),
    mc("What is svc_backup_rst's dormancy gap, creation to anomalous use?", ['About 2 months', 'About 10 months', 'About 18 months', 'Same day'], 1, "today's evidence"),
    mc('Which other squad should you compare the shared IP 203.0.113.61 with?', ['CyberDyne', 'Dogwood', 'Pixel Play', 'None'], 2, "today's evidence"),
    mc("What is Redstone Memorial's financial thread so far, relative to Dogwood's?", ['Identical direct wire losses', 'Indirect — a wallet tied to VPN infrastructure, not a direct hospital loss', 'No financial thread exists', 'A confirmed ransom payment'], 1, "today's evidence"),
    mc("What's the most defensible characterization of today's findings?", ['RestonIT is confirmed as the intruder', 'A self-correlated buyer-side identity (shared email across two returns) plus a long-dormant provisioned account — not yet an established actor', 'The case is closed', 'Danielle Osei is a suspect'], 1, "today's evidence"),
  ],
};

const VICTIMS = [CYBERDYNE, DOGWOOD, PIXELPLAY, REDSTONE];

/* ── Cross-Squad Sync ("The Pattern — All Four Squads Together") ───────── */
const CROSS_SQUAD_SYNC_TITLE = `${TITLE_PREFIX} Cross-Squad Sync — "The Pattern"`;
const CROSS_SQUAD_SYNC_DESCRIPTION = `All four squads together, after each squad has finished its individual Day 2 role work: each squad shares its one-paragraph summary aloud, then the group answers as one combined body, pooling all four squads' findings. Cannot be answered from any single squad's evidence alone.`;
const CROSS_SQUAD_SYNC_QUIZ = [
  mc('Which two victims share the exact same external IP (203.0.113.61) in their Day 1 technical logs?', ['CyberDyne and Dogwood', 'Pixel Play and Redstone Memorial', 'Dogwood and Redstone Memorial', 'CyberDyne and Pixel Play'], 1, "all four squads' Day 1 technical logs"),
  mc('What single registration email appears across the VeilStream and VoIP returns (and indirectly, the lookalike-domain wallet)?', ['amr.secure@protonrelay.example', 'd.kort92@protonrelay.example', 'brkr_al@protonrelay.example', 'A different email for each'], 1, "today's returns"),
  mc('What provisioning identity created a dormant, over-permissioned account or service at three separate victims (Redstone Memorial, Pixel Play, Dogwood)?', ['Marcus Iyer', 'rmm_admin (in three formats)', 'D. Voss', 'Alex Reston, by name'], 1, "today's returns"),
  mc('What wallet is shared between the VeilStream VPN payment and the lookalike-domain registration payment?', ['w1', 'w2', 'w3', 'No shared wallet exists'], 1, "today's returns"),
  mc('Which victim\'s evidence does NOT yet show a dormant rmm_admin-provisioned account with a clear malicious-use date?', ['Pixel Play', 'Dogwood', 'Redstone Memorial', 'CyberDyne'], 3, "today's returns"),
  mc('What entity appears as a vendor across all four victims\' records, now tied to a named principal?', ['Meridian Claims Services', 'RestonIT LLC', 'Northwind Datacenters', 'Ozark Valley Bank'], 1, "today's returns"),
  mc("What foreign country is implicated only in CyberDyne's thread so far?", ['Estonia', 'Romania', 'Ireland', 'Netherlands'], 0, "today's returns"),
  mc('As a combined group, what is the single most defensible statement about the four victims after today?', ['They are confirmed to be the work of one actor named Alex Reston', 'They are tied together by a shared vendor, a shared provisioning identity, a shared registration email, and a shared wallet — strong correlation, but no named actor is yet confirmed by any file', 'No connection of any kind exists', 'The case should be closed as unrelated incidents'], 1, "today's returns"),
];

function buildRoleQuestions(role) {
  const items = [...role.mc, ...role.blanks];
  if (role.dualBlankPrompt) items.push(role.dualBlankPrompt);
  items.push(role.shortAnswer);
  return items;
}

// One spec per assignment to create, in insertion order. grading_mode alone
// decides who a submission/grade belongs to: role assessments are individual,
// the squad quizzes and the cross-squad sync are squad. The cross-squad sync
// isn't victim-scoped (victimCode/victimName null, roleFilters empty) — see
// the file header for why it's still modeled as one grading_mode:'squad'
// assignment rather than a new "cohort-wide" concept.
function buildAssignmentSpecs() {
  const specs = [];
  for (const victim of VICTIMS) {
    for (const role of victim.roles) {
      specs.push({
        kind: 'role',
        title: `${TITLE_PREFIX} ${victim.name} — ${role.code} (${role.label})`,
        description: `${role.label} individual assessment for ${victim.name}: ${role.task}`,
        victimCode: victim.code,
        victimName: victim.name,
        roleFilters: [role.roleFilter],
        gradingMode: 'individual',
        questions: buildRoleQuestions(role),
      });
    }
    specs.push({
      kind: 'squad_quiz',
      title: `${TITLE_PREFIX} ${victim.name} — Squad Quiz`,
      description: `Squad quiz for ${victim.name} — complete together after every role has finished its individual assessment. Scope: your victim only.`,
      victimCode: victim.code,
      victimName: victim.name,
      roleFilters: [],
      gradingMode: 'squad',
      questions: victim.squadQuiz,
    });
  }
  specs.push({
    kind: 'cross_squad_sync',
    title: CROSS_SQUAD_SYNC_TITLE,
    description: CROSS_SQUAD_SYNC_DESCRIPTION,
    victimCode: null,
    victimName: null,
    roleFilters: [],
    gradingMode: 'squad',
    questions: CROSS_SQUAD_SYNC_QUIZ,
  });
  return specs;
}

module.exports = { SCENARIO, DROP, TITLE_PREFIX, VICTIMS, buildRoleQuestions, buildAssignmentSpecs };
