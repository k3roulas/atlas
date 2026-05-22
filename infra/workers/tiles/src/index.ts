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
