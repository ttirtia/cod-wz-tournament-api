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
          "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "username"    TEXT UNIQUE NOT NULL,
          "email"       TEXT UNIQUE NOT NULL,
          "password"    TEXT NOT NULL,
          "isAdmin"     BOOLEAN NOT NULL DEFAULT false,
          "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL,
          "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL
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
