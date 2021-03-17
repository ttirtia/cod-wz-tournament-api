"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Game extends Model {
    static associate(models) {
      Game.belongsTo(models.Team, { as: "team" });

      Game.hasMany(models.GameResult, {
        as: "results",
        foreignKey: "game_id",
      });
    }
  }
  Game.init(
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      placement: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      points: {
        type: DataTypes.VIRTUAL,
        async get() {
          // TODO: remove this when PointsCalculationRules are implemented
          const placementBonuses = [6, 4, 3, 2, 1];

          let points = this.placement;

          if (this.placement <= placementBonuses.length)
            points -= placementBonuses[this.placement - 1];

          for (const result of await this.getResults()) {
            points -= result.kills;
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
      modelName: "Game",
    }
  );

  return Game;
};
