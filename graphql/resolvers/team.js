"use strict";

const { Op } = require("sequelize");
const { Team, Player, Tournament } = require("../../models");

const logger = require("../../logger");

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

  const logFields = {
    team: team,
    players: players,
  };

  try {
    await team.setPlayers(
      await Player.findAll({
        where: {
          id: { [Op.in]: players || [] },
        },
      })
    );
  } catch (setPlayersError) {
    logger.error(setPlayersError, {
      fields: {
        type: "Team setPlayers",
        logFields,
      },
    });

    throw setPlayersError;
  }

  // `.reload()` is needed otherwise the instance would not be up-to-date
  return team.reload();
}

async function setTeamLeader(team, player) {
  if (typeof player === "undefined") return team;

  const logFields = {
    team: team,
    player: player,
  };

  try {
    await team.setTeamLeader(await Player.findByPk(player));
  } catch (setTeamLeaderError) {
    logger.error(setPlayersError, {
      fields: {
        type: "Team setTeamLeader",
        logFields,
      },
    });

    throw setTeamLeaderError;
  }

  // `.reload()` is needed otherwise the instance would not be up-to-date
  return team.reload();
}

async function setTournament(team, tournament) {
  if (typeof tournament === "undefined") return team;

  const logFields = {
    team: team,
    tournament: tournament,
  };

  try {
    await team.setTournament(await Tournament.findByPk(tournament));
  } catch (setTournamentError) {
    logger.error(setTournamentError, {
      fields: {
        type: "Team setTournament",
        logFields,
      },
    });

    throw setTournamentError;
  }

  // `.reload()` is needed otherwise the instance would not be up-to-date
  return team.reload();
}

module.exports = {
  Query: {
    async findTeams(root, { filter }, { user }, info) {
      if (!user) throw new Error("Unauthorized");

      const include = getInclude(info);

      const logFields = {
        filter: filter,
      };

      if (typeof filter === "undefined") {
        logger.debug("Team search");

        try {
          return await Team.findAll({
            order: [["name", "ASC"]],
            include: include,
          });
        } catch (findError) {
          logger.error(findError, {
            fields: { type: "Team search" },
          });

          throw findError;
        }
      }

      let queryFilter = [];

      if (typeof filter.id !== "undefined") {
        queryFilter.push({ id: { [Op.eq]: filter.id } });
      }

      if (typeof filter.name !== "undefined") {
        queryFilter.push({ name: { [Op.iLike]: "%" + filter.name + "%" } });
      }

      logger.debug("Team search", { fields: logFields });

      try {
        return await Team.findAll({
          where: {
            [Op.and]: queryFilter,
          },
          order: [["name", "ASC"]],
          include: include,
        });
      } catch (findError) {
        logger.error(findError, {
          fields: {
            type: "Team search",
            logFields,
          },
        });

        throw findError;
      }
    },
  },

  Mutation: {
    async createTeam(root, { team }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);

      const logFields = {
        team: team,
      };

      logger.info("Team creation", {
        fields: logFields,
      });

      let result;

      try {
        result = await Team.create(
          {
            name: team.name,
          },
          {
            include: include,
          }
        );
      } catch (createError) {
        logger.error(createError, {
          fields: {
            type: "Team creation",
            logFields,
          },
        });

        throw createError;
      }

      await setPlayers(result, team.players);
      await setTeamLeader(result, team.teamLeader);
      return setTournament(result, team.tournament);
    },

    async deleteTeam(root, { id }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      const logFields = {
        id: id,
      };

      logger.info("Team deletion", {
        fields: logFields,
      });

      try {
        return await Team.destroy({ where: { id: id } });
      } catch (deleteError) {
        logger.error(deleteError, {
          fields: {
            type: "Team deletion",
            logFields,
          },
        });

        throw deleteError;
      }
    },

    async updateTeam(root, { id, team }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);

      const logFields = {
        id: id,
        team: team,
      };

      let result;

      try {
        result = await Team.findOne({
          where: { id: id },
          include: include,
        });
      } catch (updateFindOneError) {
        logger.error(updateFindOneError, {
          fields: {
            type: "Team update - findOne",
            id: id,
          },
        });

        throw updateFindOneError;
      }

      if (typeof result === "undefined") {
        logger.error("Team not found", {
          fields: {
            type: "Team update",
            logFields,
          },
        });

        throw new Error("Team not found");
      }

      if (typeof team.name !== "undefined") result.name = team.name;
      if (typeof team.placement !== "undefined")
        result.placement = team.placement;

      logger.info("Team update", {
        fields: logFields,
      });

      try {
        await result.save();
      } catch (saveError) {
        logger.error(saveError, {
          fields: {
            type: "Team update",
            logFields,
          },
        });

        throw saveError;
      }

      await setPlayers(result, team.players);
      return await setTeamLeader(result, team.teamLeader);
    },
  },
};
