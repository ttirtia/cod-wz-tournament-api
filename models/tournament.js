"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Tournament extends Model {
    static associate(models) {
      Tournament.belongsTo(models.Roster, {
        as: "roster",
      });

      Tournament.hasMany(models.Team, {
        as: "teams",
        foreignKey: "tournament_id",
      });
    }
  }
  Tournament.init(
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
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      gameLimit: {
        type: DataTypes.INTEGER,
        defaultValue: -1,
      },
      isOpen: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Tournament",
    }
  );

  return Tournament;
};
