"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
        { transaction: transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE TABLE users (
          id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          username     TEXT UNIQUE NOT NULL,
          password     TEXT NOT NULL,
          is_admin     BOOLEAN NOT NULL DEFAULT false,
          created_at   TIMESTAMP WITH TIME ZONE NOT NULL,
          updated_at   TIMESTAMP WITH TIME ZONE NOT NULL
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
      await queryInterface.sequelize.query(`DROP TABLE users;`, {
        transaction: transaction,
      });

      await queryInterface.sequelize.query(`DROP EXTENSION "uuid-ossp";`, {
        transaction: transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
