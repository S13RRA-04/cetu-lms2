/**
 * LAIR "The Locked Lab" — non-linear investigation case data, rendered by
 * InvestigationGame.jsx. Original content written for this course (see
 * project memory: the real github.com/veltman/clmystery was never read or
 * reproduced — only its "explore freely, cross-reference leads" structure
 * inspired this rebuild, not its specific story).
 *
 * Unlike terminalGameLevels.js/mysteryGameLevels.js (linear, level-gated,
 * single marker per level), this whole tree is available from the start.
 * There is no marker string to trigger auto-advance — completion is an
 * explicit `accuse <name>` command checked against CULPRIT.
 */
import { dir, file } from '../utils/shellLex.js';

export const HOSTNAME = 'sift-lab01';
export const USER = 'intern';

export const CULPRIT = 'webb';
export const CULPRIT_ALIASES = ['marcus webb', 'marcus', 'webb', 'mwebb'];

function buildBadgeLog(door, entries) {
  const names = ['pchandra', 'mwebb', 'dokafor', 'security', 'fturner'];
  const lines = [];
  for (let i = 0; i < 60; i++) {
    const name = names[i % names.length];
    const hh = String(7 + (i % 11)).padStart(2, '0');
    const mm = String((i * 9) % 60).padStart(2, '0');
    lines.push(`2026-07-23 ${hh}:${mm} ${door} SWIPE-OK user=${name}`);
  }
  for (const e of entries) lines.push(e);
  return lines.join('\n');
}

function buildFileServerLog() {
  const shares = ['\\\\sift-lab01\\projects\\active', '\\\\sift-lab01\\projects\\archive', '\\\\sift-lab01\\scratch', '\\\\sift-lab01\\backups'];
  const users = ['pchandra', 'dokafor', 'svc-backup', 'mwebb'];
  const lines = [];
  for (let i = 0; i < 90; i++) {
    const share = shares[i % shares.length];
    const usr = users[i % users.length];
    const hh = String(8 + (i % 10)).padStart(2, '0');
    const mm = String((i * 11) % 60).padStart(2, '0');
    lines.push(`2026-07-23 ${hh}:${mm} ACCESS ${share} user=${usr} action=READ`);
  }
  lines.push('2026-07-23 23:50 ACCESS \\\\sift-lab01\\projects\\archive\\autosave\\2026-07 user=mwebb action=WRITE file=meridian_case.bak');
  return lines.join('\n');
}

function buildVpnLog() {
  const lines = [];
  for (let i = 0; i < 30; i++) {
    const hh = String(8 + (i % 9)).padStart(2, '0');
    const mm = String((i * 13) % 60).padStart(2, '0');
    lines.push(`2026-07-23 ${hh}:${mm} VPN-CONNECT user=pchandra src=office-wifi duration=${20 + (i % 40)}m`);
  }
  lines.push('2026-07-23 22:00 VPN-CONNECT user=svc-backup src=10.4.0.9 duration=15m note="scheduled nightly sync, see maintenance calendar #4471"');
  lines.push('2026-07-24 06:00 VPN-CONNECT user=pchandra src=home-wifi duration=25m');
  return lines.join('\n');
}

const badgeMainEntrance = buildBadgeLog('main-entrance', [
  '2026-07-23 18:02 main-entrance SWIPE-OK user=fturner note=departure',
]);
const badgeLabDoor = buildBadgeLog('lab-door', [
  '2026-07-23 21:40 lab-door SWIPE-OK user=dokafor',
  '2026-07-23 21:44 lab-door SWIPE-OK user=mwebb',
  '2026-07-23 23:47 lab-door ADMIN-OVERRIDE user=mwebb note=after-hours-access',
]);
const badgeServerRoom = buildBadgeLog('server-room', [
  '2026-07-23 21:41 server-room SWIPE-OK user=dokafor',
]);
const badgeLoadingDock = buildBadgeLog('loading-dock', [
  '2026-07-23 21:50 loading-dock SWIPE-OK user=dokafor note=departure',
  '2026-07-23 18:05 loading-dock SWIPE-OK user=alvarez note=contractor-checkin',
]);

