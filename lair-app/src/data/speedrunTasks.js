/**
 * LAIR Speed Drills — task manifest for SpeedrunArena.jsx.
 *
 * Unlike Terminal Drill (read-only investigation across one persistent
 * filesystem), each task here gets a fresh mutable scratch workspace and
 * drills a single mutating command: rm, rm with a glob, cp, mv, mkdir -p,
 * touch, chmod, echo redirects (> and >>). A task passes once every check
 * in its `checks` array is true against the mutated workspace — checked
 * after every command — so the engine has no per-task special cases.
 */

const dir = (children) => ({ type: 'dir', perms: 'drwxr-xr-x', children });
const file = (content, perms = '-rw-r--r--') => ({ type: 'file', perms, content });

export const TASKS = [
  {
    id: 't01',
    title: 'Touch',
    prompt: 'Create an empty file named notes.txt in the current directory.',
    hints: ['One command creates an empty file (or updates its timestamp if it already exists).', 'Run: touch notes.txt'],
    setup: dir({}),
    checks: [{ check: 'exists', path: 'notes.txt' }],
  },
  {
    id: 't02',
    title: 'Nested Directories',
    prompt: 'Create the nested directory path logs/2026/07 in one command.',
    hints: ['mkdir needs a flag to create parent directories that don\'t exist yet.', 'Run: mkdir -p logs/2026/07'],
    setup: dir({}),
    checks: [{ check: 'exists', path: 'logs/2026/07', type: 'dir' }],
  },
  {
    id: 't03',
    title: 'Remove a File',
    prompt: 'Delete the file old_backup.tar.',
    hints: ['rm removes a file.', 'Run: rm old_backup.tar'],
    setup: dir({ 'old_backup.tar': file('binary tar data\n'), 'keep.txt': file('do not delete me\n') }),
    checks: [
      { check: 'missing', path: 'old_backup.tar' },
      { check: 'exists', path: 'keep.txt' },
    ],
  },
  {
    id: 't04',
    title: 'Wildcard Cleanup',
    prompt: 'Delete every file ending in .tmp in the current directory — leave everything else untouched.',
    hints: [
      'rm accepts a wildcard pattern, not just one exact filename.',
      'The * wildcard matches any characters. Try: rm *.tmp',
    ],
    setup: dir({
      'session1.tmp': file('scratch\n'),
      'session2.tmp': file('scratch\n'),
      'cache.tmp': file('scratch\n'),
      'report.txt': file('keep this one\n'),
      'config.yml': file('keep: true\n'),
    }),
    checks: [
      { check: 'none-match', path: '.', pattern: '*.tmp' },
      { check: 'exists', path: 'report.txt' },
      { check: 'exists', path: 'config.yml' },
    ],
  },
  {
    id: 't05',
    title: 'Copy a File',
    prompt: 'Copy config.yml to config.yml.bak, keeping the original in place.',
    hints: ['cp takes a source and a destination and leaves the source alone.', 'Run: cp config.yml config.yml.bak'],
    setup: dir({ 'config.yml': file('env: production\nport: 8080\n') }),
    checks: [
      { check: 'content-equals-path', path: 'config.yml.bak', equalsPath: 'config.yml' },
      { check: 'exists', path: 'config.yml' },
    ],
  },
  {
    id: 't06',
    title: 'Rename',
    prompt: 'Rename draft.txt to final.txt.',
    hints: ['mv works for renaming, not just moving between directories.', 'Run: mv draft.txt final.txt'],
    setup: dir({ 'draft.txt': file('work in progress\n') }),
    checks: [
      { check: 'exists', path: 'final.txt' },
      { check: 'missing', path: 'draft.txt' },
    ],
  },
  {
    id: 't07',
    title: 'Make It Executable',
    prompt: 'deploy.sh needs to be runnable by everyone. Set its permissions to 755.',
    hints: [
      'chmod changes permissions. It accepts a 3-digit numeric mode.',
      '755 means owner=rwx, group=r-x, other=r-x.',
      'Run: chmod 755 deploy.sh',
    ],
    setup: dir({ 'deploy.sh': file('#!/bin/sh\necho deploying\n', '-rw-r--r--') }),
    checks: [{ check: 'perm-equals', path: 'deploy.sh', perms: '-rwxr-xr-x' }],
  },
  {
    id: 't08',
    title: 'Lock It Down',
    prompt: 'secrets.env is world-readable and shouldn\'t be. Restrict it to owner read/write only (600).',
    hints: [
      'chmod 600 removes all group and other permissions, leaving only owner read/write.',
      'Run: chmod 600 secrets.env',
    ],
    setup: dir({ 'secrets.env': file('API_KEY=xyz\n', '-rw-r--r--') }),
    checks: [{ check: 'perm-equals', path: 'secrets.env', perms: '-rw-------' }],
  },
  {
    id: 't09',
    title: 'Write to a File',
    prompt: 'Create status.txt containing exactly the word: ready',
    hints: [
      'echo prints text. Redirecting it into a file writes that text as the file\'s contents.',
      'The > operator overwrites a file (or creates it).',
      'Run: echo ready > status.txt',
    ],
    setup: dir({}),
    checks: [{ check: 'content-equals-literal', path: 'status.txt', content: 'ready' }],
  },
  {
    id: 't10',
    title: 'Append, Don\'t Overwrite',
    prompt: 'audit.log already has one line in it. Add a second line reading: second run — without erasing the first line.',
    hints: [
      'A single > would replace the whole file. There\'s a different operator that adds to the end instead.',
      '>> appends instead of overwriting.',
      'Run: echo "second run" >> audit.log',
    ],
    setup: dir({ 'audit.log': file('first run\n') }),
    checks: [{ check: 'content-equals-literal', path: 'audit.log', content: 'first run\nsecond run' }],
  },
  {
    id: 't11',
    title: 'File Into a Folder',
    prompt: 'Create a directory named archive, then move report.txt into it.',
    hints: [
      'This is two commands: make the directory, then move the file into it.',
      'mv works on directories as destinations too — mv file dir/ puts the file inside.',
      'Run: mkdir archive, then: mv report.txt archive/report.txt',
    ],
    setup: dir({ 'report.txt': file('Q3 findings\n') }),
    checks: [
      { check: 'exists', path: 'archive/report.txt' },
      { check: 'missing', path: 'report.txt' },
    ],
  },
  {
    id: 't12',
    title: 'Prefix Cleanup',
    prompt: 'The scratch/ directory is full of temp files. Delete every file whose name starts with tmp_ — leave the rest.',
    hints: [
      'The wildcard can go at the end of a pattern too, matching a prefix instead of a suffix.',
      'Reference the path directly rather than cd-ing in.',
      'Run: rm scratch/tmp_*',
    ],
    setup: dir({
      scratch: dir({
        'tmp_a.dat': file('x\n'),
        'tmp_b.dat': file('x\n'),
        'tmp_session.dat': file('x\n'),
        'keep_me.dat': file('important\n'),
      }),
    }),
    checks: [
      { check: 'none-match', path: 'scratch', pattern: 'tmp_*' },
      { check: 'exists', path: 'scratch/keep_me.dat' },
    ],
  },
];
