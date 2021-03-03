"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `CREATE TABLE players_users (
          player_id      UUID REFERENCES players(id) ON DELETE CASCADE UNIQUE,
          user_id        UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
          created_at     TIMESTAMP WITH TIME ZONE NOT NULL,
          updated_at     TIMESTAMP WITH TIME ZONE NOT NULL,
          PRIMARY KEY(player_id, user_id)
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
      await queryInterface.sequelize.query(
        `DROP TABLE players_users;`,
        { transaction: transaction }
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
