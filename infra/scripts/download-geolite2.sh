#!/bin/bash
set -euo pipefail

DATA_DIR="./data"
mkdir -p "$DATA_DIR"

if [ -z "${MAXMIND_LICENSE_KEY:-}" ]; then
  echo "Error: MAXMIND_LICENSE_KEY env var is required"
  echo "Get a free license key at https://www.maxmind.com/en/geolite2/signup"
  exit 1
fi

echo "Downloading GeoLite2-City database..."
curl -fsSL \
  "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz" \
  -o "${DATA_DIR}/GeoLite2-City.tar.gz"

tar -xzf "${DATA_DIR}/GeoLite2-City.tar.gz" -C "${DATA_DIR}" --strip-components=1
rm -f "${DATA_DIR}/GeoLite2-City.tar.gz"

echo "Downloaded ${DATA_DIR}/GeoLite2-City.mmdb"
