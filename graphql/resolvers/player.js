"use strict";

const { Op } = require("sequelize");
const { Player, Roster, Team, User, sequelize } = require("../../models");

const logger = require("../../logger");

const ROSTER_INCLUDE = {
  model: Roster,
  as: "rosters",
  through: {
    attributes: [],
  },
};

const TEAM_INCLUDE = {
  model: Team,
  as: "teams",
  through: {
    attributes: [],
  },
};

const TEAM_LEADER_INCLUDE = {
  model: Team,
  as: "teamLeaderships",
};

const USER_INCLUDE = {
  model: User,
  as: "user",
};

// Avoid eager-loading if possible
function getInclude(info) {
  let include = [];

  if (
    info.fieldNodes[0].selectionSet.selections.find(
      (field) => field.name.value === "rosters"
    )
  )
    include.push(ROSTER_INCLUDE);

  if (
    info.fieldNodes[0].selectionSet.selections.find(
      (field) => field.name.value === "teams"
    )
  )
    include.push(TEAM_INCLUDE);

  if (
    info.fieldNodes[0].selectionSet.selections.find(
      (field) => field.name.value === "teamLeaderships"
    )
  )
    include.push(TEAM_LEADER_INCLUDE);

  if (
    info.fieldNodes[0].selectionSet.selections.find(
      (field) => field.name.value === "user"
    )
  )
    include.push(USER_INCLUDE);

  return include;
}

async function setUser(player, user, transaction) {
  if (typeof user === "undefined") return player;

  const logFields = {
    player: player,
    user: user,
  };

  try {
    user = await player.setUser(await User.findByPk(user));
  } catch (setUserError) {
    transaction.rollback();

    logger.error(setUserError, {
      fields: {
        type: "Player setTournament",
        logFields,
      },
    });

    throw setUserError;
  }

  logger.debug(JSON.stringify(player));

  // `.reload()` is needed otherwise the instance would not be up-to-date
  return player.reload();
}

module.exports = {
  Query: {
    async findPlayers(root, { filter }, { user }, info) {
      if (!user) throw new Error("Unauthorized");

      const include = getInclude(info);

      const logFields = {
        filter: filter,
      };

      if (typeof filter === "undefined") {
        logger.debug("Player search");

        try {
          return await Player.findAll({
            order: [["name", "ASC"]],
            include: include,
          });
        } catch (findError) {
          logger.error(findError, {
            fields: { type: "Player search" },
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

      logger.debug("Player search", { fields: logFields });

      try {
        return await Player.findAll({
          where: {
            [Op.and]: queryFilter,
          },
          order: [["name", "ASC"]],
          include: include,
        });
      } catch (findError) {
        logger.error(findError, {
          fields: {
            type: "Player search",
            logFields,
          },
        });

        throw findError;
      }
    },
  },

  Mutation: {
    async createPlayer(root, { player }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);

      const logFields = {
        player: player,
      };

      logger.info("Player creation", {
        fields: logFields,
      });

      let result;
      const transaction = await sequelize.transaction();

      try {
        result = await Player.create(
          {
            name: player.name,
          },
          {
            include: include,
            transaction: transaction,
          }
        );
      } catch (createError) {
        await transaction.rollback();

        logger.error(createError, {
          fields: {
            type: "Player creation",
            logFields,
          },
        });

        throw createError;
      }

      result = await setUser(result, player.user, transaction);
      await transaction.commit();
      return result;
    },

    async deletePlayer(root, { id }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      const logFields = {
        id: id,
      };

      logger.info("Player deletion", {
        fields: logFields,
      });

      try {
        return await Player.destroy({ where: { id: id } });
      } catch (deleteError) {
        logger.error(deleteError, {
          fields: { type: "Player deletion", logFields },
        });

        throw deleteError;
      }
    },

    async updatePlayer(root, { id, player }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);

      const logFields = {
        id: id,
        player: player,
      };

      let result;
      const transaction = await sequelize.transaction();

      try {
        result = await Player.findOne({
          where: { id: id },
          include: include,
        });
      } catch (updateFindOneError) {
        logger.error(updateFindOneError, {
          fields: {
            type: "Player update - findOne",
            id: id,
          },
        });

        throw updateFindOneError;
      }

      if (typeof result === "undefined") {
        logger.error("Player not found", {
          fields: {
            type: "Player update",
            logFields,
          },
        });

        throw new Error("Player not found");
      }

      if (typeof player.name !== "undefined") result.name = player.name;

      logger.info("Player update", {
        fields: logFields,
      });

      try {
        await result.save({ transaction: transaction });
      } catch (saveError) {
        await transaction.rollback();

        logger.error(saveError, {
          fields: {
            type: "Player update",
            logFields,
          },
        });

        throw saveError;
      }

      result = await setUser(result, player.user, transaction);
      await transaction.commit();
      return result;
    },
  },
};
