"use strict";

const db = require("../../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const jwt_token_timeout = "1d";

module.exports = {
  Query: {
    async users(root, args, { user }, info) {
      if (!user || !user.is_admin) throw new Error("Unauthorized");

      const { rows } = await db.query("SELECT * FROM users");
      return rows;
    },
  },

  Mutation: {
    // Disable user registration
    /*
    async register(root, { email, username, password }, { user }, info) {
      if (user) throw new Error("Already logged in");

      const { rows } = await db.createUser(username, email, password, false);
      if (rows.length == 0) throw new Error("Unable to create user");

      return jwt.sign(
        { id: rows[0].id, username: username, email: email, is_admin: false },
        process.env.JWT_SIGNING_KEY,
        {
          expiresIn: jwt_token_timeout,
        }
      );
    },
    */

    async login(root, { email, password }, { user }, info) {
      if (user) throw new Error("Already logged in");

      const { rows } = await db.findUser(email);
      if (rows.length == 0) throw new Error("Unable to login");

      const isMatch = bcrypt.compareSync(password, rows[0].password);
      if (!isMatch) throw new Error("Unable to login");

      return jwt.sign(
        {
          id: rows[0].id,
          username: rows[0].username,
          email: rows[0].email,
          is_admin: rows[0].is_admin,
        },
        process.env.JWT_SIGNING_KEY,
        {
          expiresIn: jwt_token_timeout,
        }
      );
    },
  },
};
