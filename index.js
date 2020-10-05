"use strict";

console.log("Checking for database migrations...");
// Always perform database migrations on startup
let DBMigrate = require("db-migrate");
let Server = require("./server");

let dbmigrate = DBMigrate.getInstance(true);
dbmigrate.up().then( () => {
  Server.start()
});
