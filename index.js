"use strict";

console.log("Checking for database migrations...");

const DBMigrate = require("db-migrate");
const Server = require("./server");

// Always perform database migrations on startup
const dbmigrate = DBMigrate.getInstance(true);
dbmigrate.up().then(() => {
  Server.start();
});
