/**
 * LAIR "The Locked Lab" — second level manifest for TerminalGame.jsx,
 * an original whodunit companion to Terminal Drill. Same technical pattern
 * as terminalGameLevels.js (case folders under /home/<user>/, unique
 * `marker` per level, generic completion detection) but a different case:
 * an internal personnel mystery rather than an external intrusion, and a
 * different cast/setting so it reads as its own story, not a reskin.
 *
 * All character names, dialogue, and clue content below are original,
 * written for this course.
 */
import { dir, file } from '../utils/shellLex.js';

const HOSTNAME = 'sift-lab01';
const USER = 'intern';

export const LEVELS = [
  // ── Level 0 — Orientation ──────────────────────────────────────────────
  {
    id: 'case-00',
    title: 'The Missing Case File',
    briefing:
      'Friday morning, and the Meridian Bank case file is gone from sift-lab01 — deleted sometime overnight. ' +
      'Four people had badge access to the lab after hours. You have shell access and nothing else. Start looking.',
    marker: 'LAB-0001',
    hints: [
      'Two commands get you oriented: one shows where you are, one shows what\'s here.',
      'pwd shows your current directory. ls lists what\'s inside it.',
      'Once you see brief.txt in the listing, read it: cat brief.txt',
    ],
    tree: dir({
      'brief.txt': file(
        'Lab incident log — Meridian Bank case file missing as of this morning.\n' +
        'Four badge-holders had after-hours access last night: P. Chandrasekaran (lead), ' +
        'M. Webb (analyst), D. Okafor (IT), F. Turner (visiting auditor).\n' +
        'You have shell access to sift-lab01 as intern. Work the filesystem.\n\n' +
        `MARKER:LAB-0001\n`
      ),
    }),
  },

  // ── Level 1 — Hidden files ────────────────────────────────────────────
  {
    id: 'case-01',
    title: 'The Badge Log Nobody Mentioned',
    briefing:
      'The obvious files don\'t say much. Whoever swiped in with an admin override wouldn\'t want that logged ' +
      'somewhere anyone could just stumble onto.',
    marker: 'LAB-0002',
    hints: [
      'A plain ls won\'t show everything sitting in this directory.',
      'Add -a to ls to reveal hidden (dotfile) entries.',
      'Once you see .badge_override, read it: cat .badge_override',
    ],
    tree: dir({
      'shift_notes.txt': file('Quiet night. Nothing to report.\n'),
      '.badge_override': file(
        'Admin badge override issued 23:47 — bypasses normal after-hours logging. Used once.\n\n' +
        `MARKER:LAB-0002\n`,
        { hidden: true }
      ),
    }),
  },

  // ── Level 2 — Navigation ────────────────────────────────────────────
  {
    id: 'case-02',
    title: 'Four Statements, One Real Lead',
    briefing:
      'All four badge-holders gave a written statement. The folder names look almost identical — read carefully ' +
      'before you assume you\'re looking at the right one.',
    marker: 'LAB-0003',
    hints: [
      'cd moves you into a directory — the interviews are nested a couple of levels down.',
      'Try: cd interviews, then ls — watch for near-duplicate folder names.',
      'The real path is: cd interviews/staff/current — then cat statement.txt',
    ],
    tree: dir({
      interviews: dir({
        staff: dir({
          former: dir({ 'statement.txt': file('Left the company in March. Not on-site last night.\n') }),
          current: dir({
            'statement.txt': file(
              'D. Okafor: "I badged in around 9pm to fix the backup server. Left by 9:40. ' +
              'Priya was still in her office when I left."\n\n' +
              `MARKER:LAB-0003\n`
            ),
          }),
        }),
        visitor: dir({ 'statement.txt': file('F. Turner, visiting auditor: "I left the building at 6pm sharp, before badge logs even start."\n') }),
      }),
    }),
  },

  // ── Level 3 — Permissions ────────────────────────────────────────────
  {
    id: 'case-03',
    title: 'Whoever Locked This Down Was Careful',
    briefing:
      'Three exports from the lab\'s camera system. Two are locked down tight. One was left readable — ' +
      'check the permission string with ls -l before you try to open anything.',
    marker: 'LAB-0004',
    hints: [
      'ls -l shows a permission string like -rw-r--r-- and an owner for each file.',
      'A string like -rw------- means only the owner can read it — cat will fail on those.',
      'Look for the file with -rw-r--r-- owned by security — that one you can read: cat hallway_09to10.txt',
    ],
    tree: dir({
      'server_room_09to10.txt': file('locked — security review pending\n', { perms: '-rw-------', owner: 'security' }),
      'lobby_09to10.txt': file('locked — security review pending\n', { perms: '-rw-------', owner: 'security' }),
      'hallway_09to10.txt': file(
        'Camera export, hallway outside the lab, 9:00–10:00pm. Left world-readable by mistake during export.\n' +
        'Timestamp 21:44 — a badge holder is seen entering alone, no one else in frame after 21:40.\n\n' +
        `MARKER:LAB-0004\n`,
        { perms: '-rw-r--r--', owner: 'security' }
      ),
    }),
  },

  // ── Level 4 — tail ────────────────────────────────────────────────────
  {
    id: 'case-04',
    title: 'The Last Swipe of the Night',
    briefing:
      'badge_reader.log has hundreds of routine swipes going back weeks. The one that matters is the very last ' +
      'line — don\'t scroll through the whole file to find it.',
    marker: 'LAB-0005',
    hints: [
      'cat would dump the entire log. There\'s a command built for just the end of a file.',
      'tail shows the last 10 lines by default.',
      'Run: tail badge_reader.log',
    ],
    tree: dir({
      badge_reader: file(buildBadgeLog('LAB-0005'), {}),
    }),
  },

  // ── Level 5 — grep ────────────────────────────────────────────────────
  {
    id: 'case-05',
    title: 'A Phrase That Doesn\'t Add Up',
    briefing:
      'The full interview transcript runs long. Somewhere in it is a line that contradicts the badge log you ' +
      'already pulled. Search for it instead of reading the whole thing.',
    marker: 'LAB-0006',
    hints: [
      'grep searches a file for lines matching a pattern.',
      'Try searching for the phrase: never went back',
      'Run: grep "never went back" transcript.txt',
    ],
    tree: dir({
      'transcript.txt': file(buildTranscript('LAB-0006')),
    }),
  },

  // ── Level 6 — find ────────────────────────────────────────────────────
  {
    id: 'case-06',
    title: 'A Backup Somebody Forgot About',
    briefing:
      'Deleted files aren\'t always really gone. There\'s an autosave backup of the Meridian case file buried ' +
      'somewhere in the shared drive tree — find it before it gets cleaned up.',
    marker: 'LAB-0007',
    hints: [
      'find searches an entire directory tree for you, recursively.',
      'find takes a starting path and a -name filter: find <path> -name "<pattern>"',
      'Run: find . -name "meridian_case.bak" — then cat whatever path it prints',
    ],
    tree: dir({
      shared: dir({
        drive: dir({
          projects: dir({
            active: dir({ 'notes.txt': file('Nothing relevant here.\n') }),
            archive: dir({
              autosave: dir({
                '2026-07': dir({
                  'meridian_case.bak': file(
                    'Autosaved copy, 23:52 — three minutes after the badge override.\n' +
                    'Last edited by user: mwebb\n\n' +
                    `MARKER:LAB-0007\n`
                  ),
                }),
              }),
            }),
          }),
        }),
      }),
    }),
  },

  // ── Level 7 — Synthesis (finale) ─────────────────────────────────────
  {
    id: 'case-07',
    title: 'Closing the Case',
    briefing:
      'You have a badge override at 23:47, an autosave edited by "mwebb" at 23:52, and a hallway camera catching ' +
      'someone alone at 21:44. Somewhere in the full statement file, that same person\'s own words give it away. ' +
      'Search every statement for the phrase: after Priya left',
    marker: 'LAB-0008',
    hints: [
      'This one chains find and grep: find every statement file, then grep each for the phrase.',
      'find interviews -name "statement.txt" lists the candidates.',
      'Run: grep -r "after Priya left" interviews',
    ],
    tree: dir({
      interviews: dir({
        'chandrasekaran.txt': file(
          'P. Chandrasekaran: "I left around 9:30. Marcus was still finishing up when I went."\n'
        ),
        'okafor.txt': file(
          'D. Okafor: "I was gone by 9:40. Didn\'t see anyone else after that."\n'
        ),
        'webb.txt': file(
          'M. Webb: "I stayed late to finish the Meridian summary, and after Priya left I figured no one would ' +
          'notice if I used the admin override to grab an old draft instead of redoing the work. I panicked and ' +
          `deleted the file when I couldn't get the numbers to match." MARKER:LAB-0008\n`
        ),
        'turner.txt': file(
          'F. Turner: "I was off-site by 6. None of this was during my visit."\n'
        ),
      }),
    }),
  },
];

