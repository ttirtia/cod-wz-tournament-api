"use strict";

const { Op } = require("sequelize");
const { Player, Roster, Team } = require("../../models");

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

  return include;
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

      const logFields = {
        player: player,
      };

      logger.info("Player creation", {
        fields: logFields,
      });

      try {
        return await Player.create({
          name: player.name,
        });
      } catch (createError) {
        logger.error(createError, {
          fields: {
            type: "Player creation",
            logFields,
          },
        });

        throw createError;
      }
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

      const logFields = {
        id: id,
        player: player,
      };

      logger.info("Player update", {
        fields: logFields,
      });

      try {
        const [numberOfAffectedRows, affectedRows] = await Player.update(
          {
            name: player.name,
          },
          { where: { id: id }, returning: true, plain: true }
        );

        return affectedRows;
      } catch (updateError) {
        logger.error(updateError, {
          fields: {
            type: "Player update",
            logFields,
          },
        });

        throw updateError;
      }
    },
  },
};
