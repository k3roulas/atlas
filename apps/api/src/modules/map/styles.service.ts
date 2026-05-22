import { eq, or } from 'drizzle-orm';

import { db } from '@atlas/db/client';
import { mapStyle } from '@atlas/db/schema';

const BASEMAP_SOURCE = {
  type: 'vector',
  tiles: ['__BASEMAP_TILES_URL__/{z}/{x}/{y}.pbf'],
  maxzoom: 12,
  attribution: '© OpenStreetMap contributors',
};

const LIGHT_STYLE: Record<string, unknown> = {
  version: 8,
  name: 'Atlas Light',
  sources: {
    basemap: BASEMAP_SOURCE,
    atlas: {
      type: 'vector',
      url: '__TILEJSON_URL__',
    },
  },
  sprite: '',
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#f8f8f8' },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'basemap',
      'source-layer': 'water',
      paint: { 'fill-color': '#aad3df' },
    },
    {
      id: 'land',
      type: 'fill',
      source: 'basemap',
      'source-layer': 'landuse',
      paint: { 'fill-color': '#e8e0d8' },
    },
    {
      id: 'roads',
      type: 'line',
      source: 'basemap',
      'source-layer': 'roads',
      paint: { 'line-color': '#ffffff', 'line-width': 1 },
    },
    {
      id: 'buildings',
      type: 'fill',
      source: 'basemap',
      'source-layer': 'buildings',
      paint: { 'fill-color': '#d9d0c9', 'fill-opacity': 0.5 },
    },
    {
      id: 'labels',
      type: 'symbol',
      source: 'basemap',
      'source-layer': 'places',
      layout: {
        'text-field': '{name}',
        'text-font': ['Open Sans Regular'],
        'text-size': 12,
      },
      paint: { 'text-color': '#333333' },
    },
  ],
};

const DARK_STYLE: Record<string, unknown> = {
  version: 8,
  name: 'Atlas Dark',
  sources: {
    basemap: BASEMAP_SOURCE,
    atlas: {
      type: 'vector',
      url: '__TILEJSON_URL__',
    },
  },
  sprite: '',
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#1a1a2e' },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'basemap',
      'source-layer': 'water',
      paint: { 'fill-color': '#1a3a5c' },
    },
    {
      id: 'land',
      type: 'fill',
      source: 'basemap',
      'source-layer': 'landuse',
      paint: { 'fill-color': '#2a2a3e' },
    },
    {
      id: 'roads',
      type: 'line',
      source: 'basemap',
      'source-layer': 'roads',
      paint: { 'line-color': '#3a3a5e', 'line-width': 1 },
    },
    {
      id: 'buildings',
      type: 'fill',
      source: 'basemap',
      'source-layer': 'buildings',
      paint: { 'fill-color': '#252540', 'fill-opacity': 0.7 },
    },
    {
      id: 'labels',
      type: 'symbol',
      source: 'basemap',
      'source-layer': 'places',
      layout: {
        'text-field': '{name}',
        'text-font': ['Open Sans Regular'],
        'text-size': 12,
      },
      paint: { 'text-color': '#cccccc' },
    },
  ],
};

export async function getStyles(tenantId: string) {
  return db
    .select()
    .from(mapStyle)
    .where(or(eq(mapStyle.tenantId, tenantId), eq(mapStyle.isDefault, true)));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getStyleById(idOrName: string, tenantId: string) {
  const isUuid = UUID_RE.test(idOrName);
  const conditions = isUuid
    ? or(eq(mapStyle.id, idOrName), eq(mapStyle.name, idOrName))
    : eq(mapStyle.name, idOrName);

  const results = await db.select().from(mapStyle).where(conditions).limit(1);

  const found = results[0];
  if (!found) return null;

  if (!found.isDefault && found.tenantId !== tenantId) return null;

  return found;
}

export async function createStyle(
  tenantId: string,
  name: string,
  styleJson: Record<string, unknown>
) {
  const [created] = await db.insert(mapStyle).values({ tenantId, name, styleJson }).returning();
  return created;
}

export async function deleteStyle(id: string, tenantId: string) {
  const results = await db
    .select()
    .from(mapStyle)
    .where(or(eq(mapStyle.id, id)))
    .limit(1);

  const found = results[0];
  if (!found || found.isDefault || found.tenantId !== tenantId) return false;

  await db.delete(mapStyle).where(eq(mapStyle.id, id));
  return true;
}

export function getDefaultLightStyle(urls: {
  basemapUrl: string;
  tilejsonUrl: string;
}): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(LIGHT_STYLE)
      .replace(/__BASEMAP_TILES_URL__/g, urls.basemapUrl)
      .replace('__TILEJSON_URL__', urls.tilejsonUrl)
  );
}

export function getDefaultDarkStyle(urls: {
  basemapUrl: string;
  tilejsonUrl: string;
}): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(DARK_STYLE)
      .replace(/__BASEMAP_TILES_URL__/g, urls.basemapUrl)
      .replace('__TILEJSON_URL__', urls.tilejsonUrl)
  );
}
