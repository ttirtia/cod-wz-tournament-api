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

      Team.hasMany(models.Game, {
        as: "games",
        foreignKey: "team_id",
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
      points: {
        type: DataTypes.VIRTUAL,
        async get() {
          const games = await this.getGames();
          let points = games.length ? 0 : null;

          for (const game of await this.getGames()) {
            points += await game.points;
          }

          return points;
        },
        set(value) {
          throw new Error("Do not try to set the `points` value!");
        },
      },
    },
    {
      sequelize,
      modelName: "Team",
    }
  );

  return Team;
};
