'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `CREATE TABLE tournaments (
          id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name           TEXT UNIQUE NOT NULL,
          start_date     TIMESTAMP WITH TIME ZONE NOT NULL,
          end_date       TIMESTAMP WITH TIME ZONE NOT NULL,
          game_limit     INT NOT NULL DEFAULT -1,
          is_open        BOOLEAN NOT NULL DEFAULT true,
          roster_id      UUID REFERENCES rosters(id) ON DELETE SET NULL,
          created_at     TIMESTAMP WITH TIME ZONE NOT NULL,
          updated_at     TIMESTAMP WITH TIME ZONE NOT NULL
        );`,
        { transaction: transaction }
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(`DROP TABLE tournaments;`, {
        transaction: transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
