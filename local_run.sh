#!/usr/bin/env bash

set -Eeuo pipefail

docker-compose up -d

# Environment
export NODE_ENV=dev

# Database configuration
export PGUSER="cod-wz-tourney"
export PGPASSWORD="cod-wz-tourney"
export PGDATABASE="cod-wz-tourney"
# export PGHOST="localhost"
# export PGPORT="5432"
# export PGSCHEMA="public"

# JWT configuration
export JWT_SIGNING_KEY="supersecret"

node index.js
