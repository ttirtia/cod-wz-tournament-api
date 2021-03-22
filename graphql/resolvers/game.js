"use strict";

const { Op } = require("sequelize");
const {
  Game,
  Team,
  Player,
  GameResult,
  Tournament,
  sequelize,
} = require("../../models");

const logger = require("../../logger");

// Avoid eager-loading the associations if possible
function getInclude(info) {
  let include = [];

  info.fieldNodes[0].selectionSet.selections.forEach((field) => {
    if (field.name.value === "team") {
      include.push({ model: Team, as: "team" });
      return;
    }

    if (field.name.value === "results") {
      include.push({
        model: GameResult,
        as: "results",
        include: [
          {
            model: Player,
            as: "player",
          },
        ],
      });
      return;
    }
  });

  return include;
}

//  #### Description
//    Build GameResult objects based on mutation input
//
//  #### Parameters
//    * results: raw inputs
//    * game: the game to link the results to
//    * transaction: the related database transaction
//
//  #### Returns
//    * gameResults: array of GameResult objects
async function buildGameResults(results, game, transaction) {
  let gameResults = [];

  const include = [{ model: Player, as: "player" }];
  const logFields = { results, game, type: "Game buildGameResults" };

  let gameResult;
  try {
    for (const result of results) {
      gameResult = await GameResult.create(
        { kills: result.kills },
        { include }
      );
      await Promise.all([
        gameResult.setGame(game),
        gameResult.setPlayer(await Player.findByPk(result.player)),
      ]);

      gameResults.push(gameResult);
    }
  } catch (buildGameResultsError) {
    logger.error(buildGameResultsError, { logFields });
    throw buildGameResults;
  }

  return gameResults;
}

//  #### Description
//    Associate a team to the game
//
//  #### Parameters
//    * game: the game in which to set the team
//    * team: the team to link to the game
//    * transaction: the related database transaction
//
//  #### Returns
//    * game: the game updated with its team
async function setTeam(game, team, transaction) {
  if (typeof team === "undefined") return game;

  const logFields = { game, team, type: "Game setTeam" };

  try {
    await game.setTeam(await Team.findByPk(team), { transaction });
  } catch (setTeamError) {
    logger.error(setTeamError, { logFields });
    throw setTeamError;
  }

  return game;
}

//  #### Description
//    Associate game results to a game
//
//  #### Parameters
//    * game: the game in which to set the results
//    * results: the results to set to the game
//    * transaction: the related database transaction
//
//  #### Returns
//    * setResults: the game updated with its results
async function setResults(game, results, transaction) {
  if (typeof results === "undefined") return game;

  const logFields = { game, results, type: "Game setResults" };

  try {
    await game.setResults(await buildGameResults(results, game, transaction));
  } catch (setResultsError) {
    logger.error(setResultsError, { logFields });
    throw setResultsError;
  }

  return game;
}

module.exports = {
  Mutation: {
    //  #### Description
    //    Create a new game
    //
    //  #### Parameters
    //    * game: the game to create
    //
    //  #### Returns
    //    * createGame: the newly created game
    async createGame(root, { game }, { authUser }, info) {
      const team = await Team.findByPk(game.team, {
        include: [{ model: Tournament, as: "tournament" }],
      });
      const teamLeaderUser = await (await team.getTeamLeader()).getUser();

      // Only let admins and team leaders create game results
      if (
        !authUser ||
        team === null ||
        (teamLeaderUser.length &&
          teamLeaderUser[0].id !== authUser.id &&
          !authUser.isAdmin)
      )
        throw new Error("Unauthorized");

      if (
        (await team.getTournament()).gameLimit !== -1 &&
        (await team.getGames()).length ===
          (await team.getTournament()).gameLimit
      )
        throw new Error("Game limit is already reached");

      const include = getInclude(info);
      const logFields = { game, type: "Game creation" };

      logger.info("Game creation", { logFields });

      let result;

      try {
        result = await Game.create({ placement: game.placement }, { include });
      } catch (createError) {
        logger.error(createError, { logFields });
        throw createError;
      }

      const transaction = await sequelize.transaction();
      try {
        await Promise.all([
          setTeam(result, game.team, transaction),
          setResults(result, game.results, transaction),
        ]);
      } catch (associationsError) {
        await transaction.rollback();
        await Game.destroy({ where: { id: result.id } });
        throw associationsError;
      }

      await transaction.commit();
      return result.reload();
    },

    //  #### Description
    //    Delete an existing game
    //
    //  #### Parameters
    //    * id: id of the game to delete
    //
    //  #### Returns
    //    * deleteGame: boolean describing if the operation was successful or not
    async deleteGame(root, { id }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const logFields = { id, type: "Game deletion" };

      logger.info("Game deletion", { logFields });

      try {
        return await Game.destroy({ where: { id } });
      } catch (deleteError) {
        logger.error(deleteError, { logFields });
        throw deleteError;
      }
    },

    //  #### Description
    //    Update an existing game
    //
    //  #### Parameters
    //    * id: the game id
    //    * game: object composed of attributes/values to update
    //
    //  #### Returns
    //    * updateGame: the updated game
    async updateGame(root, { id, game }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);
      const logFields = { id, game, type: "Game update" };

      let result = await Game.findByPk(id, { include });

      if (result === null) {
        logger.error("Game not found", { logFields });
        throw new Error("Game not found");
      }

      logger.info("Game update", { logFields });

      // We need to map this by hand and use the `save()` function
      // because for some reason the object return by `Game.update()`
      // manages the GameResult association like an array
      // which means the response would always have a null `results` field
      if (typeof game.placement !== "undefined")
        result.placement = team.placement;

      const transaction = await sequelize.transaction();

      try {
        await result.save({ transaction });
      } catch (updateError) {
        await transaction.rollback();
        logger.error(updateError, { logFields });
        throw updateError;
      }

      try {
        await setResults(result, game.results, transaction);
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
