#!/usr/bin/env bash
# Run ON the Hetzner server after git pull (or from CI with SSH).
#   cd /opt/aks && bash scripts/deploy-hetzner.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env — copy .env.production.example and fill secrets." >&2
  exit 1
fi

echo "[deploy] build + up"
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps

echo "[deploy] done — check https://www.aks-atelier.com/"
echo "[deploy] webhook probe:"
echo "  curl -fsS 'https://www.aks-atelier.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=aks-wa-verify-7f3c9e2b&hub.challenge=meta-test'"
