#!/usr/bin/env sh

readonly dir="$(realpath "$(dirname "$0")")/.."

cd "$(realpath "$(dirname "$0")")/.." || exit

# shellcheck disable=SC1090
. "$dir/.env"
# shellcheck disable=SC2046
export $(grep '^[A-Z]' .env | cut -d '=' -f 1)

node utils/js/create_admin.js
