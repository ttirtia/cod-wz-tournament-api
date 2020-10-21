"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Player extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
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
