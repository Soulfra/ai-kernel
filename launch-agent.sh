#!/bin/bash
# launch-agent.sh - install and run ai-kernel
set -e
REPO_URL=${1:-https://github.com/yourorg/ai-kernel.git}
TARGET_DIR=${2:-ai-kernel}

if [ ! -d "$TARGET_DIR" ]; then
  git clone "$REPO_URL" "$TARGET_DIR"
fi
cd "$TARGET_DIR"

npm install >/dev/null 2>&1

VAULT_DEFAULT=$(openssl rand -hex 4 2>/dev/null || echo "vault")
read -p "Vault name [$VAULT_DEFAULT]: " VAULT_NAME
VAULT_NAME=${VAULT_NAME:-$VAULT_DEFAULT}

node scripts/server/pair-device.js "$VAULT_NAME" || true

make serve &
PID=$!

if command -v xdg-open >/dev/null; then
  xdg-open http://localhost:3000/start
elif command -v open >/dev/null; then
  open http://localhost:3000/start
fi

wait $PID

