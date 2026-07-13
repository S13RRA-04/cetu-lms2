'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.sequelize.query(
      `SELECT to_regclass('squad_challenge_states') AS t`
    ).then(([rows]) => !!rows[0]?.t);

    if (!tableExists) {
      await queryInterface.createTable('squad_challenge_states', {
        id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        assignment_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'assignments', key: 'id' }, onDelete: 'CASCADE' },
        squad_id:      { type: Sequelize.UUID, allowNull: false, references: { model: 'squads',      key: 'id' }, onDelete: 'CASCADE' },
        quiz_state:    { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        updated_by:    { type: Sequelize.UUID, allowNull: true },
        created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
        updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      });
    }

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE squad_challenge_states
          ADD CONSTRAINT squad_challenge_states_assignment_squad_unique UNIQUE (assignment_id, squad_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('squad_challenge_states');
  },
};
