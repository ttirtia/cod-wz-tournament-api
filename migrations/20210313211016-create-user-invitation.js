"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `CREATE TABLE invitations (
          id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          player_id      UUID REFERENCES players(id) ON DELETE CASCADE UNIQUE,
          is_admin       BOOLEAN NOT NULL DEFAULT false,
          valid_until    TIMESTAMP WITH TIME ZONE NOT NULL,
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
      await queryInterface.sequelize.query(`DROP TABLE invitations;`, {
        transaction: transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
