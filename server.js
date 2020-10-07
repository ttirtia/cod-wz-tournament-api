"use strict";

const koa = require("koa");
const jwt = require("koa-jwt");
const { ApolloServer } = require("apollo-server-koa");

const SERVER_PORT = process.env.SERVER_PORT || 8888;

const typeDefs = require("./graphql/types");
const resolvers = require("./graphql/resolvers");

module.exports.start = function () {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ ctx: { state: user } }) => user,
  });

  const app = new koa();
  app.use(jwt({ secret: process.env.JWT_SIGNING_KEY, passthrough: true }));
  server.applyMiddleware({ app });
  app.listen({ port: SERVER_PORT }, () =>
    console.log(
      `🚀 Server ready at http://localhost:${SERVER_PORT}${server.graphqlPath}`
    )
  );
};
