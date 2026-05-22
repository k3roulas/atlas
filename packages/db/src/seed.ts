import { db } from './client.ts';
import * as schema from './schema/index.ts';

const DEV_API_KEY = 'ak_live_dashboard_dev_key_12345678';

const LIGHT_STYLE = {
  version: 8,
  name: 'Atlas Light',
  sources: {
    basemap: {
      type: 'vector',
      tiles: ['__BASEMAP_TILES_URL__/{z}/{x}/{y}.pbf'],
      maxzoom: 12,
      attribution: '© OpenStreetMap contributors',
    },
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

const DARK_STYLE = {
  version: 8,
  name: 'Atlas Dark',
  sources: {
    basemap: {
      type: 'vector',
      tiles: ['__BASEMAP_TILES_URL__/{z}/{x}/{y}.pbf'],
      maxzoom: 12,
      attribution: '© OpenStreetMap contributors',
    },
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

async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function seed() {
  console.log('Seeding database...');

  const [ten] = await db
    .insert(schema.tenant)
    .values({ name: 'Dev Tenant', plan: 'free' })
    .returning();
  console.log(`Created tenant: ${ten.id}`);

  const keyHash = await hashKey(DEV_API_KEY);
  const [key] = await db
    .insert(schema.apiKey)
    .values({
      tenantId: ten.id,
      keyHash,
      name: 'Dashboard Dev Key',
      scopes: ['*'],
    })
    .returning();
  console.log(`Created API key: ${key.id}`);
  console.log(`  Raw key: ${DEV_API_KEY}`);

  await db.insert(schema.mapStyle).values([
    {
      tenantId: ten.id,
      name: 'light',
      styleJson: LIGHT_STYLE,
      isDefault: true,
    },
    {
      tenantId: ten.id,
      name: 'dark',
      styleJson: DARK_STYLE,
      isDefault: true,
    },
  ]);
  console.log('Created default map styles (light, dark)');

  console.log('Done!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
