#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Atlas Photon Setup (France Region) ==="
echo ""
echo "The rtuszik/photon-docker image downloads a pre-built"
echo "OpenStreetMap search index for France (~3GB) on first start."
echo "UK is not available as a regional extract; France is used for local dev."
echo ""
echo "Starting Photon..."
docker compose -f "$INFRA_DIR/docker-compose.yml" up -d photon

echo ""
echo "Photon is downloading the France search index (first run only)."
echo "Monitor progress with:"
echo "  docker compose -f $INFRA_DIR/docker-compose.yml logs -f photon"
echo ""
echo "Once ready, the API will be available at http://localhost:2322"
echo "Test with: curl 'http://localhost:2322/api?q=Paris'"
