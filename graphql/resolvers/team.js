"use strict";

const { Op } = require("sequelize");
const { Team, Player, Tournament } = require("../../models");

const PLAYER_INCLUDE = {
  model: Player,
  as: "players",
  through: {
    attributes: [],
  },
};

const LEADER_INCLUDE = {
  model: Player,
  as: "teamLeader",
};

const TOURNAMENT_INCLUDE = {
  model: Tournament,
  as: "tournament",
};

// Avoid eager-loading if possible
function getInclude(info) {
  let include = [];
  
  if (
    info.fieldNodes[0].selectionSet.selections.find(
      (field) => field.name.value === "players"
    )
  )
    include.push(PLAYER_INCLUDE);

  if (
    info.fieldNodes[0].selectionSet.selections.find(
      (field) => field.name.value === "teamLeader"
    )
  )
    include.push(LEADER_INCLUDE);

  if (
    info.fieldNodes[0].selectionSet.selections.find(
      (field) => field.name.value === "tournament"
    )
  )
    include.push(TOURNAMENT_INCLUDE);

  return include;
}

async function setPlayers(team, players) {
  if (typeof players === "undefined") return team;

  await team.setPlayers(
    await Player.findAll({
      where: {
        id: { [Op.in]: players || [] },
      },
    })
  );

  // `.reload()` is needed otherwise the instance would not be up-to-date
  return team.reload();
}

async function setTeamLeader(team, player) {
  if (typeof player === "undefined") return team;

  await team.setTeamLeader(await Player.findByPk(player));

  // `.reload()` is needed otherwise the instance would not be up-to-date
  return team.reload();
}

async function setTournament(team, tournament) {
  if (typeof tournament === "undefined") return team;

  await team.setTournament(await Tournament.findByPk(tournament));

  // `.reload()` is needed otherwise the instance would not be up-to-date
  return team.reload();
}

module.exports = {
  Query: {
    async findTeams(root, { filter }, { user }, info) {
      if (!user) throw new Error("Unauthorized");

      let include = getInclude(info);

      console.log(include);

      if (typeof filter === "undefined") {
        return await Team.findAll({
          order: [["name", "ASC"]],
          include: include,
        });
      }

      let queryFilter = [];

      if (typeof filter.id !== "undefined") {
        queryFilter.push({ id: { [Op.eq]: filter.id } });
      }

      if (typeof filter.name !== "undefined") {
        queryFilter.push({ name: { [Op.iLike]: "%" + filter.name + "%" } });
      }

      return await Team.findAll({
        where: {
          [Op.and]: queryFilter,
        },
        order: [["name", "ASC"]],
        include: include,
      });
    },
  },

  Mutation: {
    async createTeam(root, { team }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      let include = getInclude(info);

      let result = await Team.create(
        {
          name: team.name,
        },
        {
          include: include,
        }
      );

      await setPlayers(result, team.players);
      await setTeamLeader(result, team.teamLeader);
      return setTournament(result, team.tournament);
    },

    async deleteTeam(root, { id }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      return await Team.destroy({ where: { id: id } });
    },

    async updateTeam(root, { id, team }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      let include = getInclude(info);

      let result = await Team.findOne({
        where: { id: id },
        include: include,
      });

      if (typeof result === "undefined") throw new Error("Team not found");

      if (typeof team.name !== "undefined") result.name = team.name;
      if (typeof team.placement !== "undefined") result.placement = team.placement;

      try {
        await result.save();
      } catch (saveError) {
        throw saveError;
      }

      await setPlayers(result, team.players);
      return await setTeamLeader(result, team.teamLeader);
    },
  },
};
