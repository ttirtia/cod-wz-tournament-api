"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class GameResult extends Model {
    static associate(models) {
      GameResult.belongsTo(models.Game, { as: "game" });

      GameResult.belongsTo(models.Player, { as: "player" });
    }
  }
  GameResult.init(
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      kills: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "GameResult",
    }
  );

  return GameResult;
};
