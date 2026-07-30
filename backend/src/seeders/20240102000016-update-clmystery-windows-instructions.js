'use strict';
/**
 * clmystery is a local-only terminal game (no web/hosted form — see
 * 20240102000012's notes and project memory) that expects a real bash
 * environment: cat/grep/find/ls aren't available out of the box in
 * Windows' default cmd.exe or PowerShell. This updates the existing
 * resource's description with generic, non-content setup instructions
 * (Git Bash / WSL) so Windows students can actually run the real game
 * they'd download from the linked repo — same row/id/url, description
 * only.
 */
const ITEM_ID = 'f1a1000e-0000-0000-0000-00000000000e';

const NEW_DESCRIPTION =
  'Optional extra practice outside class: a free, local terminal murder-mystery game. Clone the repo ' +
  'and investigate a case entirely through cat, grep, and find — clues are hidden in real files, not a UI. ' +
  'A fun, low-stakes way to drill the same commands used in Terminal Drill and The Locked Lab.\n\n' +
  'Windows users: this needs a real bash shell, which cmd.exe/PowerShell don\'t provide out of the box. ' +
  'Easiest option — install "Git for Windows" (git-scm.com), which bundles Git Bash: open Git Bash, ' +
  '`cd` into the folder where you downloaded/extracted the game, and follow the repo\'s own instructions ' +
  'from there. (WSL also works if you already have it set up, but Git Bash is the lighter-weight option ' +
  'for just this.)';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkUpdate(
      'course_content_items',
      { description: NEW_DESCRIPTION, updated_at: new Date() },
      { id: ITEM_ID }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkUpdate(
      'course_content_items',
      {
        description:
          'Optional extra practice outside class: a free, local terminal murder-mystery game. Clone the repo ' +
          'and investigate a case entirely through cat, grep, and find — clues are hidden in real files, not a UI. ' +
          'A fun, low-stakes way to drill the same commands used in Terminal Drill and The Locked Lab.',
        updated_at: new Date(),
      },
      { id: ITEM_ID }
    );
  },
};

module.exports.ITEM_ID = ITEM_ID;
