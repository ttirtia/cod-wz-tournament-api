"use strict";

const { Op } = require("sequelize");
const { User } = require("../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_TOKEN_TIMEOUT = "1d";

module.exports = {
  Query: {
    async findUsers(root, { filter }, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      if (typeof filter === "undefined") {
        return await User.findAll({
          order: [["username", "ASC"]],
          raw: true,
        });
      }

      let queryFilter = [];

      if (typeof filter.id !== "undefined") {
        queryFilter.push({ id: { [Op.eq]: filter.id } });
      }

      if (typeof filter.username !== "undefined") {
        queryFilter.push({
          username: { [Op.iLike]: "%" + filter.username + "%" },
        });
      }

      if (typeof filter.email !== "undefined") {
        queryFilter.push({
          email: { [Op.iLike]: "%" + filter.email + "%" },
        });
      }

      if (typeof filter.isAdmin !== "undefined") {
        queryFilter.push({
          isAdmin: { [Op.eq]: filter.isAdmin },
        });
      }

      return await User.findAll({
        where: {
          [Op.and]: queryFilter,
        },
        order: [["username", "ASC"]],
        raw: true,
      });
    },
  },

  Mutation: {
    async login(root, { email, password }, { user }, info) {
      if (user) throw new Error("Already logged in");

      const res = await User.findOne({ where: { email: email } });
      if (res === null) throw new Error("Unable to login");

      const isMatch = bcrypt.compareSync(password, res.password);
      if (!isMatch) throw new Error("Unable to login");

      return jwt.sign(
        {
          id: res.id,
          username: res.username,
          email: res.email,
          isAdmin: res.isAdmin,
        },
        process.env.JWT_SIGNING_KEY,
        {
          expiresIn: JWT_TOKEN_TIMEOUT,
        }
      );
    },
  },
};
