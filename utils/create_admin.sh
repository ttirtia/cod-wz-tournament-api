#!/usr/bin/env bash

set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# shellcheck disable=SC1091
source .env
# shellcheck disable=SC2046
export $(grep '^[A-Z]' .env | cut -d '=' -f 1)

node utils/js/create_admin.js
