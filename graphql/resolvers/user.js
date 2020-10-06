const db = require("../../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const bcrypt_rounds = 5;

module.exports = {
  Query: {
    users: async () => {
      const { rows } = await db.query("SELECT * FROM users");
      return rows;
    },
  },

  Mutation: {
    signupUser: async (root, args, context, info) => {
      const {
        data: { email, username, password },
      } = args;
      const { rows } = await db.createUser(
        email,
        username,
        bcrypt.hashSync(password, bcrypt_rounds)
      );
      return { token: jwt.sign(rows[0], process.env.JWT_SIGNING_KEY) };
    },

    loginUser: async (root, args, context, info) => {
      const {
        data: { email, password },
      } = args;
      const { rows } = await db.findUser(email);
      if (rows.length == 0) throw new Error("Unable to Login");
      const isMatch = bcrypt.compareSync(password, rows[0].password);
      if (!isMatch) throw new Error("Unable to Login");
      return { token: jwt.sign({ id: rows[0].id }, process.env.JWT_SIGNING_KEY) };
    },
  },
};
