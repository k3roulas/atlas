#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PMTILES_FILE="${SCRIPT_DIR}/../../data/pmtiles/france.pmtiles"

if [ ! -f "$PMTILES_FILE" ]; then
  echo "Error: $PMTILES_FILE not found."
  echo "Place a France PMTiles extract at infra/data/pmtiles/france.pmtiles"
  echo "Example: pmtiles extract world.pmtiles france.pmtiles --bbox -5,41,10,52"
  exit 1
fi

echo "Uploading france.pmtiles to local R2 store..."
cd "$SCRIPT_DIR"
npx wrangler r2 object put basemap-tiles/france.pmtiles \
  --file "$PMTILES_FILE" \
  --local

echo "Done. Run 'pnpm dev' to start the tiles worker."
