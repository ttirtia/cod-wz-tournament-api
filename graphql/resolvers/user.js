"use strict";

const { Op } = require("sequelize");
const { User, Player, sequelize } = require("../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const logger = require("../../logger");

const JWT_TOKEN_TIMEOUT = "1d";

const PLAYER_INCLUDE = {
  model: Player,
  as: "player",
};

// Avoid eager-loading if possible
function getInclude(info) {
  let include = [];

  if (
    info.fieldNodes[0].selectionSet.selections.find(
      (field) => field.name.value === "player"
    )
  )
    include.push(PLAYER_INCLUDE);

  return include;
}

module.exports = {
  Query: {
    async findUsers(root, { filter }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);

      const logFields = {
        filter: filter,
      };

      if (typeof filter === "undefined") {
        logger.debug("User search");

        try {
          return await User.findAll({
            order: [["username", "ASC"]],
            include: include,
          });
        } catch (findError) {
          logger.error(findError, {
            fields: { type: "User search" },
          });

          throw findError;
        }
      }

      let queryFilter = [];

      if (typeof filter.id !== "undefined") {
        queryFilter.push({ id: { [Op.eq]: filter.id } });
      }

      if (typeof filter.username !== "undefined") {
        queryFilter.push({
          username: { [Op.iLike]: "%" + filter.username + "%" },
        });
      }

      if (typeof filter.isAdmin !== "undefined") {
        queryFilter.push({
          isAdmin: { [Op.eq]: filter.isAdmin },
        });
      }

      logger.debug("User search", { fields: logFields });

      try {
        return await User.findAll({
          where: {
            [Op.and]: queryFilter,
          },
          order: [["username", "ASC"]],
          include: include,
        });
      } catch (findError) {
        logger.error(findError, {
          fields: {
            type: "User search",
            logFields,
          },
        });

        throw findError;
      }
    },
  },

  Mutation: {
    async login(root, { username, password }, { user }, info) {
      if (user) throw new Error("Already logged in");

      const logFields = {
        username: username,
      };

      const res = await User.findOne({ where: { username: username } });
      if (res === null) {
        logger.error("Unable to login - user not found", {
          fields: {
            type: "User login",
            logFields,
          },
        });

        throw new Error("Unable to login");
      }

      const isMatch = bcrypt.compareSync(password, res.password);
      if (!isMatch) {
        logger.error("Unable to login - wrong password", {
          fields: {
            type: "User login",
            logFields,
          },
        });

        throw new Error("Unable to login");
      }

      logger.debug("User login", { fields: logFields });

      return jwt.sign(
        {
          id: res.id,
          username: res.username,
          isAdmin: res.isAdmin,
        },
        process.env.JWT_SIGNING_KEY,
        {
          expiresIn: JWT_TOKEN_TIMEOUT,
        }
      );
    },
  },
};
