#!/usr/bin/env bash

set -Eeuo pipefail

readonly dir="$(dirname "$(realpath "$0")")"
cd "${dir}/.."

readonly env_file=".env"
. "${env_file}"
export $(grep -E '^[A-Z]' "${env_file}" | cut -d= -f1)

docker-compose up -d

node index.js
