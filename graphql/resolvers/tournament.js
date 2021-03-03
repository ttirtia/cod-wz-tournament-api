"use strict";

const { Op } = require("sequelize");
const { Tournament, Roster, Team, sequelize } = require("../../models");

const logger = require("../../logger");

const ROSTER_INCLUDE = {
  model: Roster,
  as: "roster",
};

const TEAM_INCLUDE = {
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
};

// Avoid eager-loading if possible
function getInclude(info) {
  let include = [];

  if (
    info.fieldNodes[0].selectionSet.selections.find(
      (field) => field.name.value === "roster"
    )
  )
    include.push(ROSTER_INCLUDE);

  if (
    info.fieldNodes[0].selectionSet.selections.find(
      (field) => field.name.value === "teams"
    )
  )
    include.push(TEAM_INCLUDE);

  return include;
}

async function setRoster(tournament, roster) {
  if (typeof roster === "undefined" || roster === null) return tournament;

  const logFields = {
    tournament: tournament,
    roster: roster,
  };

  try {
    await tournament.setRoster(await Roster.findByPk(roster));
  } catch (setRosterError) {
    logger.error(setRosterError, {
      fields: {
        type: "Tournament setRoster",
        logFields,
      },
    });

    throw setRosterError;
  }

  // `.reload()` is needed otherwise the instance would not be up-to-date
  return tournament.reload();
}

module.exports = {
  Query: {
    async findTournaments(root, { filter }, { user }, info) {
      if (!user) throw new Error("Unauthorized");

      const include = getInclude(info);

      const logFields = {
        filter: filter,
      };

      if (typeof filter === "undefined") {
        logger.debug("Tournament search");

        try {
          return await Tournament.findAll({
            order: [["name", "ASC"]],
            include: include,
          });
        } catch (findError) {
          logger.error(findError, {
            fields: { type: "Tournament search" },
          });

          throw findError;
        }
      }

      let queryFilter = [];

      if (typeof filter.id !== "undefined") {
        queryFilter.push({ id: filter.id });
      }

      if (typeof filter.name !== "undefined") {
        queryFilter.push({ name: { [Op.iLike]: "%" + filter.name + "%" } });
      }

      if (typeof filter.startDate !== "undefined") {
        queryFilter.push({
          startDate: { [Op.gte]: filter.startDate },
        });
      }

      if (typeof filter.endDate !== "undefined") {
        queryFilter.push({
          endDate: { [Op.lte]: filter.endDate },
        });
      }

      if (typeof filter.isOpen !== "undefined") {
        queryFilter.push({ isOpen: filter.isOpen });
      }

      logger.debug("Tournament search", { fields: logFields });

      try {
        return await Tournament.findAll({
          where: {
            [Op.and]: queryFilter,
          },
          order: [["name", "ASC"]],
          include: include,
        });
      } catch (findError) {
        logger.error(findError, {
          fields: {
            type: "Tournament search",
            logFields,
          },
        });

        throw findError;
      }
    },
  },

  Mutation: {
    async createTournament(root, { tournament }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      if (tournament.startDate >= tournament.endDate) {
        logger.error("startDate should be before endDate", {
          fields: {
            type: "Tournament creation",
            startDate: tournament.startDate,
            endDate: tournament.endDate,
          },
        });

        throw new Error("startDate should be before endDate");
      }

      const include = getInclude(info);

      const logFields = {
        tournament: tournament,
      };

      logger.info("Tournament creation", {
        fields: logFields,
      });

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
          {
            include: include,
          }
        );
      } catch (createError) {
        logger.error(createError, {
          fields: {
            type: "Tournament creation",
            logFields,
          },
        });

        throw createError;
      }

      return await setRoster(result, tournament.roster);
    },

    async deleteTournament(root, { id }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      const logFields = {
        id: id,
      };

      logger.info("Tournament deletion", {
        fields: logFields,
      });

      try {
        return await Tournament.destroy({ where: { id: id } });
      } catch (deleteError) {
        logger.error(deleteError, {
          fields: {
            type: "Tournament deletion",
            logFields,
          },
        });

        throw deleteError;
      }
    },

    async updateTournament(root, { id, tournament }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);

      const logFields = {
        id: id,
        tournament: tournament,
      };

      let result;

      try {
        result = await Tournament.findOne({
          where: { id: id },
          include: include,
        });
      } catch (updateFindOneError) {
        logger.error(updateFindOneError, {
          fields: {
            type: "Tournament update - findOne",
            id: id,
          },
        });

        throw updateFindOneError;
      }

      if (typeof result === "undefined") {
        logger.error("Tournament not found", {
          fields: {
            type: "Tournament update",
            logFields,
          },
        });

        throw new Error("Tournament not found");
      }

      let tmpStartDate = result.startDate.getTime();
      let tmpEndDate = result.endDate.getTime();

      if (typeof tournament.startDate !== "undefined")
        tmpStartDate = tournament.startDate;
      if (typeof tournament.endDate !== "undefined")
        tmpEndDate = tournament.endDate;

      if (tmpStartDate >= tmpEndDate) {
        logger.error("startDate should be before endDate", {
          fields: {
            type: "Tournament update",
            startDate: tmpStartDate,
            endDate: tmpEndDate,
          },
        });

        throw new Error("startDate should be before endDate");
      }

      result.startDate = tmpStartDate;
      result.endDate = tmpEndDate;

      if (typeof tournament.name !== "undefined") result.name = tournament.name;
      if (typeof tournament.gameLimit !== "undefined")
        result.gameLimit = tournament.gameLimit;
      if (typeof tournament.isOpen !== "undefined")
        result.isOpen = tournament.isOpen;

      logger.info("Tournament update", {
        fields: logFields,
      });

      try {
        await result.save();
      } catch (saveError) {
        logger.error(saveError, {
          fields: {
            type: "Tournament update",
            logFields,
          },
        });

        throw saveError;
      }

      return await setRoster(result, tournament.roster);
    },
  },
};
