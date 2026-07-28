'use strict';
/**
 * "The Locked Lab" was rebuilt from a linear 8-level chain
 * (mysteryGameLevels.js, still on disk but unused) into a non-linear
 * investigation (investigationCase.js, InvestigationGame.jsx) — same
 * assignment row (id, title, publish/unlock state all unchanged), just a
 * different description reflecting free-roam exploration + `accuse` instead
 * of "8 levels." See project memory for the architecture change.
 */
const GAME_ID = 'e1a10007-0000-0000-0000-000000000015';

const NEW_DESCRIPTION =
  'The Meridian Bank case file vanished from sift-lab01 overnight, and four people had after-hours ' +
  'badge access. Explore freely — badge logs, camera exports, IT logs, personnel files, and full ' +
  'statements are all available from the start, in whatever order you want to look at them. Cross-' +
  'reference what you find, follow up on names you don\'t recognize, and use real Linux commands ' +
  '(ls, cd, cat, head/tail, grep, find, permissions) to build your case. When you\'re confident, name ' +
  'the culprit with accuse <name>. No VM, no setup — just the shell in your browser.';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkUpdate(
      'assignments',
      { description: NEW_DESCRIPTION, updated_at: new Date() },
      { id: GAME_ID }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkUpdate(
      'assignments',
      {
        description:
          'The Meridian Bank case file vanished from sift-lab01 overnight, and four people had after-hours ' +
          'badge access. Work through 8 levels of an in-browser simulated terminal — real Linux commands ' +
          '(ls, cd, cat, head/tail, grep, find, permissions) — to find out who deleted it and prove it. ' +
          'No VM, no setup — just the shell in your browser.',
        updated_at: new Date(),
      },
      { id: GAME_ID }
    );
  },
};

module.exports.GAME_ID = GAME_ID;
