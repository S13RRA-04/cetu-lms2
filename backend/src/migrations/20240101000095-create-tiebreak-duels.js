'use strict';
// Lightning-round duels that break a first-place tie on the Operators board.
//  - questions: the duel's own snapshot of the drawn bank questions (options
//    already shuffled), so later bank edits never change a duel in progress.
//  - answers: { "<round>": { "<userId>": { choice, correct, ms, points } } }.
//  - practice: a rehearsal between hand-picked students; never touches standings.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tiebreak_duels', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      course_id:        { type: Sequelize.UUID, allowNull: false, references: { model: 'courses', key: 'id' }, onDelete: 'CASCADE' },
      cohort_id:        { type: Sequelize.UUID, allowNull: false, references: { model: 'cohorts', key: 'id' }, onDelete: 'CASCADE' },
      status:           { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'ready' },
      practice:         { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      participant_ids:  { type: Sequelize.ARRAY(Sequelize.UUID), allowNull: false },
      questions:        { type: Sequelize.JSONB, allowNull: false },
      round:            { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 0 },
      round_started_at: { type: Sequelize.DATE, allowNull: true },
      answers:          { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      winner_id:        { type: Sequelize.UUID, allowNull: true },
      created_by:       { type: Sequelize.UUID, allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('tiebreak_duels', ['course_id', 'cohort_id', 'created_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('tiebreak_duels');
  },
};
