"use strict";

const { Pool } = require("pg");
const pool = new Pool();
const bcrypt = require("bcrypt");

const bcrypt_rounds = 5;

module.exports = {
  query: (text, params, callback) => pool.query(text, params, callback),

  createUser: (username, email, password, is_admin = false, callback) =>
    pool.query(
      "INSERT INTO users(username, email, password, is_admin) VALUES($1, $2, $3, $4) RETURNING id",
      [username, email, bcrypt.hashSync(password, bcrypt_rounds), is_admin],
      callback
    ),

  findUser: (email, callback) =>
    pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
      callback
    ),
};
