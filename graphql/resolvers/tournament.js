"use strict";

const { Op } = require("sequelize");
const { Tournament, Roster, Team, Player } = require("../../models");

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

  await tournament.setRoster(await Roster.findByPk(roster));

  // `.reload()` is needed otherwise the instance would not be up-to-date
  return tournament.reload();
}

module.exports = {
  Query: {
    async findTournaments(root, { filter }, { user }, info) {
      if (!user) throw new Error("Unauthorized");

      let include = getInclude(info);

      if (typeof filter === "undefined") {
        return await Tournament.findAll({
          order: [["name", "ASC"]],
          include: include,
        });
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

      return await Tournament.findAll({
        where: {
          [Op.and]: queryFilter,
        },
        order: [["name", "ASC"]],
        include: include,
      });
    },
  },

  Mutation: {
    async createTournament(root, { tournament }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      let include = getInclude(info);

      if (tournament.startDate >= tournament.endDate)
        throw new Error("startDate should be before endDate");

      let result = await Tournament.create(
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

      return await setRoster(result, tournament.roster);
    },

    async deleteTournament(root, { id }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      return await Tournament.destroy({ where: { id: id } });
    },

    async updateTournament(root, { id, tournament }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      let include = getInclude(info);

      let result = await Tournament.findOne({
        where: { id: id },
        include: include,
      });

      if (typeof result === "undefined")
        throw new Error("Tournament not found");

      let tmpStartDate = result.startDate.getTime();
      let tmpEndDate = result.endDate.getTime();

      if (typeof tournament.startDate !== "undefined")
        tmpStartDate = tournament.startDate;
      if (typeof tournament.endDate !== "undefined")
        tmpEndDate = tournament.endDate;

      if (tmpStartDate >= tmpEndDate)
        throw new Error("startDate should be before endDate");

      result.startDate = tmpStartDate;
      result.endDate = tmpEndDate;

      if (typeof tournament.name !== "undefined") result.name = tournament.name;
      if (typeof tournament.gameLimit !== "undefined")
        result.gameLimit = tournament.gameLimit;
      if (typeof tournament.isOpen !== "undefined")
        result.isOpen = tournament.isOpen;

      try {
        await result.save();
      } catch (saveError) {
        throw saveError;
      }

      return await setRoster(result, tournament.roster);
    },
  },
};
