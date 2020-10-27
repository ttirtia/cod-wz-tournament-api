"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Player extends Model {
    static associate(models) {
      Player.belongsToMany(models.Roster, {
        as: "rosters",
        through: "players_rosters",
        foreignKey: "player_id",
        otherKey: "roster_id",
      });
    }
  }
  Player.init(
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      activisionId: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
    },
    {
      sequelize,
      modelName: "Player",
    }
  );

  return Player;
};
