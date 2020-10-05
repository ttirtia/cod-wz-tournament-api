#!/usr/bin/env bash

set -Eeuo pipefail

docker-compose up -d

export NODE_ENV=dev

export DB_USERNAME="cod-wz-tourney"
export DB_PASSWORD="cod-wz-tourney"
export DB_NAME="cod-wz-tourney"

# Extra override if needed
# export DB_HOST="localhost"
# export DB_PORT="5432"
# export DB_SCHEMA="public"

node index.js
