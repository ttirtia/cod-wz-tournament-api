#!/usr/bin/env bash

set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# shellcheck disable=SC1091
source .env
# shellcheck disable=SC2046
export $(grep '^[A-Z]' .env | cut -d '=' -f 1)

docker-compose up -d

while ! docker-compose exec db pg_isready -U "$PGUSER" &>/dev/null; do sleep 1; done

npx sequelize-cli db:migrate

node index.js
