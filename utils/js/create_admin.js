"use strict";

const { User } = require("../../models");
const prompt = require("prompt");

const schema = {
  properties: {
    username: {
      description: "Username",
      type: "string",
      pattern: /^[a-zA-Z0-9\-_]+$/,
      message: "Name must be only letters, numbers, dashes or underscores",
      required: true,
    },
    password: {
      description: "Password",
      type: "string",
      replace: "*",
      hidden: true,
      required: true,
    },
  },
};

prompt.start();
prompt.get(schema, async (promptError, result) => {
  if (promptError) {
    console.error(promptError);
  } else {
    try {
      await User.create({
        username: result.username,
        password: result.password,
        isAdmin: true,
      });

      console.log("Created user " + result.username);
    } catch (createError) {
      console.error(createError);
    }
  }
});
