#!/usr/bin/env sh

readonly dir="$(realpath "$(dirname "$0")")/.."

cd "$(realpath "$(dirname "$0")")/.." || exit

# shellcheck disable=SC1090
. "$dir/.env"
# shellcheck disable=SC2046
export $(grep '^[A-Z]' .env | cut -d '=' -f 1)

docker-compose up -d db

echo "Waiting for database to start..."
while ! docker-compose exec db pg_isready -U "$PGUSER" 1>/dev/null 2>&1; do sleep 1; done

docker-compose up --build -d api

docker-compose exec api npx sequelize-cli db:migrate
