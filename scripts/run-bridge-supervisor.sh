#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
ROOT_DIR="${SCRIPT_DIR:h}"
SUPERVISOR_JS="${ROOT_DIR}/scripts/bridge-supervisor.js"

if [[ -x "${HOME}/.nvm/versions/node/v25.6.1/bin/node" ]]; then
  NODE_BIN="${HOME}/.nvm/versions/node/v25.6.1/bin/node"
elif command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [[ -x /opt/homebrew/bin/node ]]; then
  NODE_BIN="/opt/homebrew/bin/node"
elif [[ -x /usr/local/bin/node ]]; then
  NODE_BIN="/usr/local/bin/node"
else
  echo "Unable to locate node binary for bridge supervisor" >&2
  exit 78
fi

cd "${ROOT_DIR}"
exec "${NODE_BIN}" "${SUPERVISOR_JS}"