export const TREE = dir({
  'case-file': dir({
    'brief.txt': file(
      'Lab incident log — Meridian Bank case file missing as of Friday morning.\n' +
      'Four badge-holders had after-hours access the night of 2026-07-23: P. Chandrasekaran (lead), ' +
      'M. Webb (analyst), D. Okafor (IT), F. Turner (visiting auditor). An overnight facilities ' +
      'contractor, R. Alvarez, was also on the premises for a scheduled check.\n\n' +
      'You have shell access to sift-lab01 as intern. Everything relevant is somewhere under this ' +
      'home directory — badge logs, camera exports, IT logs, personnel files, and each person\'s ' +
      'statement. Nothing is locked behind a "level" here; look wherever you think the answer is, ' +
      'and cross-reference what you find. When you\'re confident, run: accuse <last name>\n'
    ),
    'evidence_board.txt': file(
      'Working checklist (fill in as you go — nothing here is graded, it\'s just for you):\n' +
      '  [ ] Who had badge access after hours, and when?\n' +
      '  [ ] Does everyone\'s story match the logs?\n' +
      '  [ ] What does the camera actually show, and for whom?\n' +
      '  [ ] Was the deleted file recovered anywhere? Who touched it last?\n' +
      '  [ ] Any names mentioned in one file that you haven\'t looked up elsewhere yet?\n'
    ),
  }),

  'badge-logs': dir({
    'main-entrance.log': file(badgeMainEntrance),
    'lab-door.log': file(badgeLabDoor),
    'server-room.log': file(badgeServerRoom),
    'loading-dock.log': file(badgeLoadingDock),
  }),

  'camera-exports': dir({
    'hallway_09to10.txt': file(
      'Camera export, hallway outside the lab, 21:00–22:00. Left world-readable by mistake during export.\n' +
      'Timestamp 21:44 — a badge holder is seen entering alone. No one else appears in frame after 21:40.\n',
      { perms: '-rw-r--r--', owner: 'security' }
    ),
    'lobby_09to10.txt': file('locked — security review pending\n', { perms: '-rw-------', owner: 'security' }),
    'server_room_09to10.txt': file('locked — security review pending\n', { perms: '-rw-------', owner: 'security' }),
    'loading_dock_23to00.txt': file(
      'Camera export, loading dock, 21:00–00:00. Left world-readable — this camera\'s footage isn\'t ' +
      'considered sensitive.\n' +
      'Timestamp 21:50 — D. Okafor exits via the loading dock, consistent with her statement. No return ' +
      'entry recorded for her on any camera or badge log for the rest of the night.\n' +
      'Timestamp 18:05 — contractor R. Alvarez enters for a scheduled overnight facilities check.\n',
      { perms: '-rw-r--r--', owner: 'security' }
    ),
  }),

  'it-logs': dir({
    'vpn_access.log': file(buildVpnLog()),
    'fileserver_access.log': file(buildFileServerLog()),
  }),

  personnel: dir({
    'chandrasekaran_priya.txt': file('P. Chandrasekaran — Lead Investigator, 6 years. Badge level: full lab + evidence archive.\n'),
    'okafor_dana.txt': file('D. Okafor — IT Support, 2 years. Badge level: server room + lab (no evidence archive access).\n'),
    'webb_marcus.txt': file('M. Webb — Analyst, 8 months. Badge level: lab + evidence archive (probationary review scheduled next quarter).\n'),
    'turner_felix.txt': file('F. Turner — Visiting Auditor, external contractor, on-site this week only. Badge level: escorted access only, main entrance.\n'),
    'alvarez_r.txt': file(
      'R. Alvarez — Facilities Contractor (overnight HVAC/security check, scheduled biweekly). Badge level: ' +
      'loading dock + mechanical areas only, no lab or evidence archive access. Checked in 18:05, checked ' +
      'out 23:58 per loading-dock badge log. No lab-door or server-room badge events recorded for this badge ' +
      'on 2026-07-23.\n'
    ),
  }),

  interviews: dir({
    'chandrasekaran.txt': file(
      'P. Chandrasekaran: "I was in my office finishing the quarterly review most of the evening. Dana ' +
      'stopped by around 9:40 to say she was heading out through the loading dock — the badge readers on ' +
      'the front doors were being finicky earlier that day, so a few of us used the loading dock instead. ' +
      'I left around 9:30 myself, actually, now that I think about it, but I stuck my head into the lab on ' +
      'my way out and Marcus was still at his desk working on the Meridian summary. That was the last I saw ' +
      'of anyone. I didn\'t come back that night, and the VPN log will show that — I only reconnected the ' +
      'next morning from home to check email."\n'
    ),
    'okafor.txt': file(
      'D. Okafor: "I badged into the server room around 9:40 to swap a failing drive in the backup array — ' +
      'that\'s routine maintenance, nothing case-related. I was done by 9:50 and left through the loading ' +
      'dock since the front badge readers were acting up. Priya saw me on my way out. I didn\'t go back to ' +
      'the lab itself at all that night, and I don\'t have evidence-archive access anyway, so I couldn\'t ' +
      'have touched the Meridian file even if I\'d wanted to."\n'
    ),
    'webb.txt': file(
      'M. Webb: "I stayed late to finish the Meridian summary — Priya wanted it ready for the Friday ' +
      'deadline. Dana was in and out of the server room around 9:40 or so, and Priya left maybe 9:30, ' +
      'stuck her head in to say goodnight. I kept working, but I couldn\'t get the numbers in my draft to ' +
      'match the original file, and I was worried I\'d wreck the real version if I kept editing it ' +
      'directly, so after Priya left I used the admin override to grab an older copy from the archive ' +
      'instead of asking for help. I panicked when I still couldn\'t reconcile it and deleted the working ' +
      'file around midnight, thinking I\'d start fresh in the morning. I know how that sounds now."\n'
    ),
    'turner.txt': file(
      'F. Turner: "As a visiting auditor I only have escorted access, so I was never in the lab alone. The ' +
      'facilities contractor let me out through the main entrance right at 6pm when my scheduled time was ' +
      'up — you can check with him, Alvarez I think his name was. I wasn\'t back on-site again until the ' +
      'next morning. Whatever happened to that file, it happened well after I\'d left the building."\n'
    ),
  }),

  'network-share': dir({
    projects: dir({
      active: dir({ 'notes.txt': file('Nothing case-related here — general team notes.\n') }),
      archive: dir({
        autosave: dir({
          '2026-07': dir({
            'meridian_case.bak': file(
              'Autosaved copy, 23:52 — five minutes after an admin badge override was logged on the lab door.\n' +
              'Last edited by user: mwebb\n' +
              'This is the only recovered version of the file reported deleted the next morning.\n'
            ),
          }),
        }),
      }),
    }),
    backups: dir({
      '2026-07-20': dir({ 'weekly_verify.txt': file('Routine weekly backup verification — passed, unrelated to this incident.\n') }),
    }),
  }),
});

/** File paths (relative to the intern's home) whose contents actually matter for solving the case. */
export const KEY_EVIDENCE = [
  'case-file/brief.txt',
  'badge-logs/lab-door.log',
  'camera-exports/hallway_09to10.txt',
  'camera-exports/loading_dock_23to00.txt',
  'it-logs/fileserver_access.log',
  'personnel/alvarez_r.txt',
  'network-share/projects/archive/autosave/2026-07/meridian_case.bak',
  'interviews/webb.txt',
  'interviews/okafor.txt',
  'interviews/turner.txt',
];

export const HINTS = [
  'Start with case-file/brief.txt, then the badge logs — who had access, and when?',
  'Camera footage isn\'t all locked down the same way. Use ls -l before assuming a file is off-limits.',
  'One interview names a contractor. See if that person\'s own personnel file backs up what was said.',
  'Cross-reference the file server access log against the badge logs — do the timestamps line up for everyone, or just for one person?',
  'Try grep -r across the interviews directory for a phrase that doesn\'t match someone\'s own story.',
  'When you\'re confident who did it, run: accuse <last name>',
];
