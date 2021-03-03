"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `CREATE TABLE teams (
          id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name              TEXT UNIQUE NOT NULL,
          placement         INT,
          team_leader_id    UUID REFERENCES players(id) ON DELETE SET NULL,
          tournament_id     UUID REFERENCES tournaments(id) ON DELETE CASCADE,
          created_at        TIMESTAMP WITH TIME ZONE NOT NULL,
          updated_at        TIMESTAMP WITH TIME ZONE NOT NULL
        );`,
        { transaction: transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE TABLE players_teams (
          player_id      UUID REFERENCES players(id) ON DELETE CASCADE,
          team_id        UUID REFERENCES teams(id) ON DELETE CASCADE,
          created_at     TIMESTAMP WITH TIME ZONE NOT NULL,
          updated_at     TIMESTAMP WITH TIME ZONE NOT NULL,
          PRIMARY KEY(player_id, team_id)
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
      await queryInterface.sequelize.query(`DROP TABLE players_teams;`, {
        transaction: transaction,
      });

      await queryInterface.sequelize.query(`DROP TABLE teams;`, {
        transaction: transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
