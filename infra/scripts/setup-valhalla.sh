#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_DIR="$SCRIPT_DIR/../data/osm"
PBF_URL="https://download.geofabrik.de/europe/france-latest.osm.pbf"
PBF_FILE="$DATA_DIR/france-latest.osm.pbf"

echo "=== Valhalla Setup Script ==="
echo ""

# Step 1: Download France PBF
if [ -f "$PBF_FILE" ]; then
  echo "France PBF already exists at $PBF_FILE, skipping download."
else
  echo "Downloading France PBF from Geofabrik (~1.5GB)..."
  mkdir -p "$DATA_DIR"
  curl -L -o "$PBF_FILE" "$PBF_URL"
  echo "Download complete."
fi

# Step 2: Copy PBF into Valhalla container
echo ""
echo "Copying PBF into Valhalla container..."
docker compose -f "$PROJECT_DIR/infra/docker-compose.yml" cp "$PBF_FILE" valhalla:/data/

# Step 3: Restart container to trigger tile build
echo ""
echo "Restarting Valhalla container to build tiles..."
docker compose -f "$PROJECT_DIR/infra/docker-compose.yml" restart valhalla

# Step 4: Wait for healthcheck
echo ""
echo "Waiting for Valhalla to become healthy (tile build may take 30-60 min on first run)..."
until docker compose -f "$PROJECT_DIR/infra/docker-compose.yml" exec valhalla curl -sf http://localhost:8002/status > /dev/null 2>&1; do
  echo "  Still building... (press Ctrl+C to stop waiting, build continues in background)"
  sleep 15
done

echo ""
echo "Valhalla is ready! Test with:"
echo "  curl 'http://localhost:8002/route' -X POST -H 'Content-Type: application/json' -d '{\"locations\":[{\"lat\":48.8566,\"lon\":2.3522},{\"lat\":45.7640,\"lon\":4.8357}],\"costing\":\"auto\"}'"
