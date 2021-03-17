"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `CREATE TABLE games (
          id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          team_id        UUID REFERENCES teams(id) ON DELETE CASCADE,
          placement      INTEGER NOT NULL,
          created_at     TIMESTAMP WITH TIME ZONE NOT NULL,
          updated_at     TIMESTAMP WITH TIME ZONE NOT NULL
        );`,
        { transaction: transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE TABLE game_results (
          id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          game_id        UUID REFERENCES games(id) ON DELETE CASCADE,
          player_id      UUID REFERENCES players(id) ON DELETE CASCADE,
          kills          INTEGER NOT NULL,
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
      await queryInterface.sequelize.query(`DROP TABLE game_results;`, {
        transaction: transaction,
      });

      await queryInterface.sequelize.query(`DROP TABLE games;`, {
        transaction: transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
