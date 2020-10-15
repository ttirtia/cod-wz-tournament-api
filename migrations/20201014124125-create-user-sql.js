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
        `CREATE TABLE "Users" (
          id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          username          TEXT UNIQUE NOT NULL,
          email             TEXT UNIQUE NOT NULL,
          password          TEXT NOT NULL,
          is_admin          BOOLEAN NOT NULL DEFAULT false,
          creation_time     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          modification_time TIMESTAMP WITH TIME ZONE
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
      await queryInterface.sequelize.query(`DROP TABLE "Users";`, {
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
