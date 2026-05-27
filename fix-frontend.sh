#!/bin/bash
# Fix frontend: rebuild to pick up gridstack + other deps
set -e

cd /root/.hermes/bar-kasse

echo "=== Fixing file ownership ==="
# Fix root-owned files from previous Docker operations
sudo chown -R $USER:$USER frontend/package-lock.json 2>/dev/null || true

echo "=== Installing npm deps locally ==="
cd frontend
npm install

echo "=== Rebuilding & restarting frontend-dev ==="
cd /root/.hermes/bar-kasse
docker compose -f docker-compose.yml build frontend-dev
docker compose -f docker-compose.yml up -d frontend-dev

echo ""
echo "=== Done! ==="
echo "Wait 5 seconds then hard-refresh http://157.254.223.246:3001/"
