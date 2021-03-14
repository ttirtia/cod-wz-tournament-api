"use strict";

const { Op } = require("sequelize");
const { Player, Roster, Team, User } = require("../../models");

const logger = require("../../logger");

// Avoid eager-loading the associations if possible
function getInclude(info) {
  let include = [];

  info.fieldNodes[0].selectionSet.selections.forEach((field) => {
    if (field.name.value === "rosters") {
      include.push({
        model: Roster,
        as: "rosters",
        through: { attributes: [] },
      });
      return;
    }

    if (field.name.value === "teams") {
      include.push({
        model: Team,
        as: "teams",
        through: { attributes: [] },
      });
      return;
    }

    if (field.name.value === "teamLeaderships") {
      include.push({ model: Team, as: "teamLeaderships" });
      return;
    }

    if (field.name.value === "user") {
      include.push({ model: User, as: "user" });
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

  if (typeof filter.name !== "undefined") {
    queryFilter.push({ name: { [Op.iLike]: "%" + filter.name + "%" } });
  }

  return queryFilter;
}

module.exports = {
  Query: {
    //  #### Description
    //    Find all players or some players based on filter
    //
    //  #### Parameters
    //    * filter: criteria to use when searching for players
    //
    //  #### Returns
    //    * findPlayers: the list of players with matching criteria or all players if the filter is not defined
    async findPlayers(root, { filter }, { authUser }, info) {
      if (!authUser) throw new Error("Unauthorized");

      const include = getInclude(info);
      const order = [["name", "ASC"]];

      let logFields = { type: "Player search" };
      let where = null;

      if (typeof filter !== "undefined") {
        where = { [Op.and]: getFilter(filter) };
        logFields.filter = filter;
      }

      logger.debug("Player search", { logFields });

      try {
        return await Player.findAll({ where, order, include });
      } catch (findError) {
        if (logFields === null) logFields = {};
        logger.error(findError, { logFields });
        throw findError;
      }
    },
  },

  Mutation: {
    //  #### Description
    //    Create a new player
    //
    //  #### Parameters
    //    * player: the player to create
    //
    //  #### Returns
    //    * createPlayer: the newly created player
    async createPlayer(root, { player }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);
      const logFields = { player, type: "Player creation" };

      logger.info("Player creation", { logFields });

      try {
        return await Player.create({ name: player.name }, { include });
      } catch (createError) {
        logger.error(createError, { logFields });
        throw createError;
      }
    },

    //  #### Description
    //    Delete an existing player
    //
    //  #### Parameters
    //    * id: id of the player to delete
    //
    //  #### Returns
    //    * deletePlayer: boolean describing if the operation was successful or not
    async deletePlayer(root, { id }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const logFields = { id, type: "Player deletion" };

      logger.info("Player deletion", { logFields });

      try {
        return await Player.destroy({ where: { id } });
      } catch (deleteError) {
        logger.error(deleteError, { logFields });
        throw deleteError;
      }
    },

    //  #### Description
    //    Update an existing player
    //
    //  #### Parameters
    //    * id: the player id
    //    * player: object composed of attributes/values to update
    //
    //  #### Returns
    //    * updatePlayer: the updated player
    async updatePlayer(root, { id, player }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);
      const logFields = { id, player, type: "Player update" };

      let result = await Player.findByPk(id, { include });

      if (result === null) {
        logger.error("Player not found", { logFields });
        throw new Error("Player not found");
      }

      logger.info("Player update", { logFields });

      // We need to map this by hand and use the `save()` function
      // because for some reason the object return by `Player.update()`
      // manages the User association like an array
      // which means the response would always have a null `user` field
      if (typeof player.name !== "undefined") result.name = player.name;

      try {
        return await result.save();
      } catch (updateError) {
        logger.error(updateError, { logFields });
        throw updateError;
      }
    },
  },
};
