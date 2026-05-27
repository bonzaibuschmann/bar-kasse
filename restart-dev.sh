#!/bin/bash
# Restart bar-kasse dev stack to pick up schema/backend changes
cd /root/.hermes/bar-kasse 2>/dev/null || cd /opt/data/bar-kasse 2>/dev/null || {
  echo "Cannot find bar-kasse directory"
  exit 1
}

echo "=== Restarting bar-kasse dev containers ==="
docker compose -f docker-compose.yml down barkasse-backend-dev barkasse-frontend-dev
docker compose -f docker-compose.yml up -d barkasse-backend-dev barkasse-frontend-dev

echo ""
echo "Waiting for backend to be ready..."
for i in $(seq 1 15); do
  if curl -s http://localhost:4000/api/health > /dev/null 2>&1; then
    echo "✅ Backend is ready on port 4000"
    break
  fi
  sleep 1
done

# Also connect Hermes to the bar-kasse network if needed
HERMES_HOST=$(hostname 2>/dev/null || echo "")
if [ -n "$HERMES_HOST" ]; then
  docker network connect bar-kasse_default "$HERMES_HOST" 2>/dev/null && echo "✅ Connected Hermes to bar-kasse network"
fi

echo ""
echo "Frontend: http://localhost:3001 (dev) or http://localhost:3000 (prod)"
echo "Backend API: http://localhost:4000/api/health"
