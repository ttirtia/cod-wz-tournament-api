"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Roster extends Model {
    static associate(models) {
      Roster.belongsToMany(models.Player, {
        as: "players",
        through: "players_rosters",
        foreignKey: "roster_id",
        otherKey: "player_id",
      });

      Roster.hasMany(models.Tournament, {
        as: "tournaments",
        foreignKey: "roster_id"
      })
    }
  }
  Roster.init(
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
    },
    {
      sequelize,
      modelName: "Roster",
    }
  );

  return Roster;
};
