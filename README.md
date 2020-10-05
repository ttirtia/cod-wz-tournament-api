# CoD WZ: tournament API

## Introduction

Backend to manage private CoD WZ tournaments.

## Quick start with Docker

```bash
docker-compose up -d
```

This will start a PostgreSQL database. **TODO**: This currently does not run the API server.

## Local setup

1. Install dependencies

```bash
npm install
```

2. Run the server

```bash
./local_setup.sh
```

The API server will be started on port **8888** by default (can be overridden with the environment variable `SERVER_PORT`).

3. Test the playground (**TODO**: remove me when the app does something useful)

Go to http://localhost:8888/graphql (or http://localhost:${SERVER_PORT}/graphql)

Test the query:

```graphql
{
  users {
    pseudo
    email
  }
}
```

## Configuration

In order to directly run `node index.js` and/or override the default configuration, you need to export the following variables:
* Required
  * DB_USERNAME="cod-wz-tourney"
  * DB_PASSWORD="cod-wz-tourney"
  * DB_NAME="cod-wz-tourney"
* Optional
  * DB_HOST="localhost"
  * DB_PORT="5432"
  * DB_SCHEMA="public"

This let you run the API server against your own database. The defaults target the Docker instance.

## Create database migrations

This project uses [db-migrate](https://github.com/db-migrate/node-db-migrate) to manage database migrations.

In order to create a new one, use

```bash
./node_modules/db-migrate/bin/db-migrate create -e dev ${MIGRATION_NAME}
```

Then edit the newly created SQL files: `migrations/sqls/*-${MIGRATION_NAME}-*.sql`
