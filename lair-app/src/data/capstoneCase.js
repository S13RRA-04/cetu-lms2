/**
 * LAIR capstone — "Operation Quiet Ledger". Original content written for
 * this course (same standing rule as every other case in this project).
 * Rendered by InvestigationGame.jsx (reused, not reimplemented) inside
 * CapstoneCase.jsx's terminal panel.
 *
 * Evidence unlocks in three tiers, each gated by its own legal-process
 * request in sequence (see backend/src/services/legalRequest.service.js's
 * PROCESS_TYPES — the order and unlocksEvidence paths there must stay in
 * sync with the trees below):
 *   BASE_TREE           — always available: the workstation owner's own
 *                          consented log review, no process needed.
 *   SUBPOENA_TREE        — unlocked once the grand jury subpoena
 *                          (relevance) is approved.
 *   ORDER_2703D_TREE     — unlocked once the §2703(d) order (specific and
 *                          articulable facts) is approved.
 *   RESIDENCE_TREE       — unlocked once the search warrant (probable
 *                          cause) is approved.
 *
 * CASE_BRIEF in backend/src/services/legalRequest.service.js is a hand-kept
 * copy of the facts below, used to prompt the AUSA persona — keep both in
 * sync if this narrative changes.
 */
import { dir, file } from '../utils/shellLex.js';

export const HOSTNAME = 'contractor-ws04';
export const USER = 'analyst';

export const CULPRIT = 'reyes';
export const CULPRIT_ALIASES = ['daniel reyes', 'daniel', 'reyes', 'dreyes'];

function buildConnLog() {
  const lines = [];
  for (let i = 1; i <= 6; i++) {
    const day = String(9 + i * 3).padStart(2, '0');
    lines.push(`2026-07-${day} 23:5${i} contractor-ws04 outbound: dst=185.220.101.${40 + i} port=443 proto=tls bytes=48213211`);
  }
  return lines.join('\n');
}

function buildAuthLog() {
  const lines = [];
  for (let i = 1; i <= 6; i++) {
    const day = String(9 + i * 3).padStart(2, '0');
    lines.push(`2026-07-${day} 23:4${i} contractor-ws04 LOGIN user=dreyes src=console`);
    lines.push(`2026-07-${day} 23:4${i + 2} contractor-ws04 bash: cp -r /srv/clients/meridian /home/dreyes/.cache/.sync/`);
    lines.push(`2026-07-${day} 23:5${i} contractor-ws04 LOGOUT user=dreyes`);
  }
  return lines.join('\n');
}

export const BASE_TREE = dir({
  'case-file': dir({
    'brief.txt': file(
      'The owner of this contractor workstation noticed unexpected data-usage spikes overnight and ' +
      'consented to a full review of the machine\'s own logs — no legal process is needed for that, it\'s ' +
      'his own equipment. You have shell access as analyst. Review connection logs, auth logs, and the ' +
      'staged-file evidence below, then use the Legal Process panel to request whatever comes next once ' +
      'you can articulate why it\'s needed. Anything beyond this machine\'s own records — who controls the ' +
      'external IP, their communications, their home — is outside the company\'s own records and requires ' +
      'its own legal process, escalating step by step. Nothing further exists until each step is approved.\n'
    ),
    'personnel_note.txt': file(
      'Two employees have console access to this workstation after hours: Daniel Reyes (junior analyst, ' +
      'started 4 months ago) and the shift lead, Marcus Webb (badge access only, no login history on this ' +
      'box in the period reviewed).\n'
    ),
  }),

  'system-logs': dir({
    'outbound_connections.log': file(buildConnLog()),
    'auth_and_commands.log': file(buildAuthLog()),
  }),

  evidence: dir({
    'staged_files_manifest.txt': file(
      'Recovered from /home/dreyes/.cache/.sync/ (hidden, owner-readable only): a nightly-refreshed copy ' +
      'of /srv/clients/meridian, matching the timestamps in auth_and_commands.log within minutes of each ' +
      'outbound connection.\n'
    ),
  }),
});

export const SUBPOENA_TREE = dir({
  'subpoena-returns': dir({
    'isp_subscriber_info.txt': file(
      'Subscriber records returned for the external IP: it resolves to a personal cloud-storage account, ' +
      'not a corporate one. That distinction matters — it\'s outside the workstation owner\'s own consent ' +
      'and outside the company\'s own records entirely, which is exactly why this required its own legal ' +
      'process rather than just being pulled from the workstation.\n'
    ),
  }),
});

export const ORDER_2703D_TREE = dir({
  'comms-metadata': dir({
    'email_header_log.txt': file(
      'Non-content header metadata (sender/recipient/timestamp only, no message bodies) for that account, ' +
      'covering the same window as the workstation\'s own logs. The login timestamps on this account line ' +
      'up with the outbound connection log almost to the minute, each of the six occasions.\n'
    ),
  }),
});

export const RESIDENCE_TREE = dir({
  'post-warrant': dir({
    'residence-search.txt': file(
      'Search of the residence executed under warrant. A personal laptop and an external drive were ' +
      'located in a desk drawer, both powered on and connected to the home network at the time of entry.\n'
    ),
    'seized-devices.txt': file(
      'Seized: 1x personal laptop (matches MAC address seen initiating the outbound TLS sessions), 1x ' +
      'external USB drive containing a full copy of /srv/clients/meridian identical to the staged-files ' +
      'manifest, hash-verified.\n'
    ),
  }),
});

/** File paths (relative to the analyst's home) whose contents count toward case progress. */
export const KEY_EVIDENCE = [
  'case-file/brief.txt',
  'case-file/personnel_note.txt',
  'system-logs/outbound_connections.log',
  'system-logs/auth_and_commands.log',
  'evidence/staged_files_manifest.txt',
  'subpoena-returns/isp_subscriber_info.txt',
  'comms-metadata/email_header_log.txt',
  'post-warrant/residence-search.txt',
  'post-warrant/seized-devices.txt',
];

export const HINTS = [
  'Start with case-file/brief.txt, then case-file/personnel_note.txt.',
  'Compare system-logs/outbound_connections.log timestamps against system-logs/auth_and_commands.log.',
  'evidence/staged_files_manifest.txt explains what was actually being exfiltrated.',
  'The external IP itself is outside the company\'s own records — use the Legal Process panel to request ' +
  'whatever comes next, one step at a time.',
  'Each approved request unlocks the next tier of evidence — review it before requesting the next step.',
  'Once every step is granted and reviewed, run: accuse <last name>',
];
