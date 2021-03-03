"use strict";

const { Model } = require("sequelize");
const bcrypt = require("bcrypt");

const BCRYPT_ROUNDS = 5;

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      let playerAssociation = User.belongsToMany(models.Player, {
        as: "player",
        through: "players_users",
        foreignKey: "user_id",
        otherKey: "player_id",
      });

      playerAssociation.isMultiAssociation = false;
      playerAssociation.isSingleAssociation = true;
    }
  }
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      username: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.TEXT,
        allowNull: false,
        set(value) {
          this.setDataValue("password", bcrypt.hashSync(value, BCRYPT_ROUNDS));
        },
      },
      isAdmin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "User",
    }
  );

  return User;
};
