"use strict";

const { Op } = require("sequelize");
const { Player } = require("../../models");

module.exports = {
  Query: {
    async allPlayers(root, args, { user }, info) {
      if (!user) throw new Error("Unauthorized");

      return await Player.findAll({ order: [["name", "ASC"]] });
    },

    async players(root, { filter }, { user }, info) {
      if (!user) throw new Error("Unauthorized");

      let queryFilter = [];

      if (typeof filter.id !== "undefined") {
        queryFilter.push({ id: { [Op.eq]: filter.id } });
      }

      if (typeof filter.name !== "undefined") {
        queryFilter.push({ name: { [Op.iLike]: "%" + filter.name + "%" } });
      }
      if (typeof filter.activisionId !== "undefined") {
        queryFilter.push({
          activisionId: { [Op.iLike]: "%" + filter.activisionId + "%" },
        });
      }

      return await Player.findAll({
        where: {
          [Op.and]: queryFilter,
        },
        order: [["name", "ASC"]],
        raw: true,
      });
    },
  },

  Mutation: {
    async createPlayer(root, { player }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      return await Player.create({
        name: player.name,
        activisionId: player.activisionId,
      });
    },

    async deletePlayer(root, { id }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      return await Player.destroy({ where: { id: id } });
    },

    async updatePlayer(root, { id, player }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      const [numberOfAffectedRows, affectedRows] = await Player.update(
        {
          name: player.name,
          activisionId: player.activisionId,
        },
        { where: { id: id }, returning: true, plain: true }
      );

      return affectedRows;
    },
  },
};
