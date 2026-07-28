/**
 * LAIR "The Vendor Kickback" — advanced non-linear investigation, rendered
 * by InvestigationGame.jsx with commandSet="advanced". Original content
 * written for this course (same standing rule as every other game/case in
 * this project — see project memory: clmystery was never read or
 * reproduced). Unlike The Locked Lab (basic command set), this case is
 * deliberately built so single-command grep/cat isn't enough — the anomaly
 * only surfaces via piping commands together.
 */
import { dir, file } from '../utils/shellLex.js';

export const HOSTNAME = 'finance-srv02';
export const USER = 'auditor';

export const CULPRIT = 'kim';
export const CULPRIT_ALIASES = ['renata kim', 'renata', 'kim', 'rkim'];

function buildTransactions() {
  const rows = [
    ['1', 'Northbridge Supplies', '1200', 'dalvarado', 'APPROVED'],
    ['2', 'Alpine Logistics', '3400', 'dalvarado', 'APPROVED'],
    ['3', 'Meridian Fabrication Co', '9800', 'rkim', 'APPROVED'],
    ['4', 'Crestview Consulting', '500', 'dalvarado', 'APPROVED'],
    ['5', 'Harbor Print Co', '220', 'dalvarado', 'APPROVED'],
    ['6', 'Meridian Fabrication Co', '9650', 'rkim', 'APPROVED'],
    ['7', 'Northbridge Supplies', '1800', 'dalvarado', 'APPROVED'],
    ['8', 'Alpine Logistics', '2900', 'dalvarado', 'APPROVED'],
    ['9', 'Meridian Fabrication Co', '9700', 'rkim', 'APPROVED'],
    ['10', 'Crestview Consulting', '650', 'dalvarado', 'APPROVED'],
    ['11', 'Harbor Print Co', '310', 'dalvarado', 'APPROVED'],
    ['12', 'Meridian Fabrication Co', '9500', 'rkim', 'APPROVED'],
    ['13', 'Northbridge Supplies', '2100', 'dalvarado', 'APPROVED'],
    ['14', 'Meridian Fabrication Co', '9900', 'rkim', 'APPROVED'],
    ['15', 'Alpine Logistics', '3100', 'dalvarado', 'APPROVED'],
    ['16', 'Crestview Consulting', '480', 'dalvarado', 'APPROVED'],
    ['17', 'Meridian Fabrication Co', '9750', 'rkim', 'APPROVED'],
    ['18', 'Harbor Print Co', '275', 'dalvarado', 'APPROVED'],
    ['19', 'Northbridge Supplies', '1950', 'dalvarado', 'APPROVED'],
    ['20', 'Alpine Logistics', '2700', 'dalvarado', 'APPROVED'],
  ];
  return ['id,vendor,amount,approver,status', ...rows.map((r) => r.join(','))].join('\n');
}

function buildAuditLog(days) {
  const lines = [];
  for (let i = 1; i <= days; i++) {
    const day = String(i).padStart(2, '0');
    lines.push(`2026-06-${day} 09:00 finance-srv02 audit: nightly reconciliation OK`);
  }
  return lines.join('\n');
}

function buildFinanceAccessLog() {
  const users = ['dalvarado', 'okoye', 'bhatt'];
  const lines = [];
  for (let i = 0; i < 40; i++) {
    const u = users[i % users.length];
    const day = String(1 + (i % 28)).padStart(2, '0');
    const hh = String(8 + (i % 9)).padStart(2, '0');
    lines.push(`2026-06-${day} ${hh}:15 LOGIN user=${u} src=office-vpn`);
  }
  lines.push('2026-06-19 23:41 LOGIN user=rkim src=home-vpn');
  lines.push('2026-06-19 23:52 LOGOUT user=rkim');
  return lines.join('\n');
}

