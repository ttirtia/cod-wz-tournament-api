"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Team extends Model {
    static associate(models) {
      Team.belongsToMany(models.Player, {
        as: "players",
        through: "players_teams",
        foreignKey: "team_id",
        otherKey: "player_id",
      });

      Team.belongsTo(models.Player, {
        as: "teamLeader",
      });

      Team.belongsTo(models.Tournament, {
        as: "tournament",
      });
    }
  }
  Team.init(
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
      placement: {
        type: DataTypes.INTEGER,
      },
    },
    {
      sequelize,
      modelName: "Team",
    }
  );

  return Team;
};
