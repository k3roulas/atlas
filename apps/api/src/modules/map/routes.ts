import { Hono } from 'hono';
import { z } from 'zod';

import type { HonoEnv } from '../../types.ts';
import { ApiError } from '../../utils/error.ts';
import { success } from '../../utils/response.ts';
import { extractApiKey, rateLimit, trackUsage } from '../gateway/middleware.ts';
import * as stylesService from './styles.service.ts';
import * as tilesService from './tiles.service.ts';

const map = new Hono<HonoEnv>();

map.use('/v1/map/*', extractApiKey, rateLimit, trackUsage);

map.get('/v1/map/styles', async (c) => {
  const tenantId = c.get('tenantId');
  const styles = await stylesService.getStyles(tenantId);
  return c.json(success(styles));
});

map.get('/v1/map/styles/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');

  const style = await stylesService.getStyleById(id, tenantId);
  if (!style) {
    throw new ApiError(404, 'STYLE_NOT_FOUND', 'Map style not found');
  }

  const styleJson =
    typeof style.styleJson === 'string' ? style.styleJson : JSON.stringify(style.styleJson);

  const resolved = styleJson
    .replace(/__BASEMAP_TILES_URL__/g, tilesService.getBasemapTilesUrl())
    .replace(/__TILEJSON_URL__/g, `${c.req.url.replace(/\/styles\/[^/]+$/, '')}/tiles/stores.json`);

  return c.json(
    success({
      ...style,
      styleJson: JSON.parse(resolved),
    })
  );
});

const createStyleSchema = z.object({
  name: z.string().min(1).max(100),
  style_json: z.record(z.unknown()),
});

map.post('/v1/map/styles', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json();
  const parsed = createStyleSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', parsed.error.message);
  }

  const created = await stylesService.createStyle(
    tenantId,
    parsed.data.name,
    parsed.data.style_json
  );
  return c.json(success(created), 201);
});

map.delete('/v1/map/styles/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');

  const deleted = await stylesService.deleteStyle(id, tenantId);
  if (!deleted) {
    throw new ApiError(404, 'STYLE_NOT_FOUND', 'Map style not found or cannot be deleted');
  }

  return c.json(success({ deleted: true }));
});

const tileParamsSchema = z.object({
  z: z.coerce.number().int().min(0).max(22),
  x: z.coerce.number().int().min(0),
  y: z.coerce.number().int().min(0),
});

map.get('/v1/map/tiles/:table/:z/:x/:y.mvt', async (c) => {
  const table = c.req.param('table');
  const parsed = tileParamsSchema.safeParse({
    z: c.req.param('z'),
    x: c.req.param('x'),
    y: c.req.param('y'),
  });

  if (!parsed.success) {
    throw new ApiError(400, 'INVALID_TILE_PARAMS', parsed.error.message);
  }

  const { z, x, y } = parsed.data;
  const result = await tilesService.proxyTileRequest(table, z, x, y);

  if (!result) {
    throw new ApiError(404, 'TILE_NOT_FOUND', 'Tile not available');
  }

  return new Response(result.data, {
    headers: result.headers,
  });
});

map.get('/v1/map/tiles/:table.json', async (c) => {
  const table = c.req.param('table') ?? '';
  const tilejson = tilesService.getTileJson(table, `atlas-${table}`);
  return c.json(success(tilejson));
});

export { map };
