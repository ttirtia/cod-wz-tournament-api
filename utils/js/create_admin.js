"use strict";

const { User } = require("../../models");
const prompt = require("prompt");

const EMAIL_REGEX = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;

const schema = {
  properties: {
    username: {
      description: "Username",
      type: "string",
      pattern: /^[a-zA-Z0-9\-_]+$/,
      message: "Name must be only letters, numbers, dashes or underscores",
      required: true,
    },
    email: {
      description: "Email",
      type: "string",
      pattern: EMAIL_REGEX,
      message: "Email address must be valid",
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
      const admin = await User.create({
        username: result.username,
        email: result.email,
        password: result.password,
        isAdmin: true,
      });

      console.log("Created user " + admin.username + " (" + admin.email + ")");
    } catch (createError) {
      console.error(createError);
    }
  }
});
