#!/usr/bin/env bash
set -euo pipefail

# Simple bootstrap for Ubuntu to run the Zoom Waiting Room Manager
# - Installs build essentials, git, curl
# - Installs Node.js (LTS) via nvm (isolated per-user)
# - Installs project dependencies and builds the app bundle

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_VERSION="${NODE_VERSION:-18}"

log() { printf "==> %s\n" "$*"; }

# Ensure apt packages
log "Installing system packages..."
sudo apt-get update -y
sudo apt-get install -y build-essential git curl

# Install nvm if missing
if [ ! -d "${HOME}/.nvm" ]; then
  log "Installing nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

# Load nvm
export NVM_DIR="${HOME}/.nvm"
# shellcheck source=/dev/null
[ -s "${NVM_DIR}/nvm.sh" ] && . "${NVM_DIR}/nvm.sh"

# Install Node
log "Installing Node.js v${NODE_VERSION}..."
nvm install "${NODE_VERSION}"
nvm use "${NODE_VERSION}"

log "Node version: $(node -v)"
log "NPM version: $(npm -v)"

# Install dependencies and build
cd "${REPO_DIR}"
log "Installing npm dependencies..."
npm install

log "Building production bundle (dist)..."
npm run build

cat <<'EOF'

Bootstrap complete.

To run the server:
  export PORT=3000
  export ZM_CLIENT_ID=...
  export ZM_CLIENT_SECRET=...
  export ZM_REDIRECT_URL=...   # should point to https://<domain>/zoom
  export SESSION_SECRET=...    # random string
  node app.js

Key endpoints:
  /zoom         -> Zoom App (built React bundle)
  /register     -> Browser registration form
  /getconflicts -> Generate/download meeting_conflicts.csv

EOF
