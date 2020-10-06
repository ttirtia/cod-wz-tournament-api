const { Pool } = require("pg");
const pool = new Pool();

module.exports = {
  query: (text, params, callback) => {
    return pool.query(text, params, callback);
  },

  createUser: (email, username, password, callback) => {
    return pool.query(
      "INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id",
      [username, email, password],
      callback
    );
  },

  findUser: (email, callback) => {
    return pool.query(
      "SELECT id, password FROM users WHERE email = $1",
      [email],
      callback
    );
  },
};
