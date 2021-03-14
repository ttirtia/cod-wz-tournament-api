"use strict";

const { Op } = require("sequelize");
const { Roster, Player, sequelize } = require("../../models");

const logger = require("../../logger");

// Avoid eager-loading the associations if possible
function getInclude(info) {
  let include = [];

  info.fieldNodes[0].selectionSet.selections.forEach((field) => {
    if (field.name.value === "players") {
      include.push({
        model: Player,
        as: "players",
        through: { attributes: [] },
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

  if (typeof filter.name !== "undefined") {
    queryFilter.push({ name: { [Op.iLike]: "%" + filter.name + "%" } });
  }

  return queryFilter;
}

//  #### Description
//    Associate players to the roster
//
//  #### Parameters
//    * roster: the roster in which to set the players
//    * players: list of players to set in the roster
//    * transaction: the related database transaction
//
//  #### Returns
//    * roster: the roster updated with the players
async function setPlayers(roster, players, transaction) {
  if (typeof players === "undefined") return roster;

  const logFields = { roster, players };

  try {
    await roster.setPlayers(
      await Player.findAll({
        where: { id: { [Op.in]: players } },
      }),
      { transaction }
    );
  } catch (setPlayersError) {
    logFields.type = "Roster setPlayers";
    logger.error(setPlayersError, logFields);
    throw setPlayersError;
  }

  return roster;
}

module.exports = {
  Query: {
    //  #### Description
    //    Find all rosters or some rosters based on filter
    //
    //  #### Parameters
    //    * filter: criteria to use when searching for rosters
    //
    //  #### Returns
    //    * findRosters: the list of rosters with matching criteria or all rosters if the filter is not defined
    async findRosters(root, { filter }, { authUser }, info) {
      if (!authUser) throw new Error("Unauthorized");

      const include = getInclude(info);
      const order = [["name", "ASC"]];

      let logFields = null;
      let where = null;

      if (typeof filter !== "undefined") {
        where = { [Op.and]: getFilter(filter) };
        logFields = { filter };
      }

      logger.debug("Roster search", { logFields });

      try {
        return await Roster.findAll({ where, order, include });
      } catch (findError) {
        if (logFields === null) logFields = {};
        logFields.type = "Roster search";
        logger.error(findError, { logFields });
        throw findError;
      }
    },
  },

  Mutation: {
    //  #### Description
    //    Create a new roster
    //
    //  #### Parameters
    //    * roster: the roster to create
    //
    //  #### Returns
    //    * createRoster: the newly created roster
    async createRoster(root, { roster }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);
      const logFields = { roster };

      logger.info("Roster creation", { logFields });

      let result;

      try {
        result = await Roster.create({ name: roster.name }, { include });
      } catch (createError) {
        logFields.type = "Roster creation";
        logger.error(createError, { logFields });
        throw createError;
      }

      const transaction = await sequelize.transaction();
      try {
        await setPlayers(result, roster.players, transaction);
      } catch (associationsError) {
        await transaction.rollback();
        await Roster.destroy({ where: { id: result.id } });
        throw associationsError;
      }

      await transaction.commit();
      return result.reload();
    },

    //  #### Description
    //    Delete an existing roster
    //
    //  #### Parameters
    //    * id: id of the roster to delete
    //
    //  #### Returns
    //    * deleteRoster: boolean describing if the operation was successful or not
    async deleteRoster(root, { id }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const logFields = { id };

      logger.info("Roster deletion", { logFields });

      try {
        return await Roster.destroy({ where: { id } });
      } catch (deleteError) {
        logFields.type = "Roster deletion";
        logger.error(deleteError, { logFields });
        throw deleteError;
      }
    },

    //  #### Description
    //    Update an existing roster
    //
    //  #### Parameters
    //    * id: the roster id
    //    * roster: object composed of attributes/values to update
    //
    //  #### Returns
    //    * updateRoster: the updated roster
    async updateRoster(root, { id, roster }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);
      const logFields = { id, roster };

      let result = await Roster.findByPk(id, { include });

      if (result === null) {
        logFields.type = "Roster update - roster not found";
        logger.error("Roster update - roster not found", { logFields });
        throw new Error("Roster not found");
      }

      logger.info("Roster update", { logFields });

      // We need to map this by hand and use the `save()` function
      // because for some reason the object return by `Roster.update()`
      // manages the Player association like an array
      // which means the response would always have a null `players` field
      if (typeof roster.name !== "undefined") result.name = roster.name;

      const transaction = await sequelize.transaction();

      try {
        await result.save({ transaction });
      } catch (updateError) {
        await transaction.rollback();
        logFields.type = "Roster update";
        logger.error(updateError, { logFields });
        throw updateError;
      }

      try {
        await setPlayers(result, roster.players, transaction);
      } catch (associationsError) {
        await transaction.rollback();
        throw associationsError;
      }

      await transaction.commit();

      // `.reload()` is needed otherwise the instance would not be up-to-date
      return result.reload();
    },
  },
};
