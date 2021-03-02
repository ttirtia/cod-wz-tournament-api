"use strict";

const { Op } = require("sequelize");
const { Roster, Player } = require("../../models");

const logger = require("../../logger");

const PLAYER_INCLUDE = {
  model: Player,
  as: "players",
  through: {
    attributes: [],
  },
};

// Avoid eager-loading if possible
function getInclude(info) {
  return info.fieldNodes[0].selectionSet.selections.find(
    (field) => field.name.value === "players"
  )
    ? [PLAYER_INCLUDE]
    : [];
}

async function setPlayers(roster, players) {
  if (typeof players === "undefined") return roster;

  const logFields = {
    roster: roster,
    players: players,
  };

  try {
    await roster.setPlayers(
      await Player.findAll({
        where: {
          id: { [Op.in]: players || [] },
        },
      })
    );
  } catch (setPlayersError) {
    logger.error(setPlayersError, {
      fields: { type: "Roster setPlayers", logFields },
    });

    throw setPlayersError;
  }

  // `.reload()` is needed otherwise the instance would not be up-to-date
  return roster.reload();
}

module.exports = {
  Query: {
    async findRosters(root, { filter }, { user }, info) {
      if (!user) throw new Error("Unauthorized");

      const include = getInclude(info);

      const logFields = {
        filter: filter,
      };

      if (typeof filter === "undefined") {
        logger.debug("Roster search");

        try {
          return await Roster.findAll({
            order: [["name", "ASC"]],
            include: include,
          });
        } catch (findError) {
          logger.error(findError, {
            fields: { type: "Roster search" },
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

      logger.debug("Roster search", { fields: logFields });

      try {
        return await Roster.findAll({
          where: {
            [Op.and]: queryFilter,
          },
          order: [["name", "ASC"]],
          include: include,
        });
      } catch (findError) {
        logger.error(findError, {
          fields: {
            type: "Roster search",
            logFields,
          },
        });

        throw findError;
      }
    },
  },

  Mutation: {
    async createRoster(root, { roster }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);

      const logFields = {
        roster: roster,
      };

      logger.info("Roster creation", {
        fields: logFields,
      });

      let result;

      try {
        result = await Roster.create(
          {
            name: roster.name,
          },
          {
            include: include,
          }
        );
      } catch (createError) {
        logger.error(createError, {
          fields: {
            type: "Roster creation",
            logFields,
          },
        });

        throw createError;
      }

      return await setPlayers(result, roster.players);
    },

    async deleteRoster(root, { id }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      const logFields = {
        id: id,
      };

      logger.info("Roster deletion", {
        fields: logFields,
      });

      try {
        return await Roster.destroy({ where: { id: id } });
      } catch (deleteError) {
        logger.error(deleteError, {
          fields: {
            type: "Roster deletion",
            logFields,
          },
        });

        throw deleteError;
      }
    },

    async updateRoster(root, { id, roster }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);

      const logFields = {
        id: id,
        roster: roster,
      };

      let result;

      try {
        result = await Roster.findOne({
          where: { id: id },
          include: include,
        });
      } catch (updateFindOneError) {
        logger.error(updateFindOneError, {
          fields: {
            type: "Roster update - findOne",
            id: id,
          },
        });

        throw updateFindOneError;
      }

      if (typeof result === "undefined") {
        logger.error("Roster not found", {
          fields: {
            type: "Roster update",
            logFields,
          },
        });

        throw new Error("Roster not found");
      }

      if (typeof roster.name !== "undefined") result.name = roster.name;

      logger.info("Roster update", {
        fields: logFields,
      });

      try {
        await result.save();
      } catch (saveError) {
        logger.error(saveError, {
          fields: {
            type: "Roster update",
            logFields,
          },
        });

        throw saveError;
      }

      return await setPlayers(result, roster.players);
    },
  },
};