/** Long, routine-looking badge log with one anomalous swipe as the last line. */
function buildBadgeLog(marker) {
  const names = ['pchandra', 'mwebb', 'dokafor', 'security'];
  const doors = ['main-entrance', 'lab-door', 'server-room', 'loading-dock'];
  const lines = [];
  for (let i = 0; i < 130; i++) {
    const name = names[i % names.length];
    const door = doors[i % doors.length];
    const hh = String(8 + (i % 10)).padStart(2, '0');
    const mm = String((i * 7) % 60).padStart(2, '0');
    lines.push(`2026-07-23 ${hh}:${mm} ${door} SWIPE-OK user=${name}`);
  }
  lines.push(`2026-07-23 23:47 lab-door ADMIN-OVERRIDE user=mwebb note=after-hours-access MARKER:${marker}`);
  return lines.join('\n');
}

/** Long, routine-looking transcript with one contradicting line carrying the marker. */
function buildTranscript(marker) {
  const filler = [
    'Interviewer: What time did you usually leave on a Thursday?',
    'Subject: Depends on the week, honestly. Sometimes early, sometimes late.',
    'Interviewer: And the Meridian case specifically — how was that going?',
    'Subject: Fine. A little behind schedule, but fine.',
    'Interviewer: Anyone else working late that you noticed?',
    'Subject: Not really paying attention, most nights.',
  ];
  const lines = [];
  for (let i = 0; i < 40; i++) lines.push(filler[i % filler.length]);
  lines.push(`Subject: I told the team I left at 9 and never went back — but the badge log says otherwise. MARKER:${marker}`);
  for (let i = 0; i < 10; i++) lines.push(filler[i % filler.length]);
  return lines.join('\n');
}

export { HOSTNAME, USER };
