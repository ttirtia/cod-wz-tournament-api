"use strict";

const { Op } = require("sequelize");
const { Team, Player, Tournament, sequelize } = require("../../models");

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

    if (field.name.value === "teamLeader") {
      include.push({ model: Player, as: "teamLeader" });
      return;
    }

    if (field.name.value === "tournament") {
      include.push({ model: Tournament, as: "tournament" });
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
//    Associate players to the team
//
//  #### Parameters
//    * team: the team in which to set the players
//    * players: list of players to set in the team
//    * transation: the related database transaction
//
//  #### Returns
//    * team: the team updated with the players
async function setPlayers(team, players, transaction) {
  if (typeof players === "undefined") return team;

  const logFields = { team, players };

  try {
    await team.setPlayers(
      await Player.findAll({
        where: { id: { [Op.in]: players } },
      }),
      { transaction }
    );
  } catch (setPlayersError) {
    logFields.type = "Team setPlayers";
    logger.error(setPlayersError, { logFields });
    throw setPlayersError;
  }

  return team;
}

//  #### Description
//    Associate a player as team leader to the team
//
//  #### Parameters
//    * team: the team in which to set the team leader
//    * player: the player to set as team leader
//    * transation: the related database transaction
//
//  #### Returns
//    * team: the team updated with the team leader
async function setTeamLeader(team, player, transaction) {
  if (typeof player === "undefined") return team;

  const logFields = { team, player };

  try {
    await team.setTeamLeader(await Player.findByPk(player), { transaction });
  } catch (setTeamLeaderError) {
    logFields.type = "Team setTeamLeader";
    logger.error(setTeamLeaderError, { logFields });
    throw setTeamLeaderError;
  }

  return team;
}

//  #### Description
//    Associate a tournament to the team
//
//  #### Parameters
//    * team: the team for which to set the related tournament
//    * tournament: the tournament the team is a part of
//    * transation: the related database transaction
//
//  #### Returns
//    * team: the team updated with its tournament
async function setTournament(team, tournament, transaction) {
  if (typeof tournament === "undefined") return team;

  const logFields = { team, tournament };

  try {
    await team.setTournament(await Tournament.findByPk(tournament), {
      transaction,
    });
  } catch (setTournamentError) {
    logFields.type = "Team setTournament";
    logger.error(setTournamentError, { logFields });
    throw setTournamentError;
  }

  return team;
}

module.exports = {
  Query: {
    //  #### Description
    //    Find all teams or some teams based on filter
    //
    //  #### Parameters
    //    * filter: criteria to use when searching for teams
    //
    //  #### Returns
    //    * findTeams: the list of teams with matching criteria or all teams if the filter is not defined
    async findTeams(root, { filter }, { authUser }, info) {
      if (!authUser) throw new Error("Unauthorized");

      const include = getInclude(info);
      const order = [["name", "ASC"]];

      let logFields = null;
      let where = null;

      if (typeof filter !== "undefined") {
        where = { [Op.and]: getFilter(filter) };
        logFields = { filter };
      }

      logger.debug("Team search", { logFields });

      try {
        return await Team.findAll({ where, order, include });
      } catch (findError) {
        if (logFields === null) logFields = {};
        logFields.type = "Team search";
        logger.error(findError, { logFields });
        throw findError;
      }
    },
  },

  Mutation: {
    //  #### Description
    //    Create a new team
    //
    //  #### Parameters
    //    * team: the team to create
    //
    //  #### Returns
    //    * createTeam: the newly created team
    async createTeam(root, { team }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);
      const logFields = { team };

      logger.info("Team creation", { logFields });

      let result;

      try {
        result = await Team.create({ name: team.name }, { include });
      } catch (createError) {
        logFields.type = "Team creation";
        logger.error(createError, { logFields });
        throw createError;
      }

      const transaction = await sequelize.transaction();
      try {
        await Promise.all([
          setPlayers(result, team.players, transaction),
          setTeamLeader(result, team.teamLeader, transaction),
          setTournament(result, team.tournament, transaction)
        ]);
      } catch (associationsError) {
        await transaction.rollback();
        await Team.destroy({ where: { id: result.id } });
        throw associationsError;
      }

      await transaction.commit();
      return result.reload();
    },

    //  #### Description
    //    Delete an existing team
    //
    //  #### Parameters
    //    * id: id of the team to delete
    //
    //  #### Returns
    //    * deleteTeam: boolean describing if the operation was successful or not
    async deleteTeam(root, { id }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const logFields = { id };

      logger.info("Team deletion", { logFields });

      try {
        return await Team.destroy({ where: { id } });
      } catch (deleteError) {
        logFields.type = "Team deletion";
        logger.error(deleteError, { logFields });
        throw deleteError;
      }
    },

    //  #### Description
    //    Update an existing team
    //
    //  #### Parameters
    //    * id: the team id
    //    * team: object composed of attributes/values to update
    //
    //  #### Returns
    //    * updateTeam: the updated team
    async updateTeam(root, { id, team }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);
      const logFields = { id, team };

      let result = await Team.findByPk(id, { include });

      if (result === null) {
        logFields.type = "Team update - team not found";
        logger.error("Team update - team not found", { logFields });
        throw new Error("Team not found");
      }

      logger.info("Team update", { logFields });

      // We need to map this by hand and use the `save()` function
      // because for some reason the object return by `Team.update()`
      // manages the Player association like an array
      // which means the response would always have null `players` and `teamLeader` fields
      if (typeof team.name !== "undefined") result.name = team.name;

      const transaction = await sequelize.transaction();

      try {
        await result.save({ transaction });
      } catch (updateError) {
        await transaction.rollback();
        logFields.type = "Team update";
        logger.error(updateError, { logFields });
        throw updateError;
      }

      try {
        await Promise.all([
          setPlayers(result, team.players, transaction),
          setTeamLeader(result, team.teamLeader, transaction)
        ]);
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
