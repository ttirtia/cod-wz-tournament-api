#!/usr/bin/env bash

set -Eeuo pipefail

docker-compose up -d

export NODE_ENV=dev

export PGUSER="cod-wz-tourney"
export PGPASSWORD="cod-wz-tourney"
export PGDATABASE="cod-wz-tourney"

# Extra override if needed
# export PGHOST="localhost"
# export PGPORT="5432"
# export PGSCHEMA="public"

node index.js
