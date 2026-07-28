'use strict';
/**
 * Reorganizes LAIR's external practice-game resources (course_content_items,
 * content_type: 'resource', linked_assignment_id: null — same pattern as
 * 20240102000008/9) into three difficulty tiers. No UI/schema change: tiers
 * are conveyed by a "[Beginner]/[Intermediate]/[Advanced]" title prefix plus
 * order_index bands (10s/20s/30s), since ContentByType.jsx renders all
 * 'resource' items as one flat, order_index-sorted list with no sub-grouping
 * field to key off. If real sub-grouped UI is ever wanted, this is the data
 * to build it from.
 */
const COURSE_ID = 'b3e1f7a2-4c8d-4e9f-a012-3d5678901234'; // LAIR course

const BANDIT_ID   = 'f1a10001-0000-0000-0000-000000000001'; // existing
const TERMINUS_ID = 'f1a10002-0000-0000-0000-000000000002'; // existing

const NEW_ITEMS = [
  // ── Beginner ──────────────────────────────────────────────────────────
  {
    id: 'f1a10003-0000-0000-0000-000000000003',
    title: '[Beginner] Bashcrawl (Dungeon Crawler)',
    description:
      'A dungeon-crawler game that runs directly in your terminal — folders are rooms, files are treasure ' +
      'or monsters. Explore with cd, ls, and cat. The gentlest possible introduction to navigating a real filesystem.',
    url: 'https://github.com/aparrish/bashcrawl',
    order_index: 12,
  },
  // ── Intermediate ──────────────────────────────────────────────────────
  {
    id: 'f1a10004-0000-0000-0000-000000000004',
    title: '[Intermediate] CmdChallenge',
    description:
      'Bite-sized, browser-based challenges: each one gives a goal (e.g. "print every file sorted by size") ' +
      'and expects a single-line command as the answer. Good for testing speed once the basics feel automatic.',
    url: 'https://cmdchallenge.com/',
    order_index: 20,
  },
  {
    id: 'f1a10005-0000-0000-0000-000000000005',
    title: '[Intermediate] CommandLineFu',
    description:
      'A community-curated archive of shell one-liners, ranked by vote. Less a game than a puzzle box — reading ' +
      'and decoding the top entries is a solid way to pick up sort, awk, sed, and pipe-chaining idioms.',
    url: 'https://www.commandlinefu.com/',
    order_index: 21,
  },
  {
    id: 'f1a10006-0000-0000-0000-000000000006',
    title: '[Intermediate] OverTheWire: Leviathan',
    description:
      'The next step up from Bandit on the same OverTheWire platform — introduces basic binary analysis and ' +
      'reverse engineering via the command line.',
    url: 'https://overthewire.org/wargames/leviathan/',
    order_index: 22,
  },
  {
    id: 'f1a10007-0000-0000-0000-000000000007',
    title: '[Intermediate] OverTheWire: Natas',
    description:
      'A companion wargame to Bandit, shifting focus to web/server-side security fundamentals rather than ' +
      'pure filesystem navigation.',
    url: 'https://overthewire.org/wargames/natas/',
    order_index: 23,
  },
  // ── Advanced ──────────────────────────────────────────────────────────
  {
    id: 'f1a10008-0000-0000-0000-000000000008',
    title: '[Advanced] OverTheWire: Narnia',
    description:
      'Binary exploitation fundamentals — buffer overflows, reading assembly/C, and manipulating a restricted ' +
      'shell environment. A real jump in difficulty from Bandit/Leviathan.',
    url: 'https://overthewire.org/wargames/narnia/',
    order_index: 30,
  },
  {
    id: 'f1a10009-0000-0000-0000-000000000009',
    title: '[Advanced] OverTheWire: Krypton',
    description:
      'A cryptography-focused wargame on the OverTheWire platform — cipher identification and basic ' +
      'cryptanalysis via the command line.',
    url: 'https://overthewire.org/wargames/krypton/',
    order_index: 31,
  },
  {
    id: 'f1a1000a-0000-0000-0000-00000000000a',
    title: '[Advanced] OverTheWire: Behemoth',
    description: 'More binary exploitation practice in the OverTheWire series, picking up where Narnia leaves off.',
    url: 'https://overthewire.org/wargames/behemoth/',
    order_index: 32,
  },
  {
    id: 'f1a1000b-0000-0000-0000-00000000000b',
    title: '[Advanced] World of Haiku',
    description:
      'A gamified terminal environment for security practitioners — run real reconnaissance and network ' +
      'tools (nmap, curl, ping) against simulated targets.',
    url: 'https://play.haikuinc.io/',
    order_index: 33,
  },
  {
    id: 'f1a1000c-0000-0000-0000-00000000000c',
    title: '[Advanced] HackTheBox',
    description:
      'An account-based sandbox for full attack-chain practice: privilege escalation, container escapes, log ' +
      'analysis, and scripting under real constraints. Industry-standard for hands-on security training.',
    url: 'https://www.hackthebox.com/',
    order_index: 34,
  },
  {
    id: 'f1a1000d-0000-0000-0000-00000000000d',
    title: '[Advanced] TryHackMe',
    description:
      'Similar to HackTheBox but more guided — structured "rooms" walk through Linux privilege escalation and ' +
      'scripting step by step. A gentler entry point into the same skill set.',
    url: 'https://tryhackme.com/',
    order_index: 35,
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkUpdate(
      'course_content_items',
      { title: '[Beginner] OverTheWire: Bandit Wargame', order_index: 10, updated_at: now },
      { id: BANDIT_ID }
    );
    await queryInterface.bulkUpdate(
      'course_content_items',
      { title: '[Beginner] Terminus: Learn the Command Line', order_index: 11, updated_at: now },
      { id: TERMINUS_ID }
    );

    await queryInterface.bulkInsert(
      'course_content_items',
      NEW_ITEMS.map((item) => ({
        id:                   item.id,
        course_id:            COURSE_ID,
        title:                item.title,
        description:          item.description,
        content_type:         'resource',
        url:                  item.url,
        linked_assignment_id: null,
        order_index:          item.order_index,
        is_published:         false,
        created_at:           now,
        updated_at:           now,
      })),
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkUpdate(
      'course_content_items',
      { title: 'OverTheWire: Bandit Wargame', order_index: 10 },
      { id: BANDIT_ID }
    );
    await queryInterface.bulkUpdate(
      'course_content_items',
      { title: 'Terminus: Learn the Command Line', order_index: 11 },
      { id: TERMINUS_ID }
    );
    await queryInterface.bulkDelete('course_content_items', { id: NEW_ITEMS.map((i) => i.id) });
  },
};

module.exports.COURSE_ID = COURSE_ID;
module.exports.NEW_ITEMS = NEW_ITEMS;
