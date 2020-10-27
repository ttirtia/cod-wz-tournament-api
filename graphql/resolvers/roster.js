"use strict";

const { Op } = require("sequelize");
const { Roster, Player } = require("../../models");

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

  await roster.setPlayers(
    await Player.findAll({
      where: {
        id: { [Op.in]: players || [] },
      },
    })
  );

  // `.reload()` is needed otherwise the instance would not be up-to-date
  return roster.reload();
}

module.exports = {
  Query: {
    async findRosters(root, { filter }, { user }, info) {
      if (!user) throw new Error("Unauthorized");

      let include = getInclude(info);

      if (typeof filter === "undefined") {
        return await Roster.findAll({
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

      return await Roster.findAll({
        where: {
          [Op.and]: queryFilter,
        },
        order: [["name", "ASC"]],
        include: include,
      });
    },
  },

  Mutation: {
    async createRoster(root, { roster }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      let include = getInclude(info);

      let result = await Roster.create(
        {
          name: roster.name,
        },
        {
          include: include,
        }
      );

      return await setPlayers(result, roster.players);
    },

    async deleteRoster(root, { id }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      return await Roster.destroy({ where: { id: id } });
    },

    async updateRoster(root, { id, roster }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      let include = getInclude(info);

      let result = await Roster.findOne({
        where: { id: id },
        include: include,
      });

      if (typeof result === "undefined") throw new Error("Roster not found");

      if (typeof roster.name !== "undefined") result.name = roster.name;

      try {
        await result.save();
      } catch (saveError) {
        throw saveError;
      }

      return await setPlayers(result, roster.players);
    },
  },
};
