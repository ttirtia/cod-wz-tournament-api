"use strict";

const { Op } = require("sequelize");
const { Tournament, Roster, Team, sequelize } = require("../../models");

const logger = require("../../logger");

// Avoid eager-loading the associations if possible
function getInclude(info) {
  let include = [];

  info.fieldNodes[0].selectionSet.selections.forEach((field) => {
    if (field.name.value === "roster") {
      include.push({ model: Roster, as: "roster" });
      return;
    }

    if (field.name.value === "teams") {
      include.push({
        model: Team,
        as: "teams",
        // TODO: decide if we want nested includes
        /*
        include: [
          {
            model: Player,
            as: "players"
          },
          {
            model: Player,
            as: "teamLeader"
          }
        ],
        */
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
//    Associate a roster to the tournament
//
//  #### Parameters
//    * tournament: the tournament in which to set the roster
//    * roster: the roster to associate to the tournament
//    * transaction: the related database transaction
//
//  #### Returns
//    * tournament: the tournament updated with its roster
async function setRoster(tournament, roster, transaction) {
  if (typeof roster === "undefined") return tournament;

  const logFields = { tournament, roster, type: "Tournament setRoster" };

  try {
    await tournament.setRoster(await Roster.findByPk(roster), { transaction });
  } catch (setRosterError) {
    logger.error(setRosterError, { logFields });
    throw setRosterError;
  }

  return tournament;
}

module.exports = {
  Query: {
    //  #### Description
    //    Find all tournaments or some tournaments based on filter
    //
    //  #### Parameters
    //    * filter: criteria to use when searching for tournaments
    //
    //  #### Returns
    //    * findTournaments: the list of tournaments with matching criteria or all tournaments if the filter is not defined
    async findTournaments(root, { filter }, { authUser }, info) {
      if (!authUser) throw new Error("Unauthorized");

      const include = getInclude(info);
      const order = [["name", "ASC"]];

      let logFields = { type: "Tournament search" };
      let where = null;

      if (typeof filter !== "undefined") {
        where = { [Op.and]: getFilter(filter) };
        logFields.filter = filter;
      }

      logger.debug("Tournament search", { logFields });

      try {
        return await Tournament.findAll({ where, order, include });
      } catch (findError) {
        if (logFields === null) logFields = {};
        logger.error(findError, { logFields });
        throw findError;
      }
    },
  },

  Mutation: {
    //  #### Description
    //    Create a new tournament
    //
    //  #### Parameters
    //    * tournament: the tournament to create
    //
    //  #### Returns
    //    * createTournament: the newly created tournament
    async createTournament(root, { tournament }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const logFields = { tournament, type: "Tournament creation" };

      if (tournament.startDate >= tournament.endDate) {
        logger.error("startDate should be before endDate", { logFields });
        throw new Error("startDate should be before endDate");
      }

      const include = getInclude(info);

      logger.info("Tournament creation", { logFields });

      let result;

      try {
        result = await Tournament.create(
          {
            name: tournament.name,
            startDate: tournament.startDate,
            endDate: tournament.endDate,
            gameLimit: tournament.gameLimit,
            isOpen: tournament.isOpen,
          },
          { include }
        );
      } catch (createError) {
        logger.error(createError, { logFields });
        throw createError;
      }

      const transaction = await sequelize.transaction();
      try {
        await setRoster(result, tournament.roster, transaction);
      } catch (associationsError) {
        await transaction.rollback();
        await Tournament.destroy({ where: { id: result.id } });
        throw associationsError;
      }

      await transaction.commit();
      return result.reload();
    },

    //  #### Description
    //    Delete an existing tournament
    //
    //  #### Parameters
    //    * id: id of the tournament to delete
    //
    //  #### Returns
    //    * deleteTournament: boolean describing if the operation was successful or not
    async deleteTournament(root, { id }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const logFields = { id, type: "Tournament deletion" };

      logger.info("Tournament deletion", { logFields });

      try {
        return await Tournament.destroy({ where: { id } });
      } catch (deleteError) {
        logger.error(deleteError, { logFields });
        throw deleteError;
      }
    },

    //  #### Description
    //    Update an existing tournament
    //
    //  #### Parameters
    //    * id: the tournament id
    //    * tournament: object composed of attributes/values to update
    //
    //  #### Returns
    //    * updateTournament: the updated tournament
    async updateTournament(root, { id, tournament }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);
      const logFields = { id, tournament, type: "Tournament update" };

      let result = await Tournament.findByPk(id, { include });

      if (result === null) {
        logger.error("Tournament not found", { logFields });
        throw new Error("Tournament not found");
      }

      logger.info("Tournament update", { logFields });

      // We need to map this by hand and use the `save()` function
      // because for some reason the object return by `Tournament.update()`
      // manages the Roster association like an array
      // which means the response would always have a null `roster` field
      if (typeof tournament.name !== "undefined") result.name = team.name;
      if (typeof tournament.name !== "undefined") result.name = tournament.name;
      if (typeof tournament.startDate !== "undefined")
        result.startDate = tournament.startDate;
      if (typeof tournament.endDate !== "undefined")
        result.endDate = tournament.endDate;
      if (typeof tournament.gameLimit !== "undefined")
        result.gameLimit = tournament.gameLimit;
      if (typeof tournament.isOpen !== "undefined")
        result.isOpen = tournament.isOpen;

      const transaction = await sequelize.transaction();

      try {
        await result.save({ transaction });
      } catch (updateError) {
        await transaction.rollback();
        logger.error(updateError, { logFields });
        throw updateError;
      }

      try {
        await setRoster(result, tournament.roster, transaction);
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
