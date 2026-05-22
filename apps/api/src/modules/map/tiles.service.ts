import type { TileJson } from '@atlas/shared';

const MARTIN_URL = process.env.MARTIN_URL ?? 'http://localhost:3000';
const TILES_BASE_URL = process.env.TILES_BASE_URL ?? 'http://localhost:8787';

export function getBasemapTilesUrl(): string {
  return TILES_BASE_URL;
}

export function getMartinTileUrl(table: string): string {
  return `${MARTIN_URL}/${table}/{z}/{x}/{y}.mvt`;
}

export function getTileJson(table: string, name: string): TileJson {
  return {
    tilejson: '3.0.0',
    name,
    tiles: [getMartinTileUrl(table)],
    minzoom: 0,
    maxzoom: 14,
    attribution: '© OpenStreetMap contributors',
  };
}

export async function proxyTileRequest(
  table: string,
  z: number,
  x: number,
  y: number
): Promise<{ data: ArrayBuffer; headers: Record<string, string> } | null> {
  const url = `${MARTIN_URL}/${table}/${z}/${x}/${y}.mvt`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.arrayBuffer();
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-protobuf',
      'Content-Encoding': 'gzip',
    };

    return { data, headers };
  } catch {
    return null;
  }
}
