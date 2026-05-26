'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const email    = process.env.SEED_ADMIN_EMAIL    || 'admin@cetu.mil';
    const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe!OnFirstLogin1';
    const hash     = await bcrypt.hash(password, 12);

    await queryInterface.bulkInsert(
      'users',
      [
        {
          id:            require('crypto').randomUUID(),
          email,
          username:      'superadmin',
          password_hash: hash,
          first_name:    'CETU',
          last_name:     'Administrator',
          role:          'superadmin',
          is_active:     true,
          created_at:    new Date(),
          updated_at:    new Date(),
        },
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { username: 'superadmin' });
  },
};
