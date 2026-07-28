/**
 * LAIR capstone — "Operation Quiet Ledger" (vertical slice v1). Original
 * content written for this course (same standing rule as every other
 * case in this project). Rendered by InvestigationGame.jsx (reused, not
 * reimplemented) inside CapstoneCase.jsx's terminal panel.
 *
 * BASE_TREE is everything the analyst may lawfully review from the start —
 * the workstation owner's own consented log review, no warrant needed.
 * POST_WARRANT_TREE is only merged in once the backend's legal_requests
 * gate approves the residence search warrant (see legalRequest.service.js —
 * its unlocked_evidence_keys must stay in sync with these paths).
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
      'consented to a full review of the machine\'s own logs — no warrant is needed for that, it\'s his ' +
      'own equipment. You have shell access as analyst. Review connection logs, auth logs, and the staged-' +
      'file evidence below, then use the Legal Process panel to request whatever comes next once you can ' +
      'articulate why it\'s needed. Nothing under post-warrant/ exists until that request is approved.\n'
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

export const POST_WARRANT_TREE = dir({
  'post-warrant': dir({
    'residence-search.txt': file(
      'Search of Daniel Reyes\'s residence executed under warrant. A personal laptop and an external ' +
      'drive were located in a desk drawer, both powered on and connected to the home network at the time ' +
      'of entry.\n'
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
  'post-warrant/residence-search.txt',
  'post-warrant/seized-devices.txt',
];

export const HINTS = [
  'Start with case-file/brief.txt, then case-file/personnel_note.txt.',
  'Compare system-logs/outbound_connections.log timestamps against system-logs/auth_and_commands.log.',
  'evidence/staged_files_manifest.txt explains what was actually being exfiltrated.',
  'Once you can name who, what, and why it\'s tied to his home, use the Legal Process panel to request a search warrant.',
  'After the warrant is approved, review everything under post-warrant/ before you accuse.',
  'When you\'re confident, run: accuse <last name>',
];
