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

      Player.belongsToMany(models.Team, {
        as: "teams",
        through: "players_teams",
        foreignKey: "player_id",
        otherKey: "team_id",
      });

      Player.hasMany(models.Team, {
        as: "teamLeaderships",
        foreignKey: "team_leader_id",
      });

      let userAssociation = Player.belongsToMany(models.User, {
        as: "user",
        through: "players_users",
        foreignKey: "player_id",
        otherKey: "user_id",
      });

      userAssociation.isMultiAssociation = false;
      userAssociation.isSingleAssociation = true;
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
    },
    {
      sequelize,
      modelName: "Player",
    }
  );

  return Player;
};
