"use strict";

const { Op } = require("sequelize");
const { User, Player, Invitation, Team, Tournament, Game, GameResult, sequelize } = require("../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const logger = require("../../logger");

const JWT_TOKEN_TIMEOUT = "1d";

// Avoid eager-loading the associations if possible
function getInclude(info) {
  let include = [];

  info.fieldNodes[0].selectionSet.selections.forEach((field) => {
    if (field.name.value === "player") {
      include.push({
        model: Player,
        as: "player",
        include: [
          {
            model: Team,
            as: "teams",
            include: [
              {
                model: Player,
                as: "players",
              },
              {
                model: Player,
                as: "teamLeader",
              },
              {
                model: Tournament,
                as: "tournament",
              },
            {
              model: Game,
              as: "games",
              include: [{
                model: GameResult,
                as: "results",
                include: [{
                  model: Player,
                  as: "player"
                }]
              }]
            }
            ],
          },
        ],
      });
      return;
    }
  });

  return include;
}

// Build the query filter based on provided fields
function getFilter(filter) {
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

  return queryFilter;
}

//  #### Description
//    Associate a player to the user
//
//  #### Parameters
//    * user: the user for which to set the related player
//    * player: player id to link to the user
//    * transaction: the related database transaction
//
//  #### Returns
//    * user: the user updated with its player
async function setPlayer(user, player, transaction) {
  if (typeof player === "undefined") return user;

  const logFields = { user, player, type: "User setPlayer" };

  try {
    await user.setPlayer(await Player.findByPk(player), { transaction });
  } catch (setPlayerError) {
    logger.error(setPlayerError, { logFields });
    throw setPlayerError;
  }

  return user;
}

module.exports = {
  Query: {
    //  #### Description
    //    Find all users or some users based on filter
    //
    //  #### Parameters
    //    * filter: criteria to use when searching for users
    //
    //  #### Returns
    //    * findUsers: the list of users with matching criteria or all users if the filter is not defined
    async findUsers(root, { filter }, { authUser }, info) {
      if (!authUser) throw new Error("Unauthorized");

      const include = getInclude(info);
      const order = [["username", "ASC"]];

      let logFields = { type: "User search" };
      let where = null;

      if (typeof filter !== "undefined") {
        where = { [Op.and]: getFilter(filter) };
        logFields.filter = filter;
      }

      logger.debug("User search", { logFields });

      try {
        return await User.findAll({ where, order, include });
      } catch (findError) {
        if (logFields === null) logFields = {};
        logger.error(findError, { logFields });
        throw findError;
      }
    },
  },

  Mutation: {
    //  #### Description
    //    Login using a user's credentials
    //
    //  #### Parameters
    //    * username: the user's username
    //    * password: the user's password
    //
    //  #### Returns
    //    * login: a signed JWT token that can be used for further requests
    async login(root, { username, password }, { authUser }, info) {
      if (authUser) throw new Error("Already logged in");

      const logFields = { username, type: "User login" };

      const result = await User.findOne({ where: { username } });
      if (result === null) {
        logger.error("Unable to login - user not found", { logFields });
        throw new Error("Unable to login");
      }

      const isMatch = bcrypt.compareSync(password, result.password);
      if (!isMatch) {
        logger.error("Unable to login - wrong password", { logFields });
        throw new Error("Unable to login");
      }

      logger.debug("User login", { logFields });

      return jwt.sign(
        {
          id: result.id,
          username: result.username,
          isAdmin: result.isAdmin,
        },
        process.env.JWT_SIGNING_KEY,
        { expiresIn: JWT_TOKEN_TIMEOUT }
      );
    },

    //  #### Description
    //    Create a new user
    //
    //  #### Parameters
    //    * user: the user to create
    //
    //  #### Returns
    //    * createUser: the newly created user
    async createUser(root, { invitationId, user }, { authUser }, info) {
      if (typeof invitationId === "undefined" || invitationId === null)
        throw new Error("An invitation is required to sign up");

      const invitationWhereClause = {
        id: { [Op.eq]: invitationId },
        validUntil: { [Op.gte]: new Date() },
      };

      const invitation = await Invitation.findOne({
        where: { [Op.and]: invitationWhereClause },
        include: { model: Player, as: "player" },
      });

      if (invitation === null)
        throw new Error("The inviation has expired or doesn't exist");

      const include = getInclude(info);
      const logFields = { user, type: "User creation" };

      logger.info("User creation", { logFields });

      let result;

      try {
        result = await User.create(
          {
            username: user.username,
            password: user.password,
            isAdmin: invitation.isAdmin,
          },
          { include }
        );
      } catch (createError) {
        logger.error(createError, { logFields });
        throw createError;
      }

      const transaction = await sequelize.transaction();
      try {
        await result.setPlayer(await invitation.getPlayer());
      } catch (associationsError) {
        await transaction.rollback();
        await User.destroy({ where: { id: result.id } });
        throw associationsError;
      }

      await transaction.commit();
      await invitation.destroy();
      return result.reload();
    },

    //  #### Description
    //    Delete an existing user
    //
    //  #### Parameters
    //    * id: id of the user to delete
    //
    //  #### Returns
    //    * deleteUser: boolean describing if the operation was successful or not
    async deleteUser(root, { id }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const logFields = { id, type: "User deletion" };

      logger.info("User deletion", { logFields });

      try {
        return await User.destroy({ where: { id } });
      } catch (deleteError) {
        logger.error(deleteError, { logFields });
        throw deleteError;
      }
    },

    //  #### Description
    //    Update an existing user
    //
    //  #### Parameters
    //    * id: the user id
    //    * user: object composed of attributes/values to update
    //
    //  #### Returns
    //    * updateUser: the updated user
    async updateUser(root, { id, user }, { authUser }, info) {
      if (!authUser || (!authUser.isAdmin && id != authUser.id))
        throw new Error("Unauthorized");

      const include = getInclude(info);
      const logFields = { id, user, type: "User update" };

      let result = await User.findByPk(id, { include });

      if (result === null) {
        logger.error("User not found", { logFields });
        throw new Error("User not found");
      }

      logger.info("User update", { logFields });

      // We need to map these by hand and use the `save()` function
      // because for some reason the object return by `User.update()`
      // manages the Player association like an array
      // which means the response would always have a null `player` field
      if (typeof user.username !== "undefined") result.username = user.username;
      if (typeof user.password !== "undefined") result.password = user.password;

      // Only an administrator can change the "isAdmin" attribute
      if (authUser.isAdmin) {
        if (typeof user.isAdmin !== "undefined") result.isAdmin = user.isAdmin;
      }

      const transaction = await sequelize.transaction();

      try {
        await result.save({ transaction });
      } catch (updateError) {
        await transaction.rollback();
        logger.error(updateError, { logFields });
        throw updateError;
      }

      // Only an administrator can change the link between a User and a Player
      if (authUser.isAdmin) {
        try {
          await setPlayer(result, user.player, transaction);
        } catch (associationsError) {
          await transaction.rollback();
          throw associationsError;
        }
      }

      await transaction.commit();

      // `.reload()` is needed otherwise the instance would not be up-to-date
      return result.reload();
    },
  },
};
