'use strict';

const { randomUUID } = require('node:crypto');

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [drops] = await queryInterface.sequelize.query(
        `SELECT id, signal_enabled, html_signal, signal_prompt, vault_enabled, vault_hint, vault_pin
           FROM campaign_drops
          WHERE (signal_enabled = true AND html_signal IS NOT NULL)
             OR (vault_enabled = true AND vault_hint IS NOT NULL AND vault_pin IS NOT NULL)`,
        { transaction },
      );

      for (const drop of drops) {
        const [existing] = await queryInterface.sequelize.query(
          `SELECT puzzle_type FROM campaign_drop_puzzles
            WHERE drop_id = :dropId AND puzzle_type IN ('signal_hunt', 'vault_lock')`,
          { replacements: { dropId: drop.id }, transaction },
        );
        const existingTypes = new Set(existing.map((item) => item.puzzle_type));
        const layers = [];
        if (drop.signal_enabled && drop.html_signal && !existingTypes.has('signal_hunt')) {
          layers.push({
            id: randomUUID(), drop_id: drop.id, puzzle_type: 'signal_hunt', order_index: layers.length,
            enabled: true, prompt: drop.signal_prompt || 'Inspect the page source and recover the embedded signal code.',
            answer: drop.html_signal, config: JSON.stringify({ signalCode: drop.html_signal }),
            created_at: new Date(), updated_at: new Date(),
          });
        }
        if (drop.vault_enabled && drop.vault_hint && drop.vault_pin && !existingTypes.has('vault_lock')) {
          layers.push({
            id: randomUUID(), drop_id: drop.id, puzzle_type: 'vault_lock', order_index: layers.length,
            enabled: true, prompt: drop.vault_hint, answer: drop.vault_pin, config: JSON.stringify({}),
            created_at: new Date(), updated_at: new Date(),
          });
        }
        if (layers.length > 0) {
          await queryInterface.sequelize.query(
            `UPDATE campaign_drop_puzzles SET order_index = order_index + :offset WHERE drop_id = :dropId`,
            { replacements: { offset: layers.length, dropId: drop.id }, transaction },
          );
          await queryInterface.bulkInsert('campaign_drop_puzzles', layers, { transaction });
        }
        await queryInterface.bulkUpdate('campaign_drops', { signal_enabled: false, vault_enabled: false }, { id: drop.id }, { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE campaign_drops d
         SET signal_enabled = true,
             html_signal = p.answer,
             signal_prompt = p.prompt
        FROM campaign_drop_puzzles p
       WHERE p.drop_id = d.id AND p.puzzle_type = 'signal_hunt' AND p.enabled = true
    `);
    await queryInterface.sequelize.query(`
      UPDATE campaign_drops d
         SET vault_enabled = true,
             vault_hint = p.prompt,
             vault_pin = p.answer
        FROM campaign_drop_puzzles p
       WHERE p.drop_id = d.id AND p.puzzle_type = 'vault_lock' AND p.enabled = true
    `);
    await queryInterface.sequelize.query(`
      UPDATE campaign_drop_puzzles p
         SET order_index = p.order_index - migrated.offset
        FROM (
          SELECT drop_id, COUNT(*)::integer AS offset
            FROM campaign_drop_puzzles
           WHERE puzzle_type IN ('signal_hunt', 'vault_lock')
           GROUP BY drop_id
        ) migrated
       WHERE p.drop_id = migrated.drop_id
         AND p.puzzle_type NOT IN ('signal_hunt', 'vault_lock')
    `);
    await queryInterface.sequelize.query(
      `DELETE FROM campaign_drop_puzzles WHERE puzzle_type IN ('signal_hunt', 'vault_lock')`,
    );
  },
};
