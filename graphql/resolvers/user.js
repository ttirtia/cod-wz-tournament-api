"use strict";

const { User } = require("../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_TOKEN_TIMEOUT = "1d";

module.exports = {
  Query: {
    async users(root, args, { user }, info) {
      if (!user || !user.isAdmin) throw new Error("Unauthorized");

      return await User.findAll();
    },
  },

  Mutation: {
    // Disable user registration
    /*
    async register(root, { email, username, password }, { user }, info) {
      if (user) throw new Error("Already logged in");

      try {
        const res = await User.create({
          username: username,
          email: email,
          password: password,
          isAdmin: false,
        });

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
      } catch (createError) {
        throw new Error(createError);
      }
    },
    */

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
