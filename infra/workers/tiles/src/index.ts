import { PMTiles, type RangeResponse, type Source } from 'pmtiles';

interface Env {
  BASEMAP: R2Bucket;
  TILES_FILE: string;
}

class R2Source implements Source {
  private bucket: R2Bucket;
  private key: string;

  constructor(bucket: R2Bucket, key: string) {
    this.bucket = bucket;
    this.key = key;
  }

  getKey(): string {
    return this.key;
  }

  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    const object = await this.bucket.get(this.key, {
      range: { offset, length },
    });
    if (!object) {
      throw new Error(`${this.key} not found in R2`);
    }
    return {
      data: await object.arrayBuffer(),
      etag: object.etag,
      cacheControl: object.httpMetadata?.cacheControl,
    };
  }
}

const CONTENT_TYPES: Record<number, string> = {
  0: 'application/x-protobuf',
  1: 'application/vnd.mapbox-vector-tile',
  2: 'image/png',
  3: 'image/jpeg',
  4: 'image/webp',
  5: 'image/avif',
};

const TILE_RE = /^\/(\d+)\/(\d+)\/(\d+)\.pbf$/;

const DEMO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Tiles Demo</title>
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css">
  <script src="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        name: 'Tiles Demo',
        sources: {
          basemap: {
            type: 'vector',
            tiles: [window.location.origin + '/{z}/{x}/{y}.pbf'],
            maxzoom: 12,
            attribution: '&copy; OpenStreetMap contributors'
          }
        },
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#f8f8f8' } },
          { id: 'earth', type: 'fill', source: 'basemap', 'source-layer': 'earth', paint: { 'fill-color': '#e8e0d8' } },
          { id: 'landuse', type: 'fill', source: 'basemap', 'source-layer': 'landuse', paint: { 'fill-color': '#e0d8c8' } },
          { id: 'landcover', type: 'fill', source: 'basemap', 'source-layer': 'landcover', paint: { 'fill-color': '#e8e4d8', 'fill-opacity': 0.5 } },
          { id: 'water', type: 'fill', source: 'basemap', 'source-layer': 'water', paint: { 'fill-color': '#aad3df' } },
          { id: 'roads', type: 'line', source: 'basemap', 'source-layer': 'roads', paint: { 'line-color': '#ffffff', 'line-width': 1 } },
          { id: 'buildings', type: 'fill', source: 'basemap', 'source-layer': 'buildings', paint: { 'fill-color': '#d9d0c9', 'fill-opacity': 0.5 } },
          { id: 'boundaries', type: 'line', source: 'basemap', 'source-layer': 'boundaries', paint: { 'line-color': '#aaaaaa', 'line-width': 0.5, 'line-dasharray': [4, 2] } },
          { id: 'places', type: 'symbol', source: 'basemap', 'source-layer': 'places', layout: { 'text-field': '{name}', 'text-font': ['Open Sans Semibold'], 'text-size': 12 }, paint: { 'text-color': '#333333' } }
        ]
      },
      center: [2.35, 48.85],
      zoom: 5
    });
    map.addControl(new maplibregl.NavigationControl());
  </script>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const { pathname } = new URL(request.url);

    if (pathname === '/') {
      return new Response('ok');
    }

    if (pathname === '/demo' || pathname === '/demo/') {
      return new Response(DEMO_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const match = pathname.match(TILE_RE);
    if (!match) {
      return new Response('Not found', { status: 404 });
    }

    const [, zStr, xStr, yStr] = match;
    const z = Number.parseInt(zStr, 10);
    const x = Number.parseInt(xStr, 10);
    const y = Number.parseInt(yStr, 10);

    try {
      const source = new R2Source(env.BASEMAP, env.TILES_FILE);
      const archive = new PMTiles(source);

      const tile = await archive.getZxy(z, x, y);
      if (!tile) {
        return new Response(null, {
          status: 204,
          headers: { 'Access-Control-Allow-Origin': '*' },
        });
      }

      const header = await archive.getHeader();
      const contentType = CONTENT_TYPES[header.tileType] ?? 'application/x-protobuf';

      return new Response(tile.data, {
        headers: {
          'Content-Type': contentType,
          'Content-Encoding': 'gzip',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch {
      return new Response('Internal error', { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
