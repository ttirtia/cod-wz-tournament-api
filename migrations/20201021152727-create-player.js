"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `CREATE TABLE players (
          id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name           TEXT UNIQUE NOT NULL,
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
      await queryInterface.sequelize.query(`DROP TABLE players;`, {
        transaction: transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
