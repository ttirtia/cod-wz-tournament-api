const db = require("../../db");

module.exports = {
  Query: {
    users: async () => {
      const { rows } = await db.query("SELECT pseudo, email FROM users");
      return rows;
    },
  },
};
