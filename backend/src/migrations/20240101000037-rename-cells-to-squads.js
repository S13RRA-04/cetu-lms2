'use strict';

// No-op, mirroring 20240101000032-rename-squads-to-cells.js: that rename was
// reverted out-of-band on the existing production DB (never actually renamed
// squads -> cells there), so this counterpart has nothing to undo. On a
// fresh database the table has always been named `squads` with `squad_id`
// columns (see 20240101000014-create-squads.js /
// 20240101000017-alter-enrollments-add-squad.js) — a real renameTable('cells',
// 'squads') here fails since `cells` never exists.
module.exports = {
  async up()   {},
  async down() {},
};
