#!/bin/bash
# Fix stale Prisma client in the backend dev container
# The -v flag removes the cached node_modules volume so Prisma regenerates

set -e
cd /root/.hermes/bar-kasse

echo "=== Stopping backend and removing cached volume ==="
docker compose -f docker-compose.yml down -v backend-dev

echo "=== Starting fresh backend (this runs prisma generate) ==="
docker compose -f docker-compose.yml up -d backend-dev

echo "=== Waiting for backend... ==="
sleep 8

echo "=== Verifying... ==="
RESULT=$(curl -s http://localhost:4001/api/products | head -c 80)
if echo "$RESULT" | grep -q '"error"'; then
  echo "❌ STILL BROKEN: $RESULT"
  echo "Try: docker compose -f docker-compose.yml down -v && docker compose -f docker-compose.yml up -d"
  exit 1
else
  echo "✅ Products API works: $RESULT"
fi

echo ""
curl -s http://localhost:4001/api/containers | head -c 80
echo ""
echo "=== Done! Refresh your browser with Ctrl+Shift+R ==="
