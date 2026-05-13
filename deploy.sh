#!/bin/bash
# Sirius — Auto Deploy to Production Server
# Runs automatically after code changes to push updates to 185.247.118.196

set -e

SERVER="root@185.247.118.196"
SERVER_PORT="2222"
SERVER_DIR="/opt/sirius"

echo ""
echo "=== Sirius Deploy — $(date '+%H:%M %d/%m/%Y') ==="
echo ""

# ── 1. Set up SSH key ──────────────────────────────────────────────────────────
KEY_FILE=".local/sirius_deploy.key"

if [ ! -f "$KEY_FILE" ] && [ -n "$SSH_DEPLOY_KEY" ]; then
  mkdir -p ~/.ssh
  echo "$SSH_DEPLOY_KEY" > ~/.ssh/sirius_deploy
  chmod 600 ~/.ssh/sirius_deploy
  KEY_FILE="~/.ssh/sirius_deploy"
elif [ ! -f "$KEY_FILE" ]; then
  echo "❌ No SSH key found. Add .local/sirius_deploy.key or set SSH_DEPLOY_KEY secret."
  exit 1
fi

chmod 600 "$KEY_FILE"

# Accept server host key automatically (safe for known server)
ssh-keyscan -p $SERVER_PORT -H 185.247.118.196 >> ~/.ssh/known_hosts 2>/dev/null

SSH_OPTS="-i $KEY_FILE -o StrictHostKeyChecking=no -p $SERVER_PORT"

echo "🔑 SSH key ready"

# ── 2. Build locally ───────────────────────────────────────────────────────────
echo "🔨 Building api-server..."
pnpm --filter @workspace/api-server run build

echo "✅ Build complete"

# ── 3. Sync code to server ─────────────────────────────────────────────────────
echo "📦 Syncing code to server..."

rsync -az --delete \
  -e "ssh $SSH_OPTS" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='.env' \
  --exclude='*.log' \
  ./ $SERVER:$SERVER_DIR/

echo "✅ Code synced"

# ── 4. Install deps, push DB schema, restart on server ────────────────────────
echo "🚀 Updating server..."

ssh $SSH_OPTS $SERVER << 'REMOTE'
set -e
cd /opt/sirius

echo "  → Installing dependencies..."
pnpm install --frozen-lockfile 2>&1 | tail -3

echo "  → Pushing database schema..."
cd lib/db && npm run push --force 2>&1 | tail -5
cd /opt/sirius

echo "  → Restarting app..."
pm2 restart sirius-api --update-env

echo "  → Done."
REMOTE

echo ""
echo "✅ Deploy complete — sirius-ai.live is now running the latest code"
echo ""