export const TREE = dir({
  'case-file': dir({
    'brief.txt': file(
      'An anonymous tip claims someone in Finance has been approving inflated invoices from a shell ' +
      'vendor and pocketing the difference. Nothing has been formally flagged — the automated review ' +
      'threshold is $10,000, and every relevant invoice has come in just under it.\n\n' +
      'Four people have access to this system: R. Kim (Finance Controller, approval authority), ' +
      'D. Alvarado (AP Clerk, routine approvals only), S. Okoye (IT — maintains the automated review ' +
      'script), P. Bhatt (external auditor, reviewing the books this quarter).\n\n' +
      'You have shell access as auditor. Nothing is locked behind a fixed order — explore, cross-' +
      'reference, and use the right tools for the job. A single grep won\'t show you a pattern across ' +
      'hundreds of transactions; you\'ll need to combine commands. When you\'re confident, run: ' +
      'accuse <last name>\n'
    ),
    'evidence_board.txt': file(
      'Working checklist:\n' +
      '  [ ] Does any vendor show up suspiciously often in the transaction log?\n' +
      '  [ ] Who approves that vendor\'s invoices?\n' +
      '  [ ] Has the automated review script been changed? Compare it to a backup.\n' +
      '  [ ] Do the audit logs agree with each other? Count them.\n' +
      '  [ ] When was the script actually last modified, and who was logged in then?\n'
    ),
  }),

  transactions: dir({
    'transactions.csv': file(buildTransactions()),
  }),

  scripts: dir({
    'approval_check_backup.sh': file(
      '#!/bin/sh\n' +
      '# Flags any vendor invoice over $10,000 for manual review\n' +
      'THRESHOLD=10000\n' +
      'for invoice in "$@"; do\n' +
      '  amount=$(get_amount "$invoice")\n' +
      '  if [ "$amount" -gt "$THRESHOLD" ]; then\n' +
      '    flag_for_review "$invoice"\n' +
      '  fi\n' +
      'done\n',
      { mtime: 'May 02 09:00' }
    ),
    'approval_check_current.sh': file(
      '#!/bin/sh\n' +
      '# Flags any vendor invoice over $10,000 for manual review\n' +
      'THRESHOLD=10000\n' +
      'for invoice in "$@"; do\n' +
      '  amount=$(get_amount "$invoice")\n' +
      '  if [ "$amount" -gt "$THRESHOLD" ] && [ "$(get_vendor "$invoice")" != "Meridian Fabrication Co" ]; then\n' +
      '    flag_for_review "$invoice"\n' +
      '  fi\n' +
      'done\n',
      { mtime: 'Jun 19 23:47' }
    ),
  }),

  'vendor-records': dir({
    'vendor_registry.txt': file(
      'Northbridge Supplies — registered 2019, office supplies, standard net-30 terms.\n' +
      'Alpine Logistics — registered 2018, shipping/freight, standard net-30 terms.\n' +
      'Crestview Consulting — registered 2021, business consulting, standard net-15 terms.\n' +
      'Harbor Print Co — registered 2017, print services, standard net-30 terms.\n' +
      'Meridian Fabrication Co — registered 2026-04, fabrication services. See individual file for ' +
      'contact details.\n'
    ),
    'meridian_fabrication_co.txt': file(
      'Meridian Fabrication Co — registered April 2026, no prior invoice history before this quarter. ' +
      'Internal sponsor of record: R. Kim. No physical site visit on file. Payment terms: net-10 ' +
      '(unusually fast for a new vendor).\n'
    ),
  }),

  'system-logs': dir({
    'finance_server_access.log': file(buildFinanceAccessLog()),
    'audit_log_full.txt': file(buildAuditLog(40), { mtime: 'Jun 30 23:59' }),
    'audit_log_current.txt': file(buildAuditLog(28), { mtime: 'Jun 30 23:59' }),
  }),

  personnel: dir({
    'kim_renata.txt': file('R. Kim — Finance Controller, 5 years. Sole approval authority above $5,000.\n'),
    'alvarado_diego.txt': file('D. Alvarado — AP Clerk, 3 years. Approval authority up to $5,000 only.\n'),
    'okoye_sam.txt': file('S. Okoye — IT, 4 years. Maintains the automated invoice review script; no approval authority.\n'),
    'bhatt_priya.txt': file('P. Bhatt — External Auditor, engaged this quarter for the annual review. No system approval authority.\n'),
  }),

  interviews: dir({
    'kim.txt': file(
      'R. Kim: "I approve a lot of invoices, I couldn\'t tell you every vendor off the top of my head. ' +
      'I was out sick that whole week in June, barely touched my laptop. Whatever changed on that ' +
      'script, it wasn\'t me sitting at this desk making it happen."\n'
    ),
    'alvarado.txt': file(
      'D. Alvarado: "Anything over five grand goes to Renata automatically, I don\'t even see those ' +
      'ones. I just process the routine stuff — office supplies, shipping, the usual vendors."\n'
    ),
    'okoye.txt': file(
      'S. Okoye: "Renata asked me back in June to \'simplify\' the review script, said it was flagging ' +
      'too many false positives and slowing things down. I didn\'t ask a lot of questions, she\'s the ' +
      'controller, I just made the change she described and pushed it."\n'
    ),
    'bhatt.txt': file(
      'P. Bhatt: "Something about Meridian Fabrication Co caught my eye a few weeks into the review — ' +
      'brand new vendor, no site visit, unusually fast payment terms, and Renata\'s name on the ' +
      'registration as internal sponsor. I flagged it for follow-up but hadn\'t escalated yet."\n'
    ),
  }),
});

/** File paths (relative to the auditor's home) whose contents actually matter for solving the case. */
export const KEY_EVIDENCE = [
  'case-file/brief.txt',
  'transactions/transactions.csv',
  'scripts/approval_check_backup.sh',
  'scripts/approval_check_current.sh',
  'vendor-records/meridian_fabrication_co.txt',
  'system-logs/finance_server_access.log',
  'system-logs/audit_log_full.txt',
  'system-logs/audit_log_current.txt',
  'interviews/kim.txt',
  'interviews/bhatt.txt',
];

export const HINTS = [
  'Start with case-file/brief.txt, then look at transactions/transactions.csv directly.',
  'A single grep won\'t reveal a frequency pattern across hundreds of rows. Try piping: grep "APPROVED" transactions.csv | cut -d, -f2 | sort | uniq -c | sort -rn',
  'Once you know which vendor stands out, filter the transactions for just that vendor and cut out the approver field the same way.',
  'Compare the two versions of the review script with diff scripts/approval_check_backup.sh scripts/approval_check_current.sh',
  'wc -l both audit log files and compare the counts — one is missing a chunk of entries.',
  'stat the current script to see when it was really last modified, then check who was logged in at that exact time.',
  'When you\'re confident, run: accuse <last name>',
];
