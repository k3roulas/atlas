import { Hono } from 'hono';
import { z } from 'zod';

import {
  DEFAULT_SEARCH_RADIUS_METERS,
  DEFAULT_STORE_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  MAX_STORE_SEARCH_LIMIT,
} from '@atlas/shared';
import type { HonoEnv } from '../../types.ts';
import { ApiError } from '../../utils/error.ts';
import { success } from '../../utils/response.ts';
import { extractApiKey, rateLimit, trackUsage } from '../gateway/middleware.ts';
import * as storesService from './stores.service.ts';

const stores = new Hono<HonoEnv>();

stores.use('/v1/stores/*', extractApiKey, rateLimit, trackUsage);

const createStoreSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  opening_hours: z.record(z.unknown()).optional(),
});

stores.post('/v1/stores', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json();
  const parsed = createStoreSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', parsed.error.message);
  }

  const created = await storesService.createStore(tenantId, {
    ...parsed.data,
    openingHours: parsed.data.opening_hours,
  });
  return c.json(success(created), 201);
});

stores.get('/v1/stores/search', async (c) => {
  const tenantId = c.get('tenantId');

  const schema = z.object({
    query: z.string().optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().int().min(1).default(DEFAULT_SEARCH_RADIUS_METERS),
    tags: z.string().optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_STORE_SEARCH_LIMIT)
      .default(DEFAULT_STORE_SEARCH_LIMIT),
    offset: z.coerce.number().int().min(0).default(0),
  });

  const parsed = schema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', parsed.error.message);
  }

  const params = parsed.data;
  const result = await storesService.searchStores(tenantId, {
    query: params.query,
    lat: params.lat,
    lng: params.lng,
    radius: params.radius,
    tags: params.tags ? params.tags.split(',') : undefined,
    limit: params.limit,
    offset: params.offset,
  });

  return c.json({
    data: result.data,
    meta: {
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    },
  });
});

const autocompleteSchema = z.object({
  query: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(MAX_SEARCH_LIMIT).default(5),
});

stores.get('/v1/stores/autocomplete', async (c) => {
  const tenantId = c.get('tenantId');
  const parsed = autocompleteSchema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', parsed.error.message);
  }

  const results = await storesService.autocompleteStores(
    tenantId,
    parsed.data.query,
    parsed.data.limit
  );
  return c.json(success(results));
});

stores.get('/v1/stores/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');

  const found = await storesService.getStoreById(id, tenantId);
  if (!found) {
    throw new ApiError(404, 'STORE_NOT_FOUND', 'Store not found');
  }

  return c.json(success(found));
});

const updateStoreSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().min(1).max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  opening_hours: z.record(z.unknown()).optional(),
});

stores.put('/v1/stores/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateStoreSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', parsed.error.message);
  }

  const updated = await storesService.updateStore(tenantId, id, {
    ...parsed.data,
    openingHours: parsed.data.opening_hours,
  });

  if (!updated) {
    throw new ApiError(404, 'STORE_NOT_FOUND', 'Store not found');
  }

  return c.json(success(updated));
});

stores.delete('/v1/stores/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');

  const deleted = await storesService.deleteStore(id, tenantId);
  if (!deleted) {
    throw new ApiError(404, 'STORE_NOT_FOUND', 'Store not found');
  }

  return c.json(success({ deleted: true }));
});

const bulkImportSchema = z.object({
  stores: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        address: z.string().min(1).max(500),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        metadata: z.record(z.unknown()).optional(),
        tags: z.array(z.string()).optional(),
        opening_hours: z.record(z.unknown()).optional(),
      })
    )
    .min(1)
    .max(1000),
});

stores.post('/v1/stores/bulk', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json();
  const parsed = bulkImportSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', parsed.error.message);
  }

  const result = await storesService.bulkImport(
    tenantId,
    parsed.data.stores.map((s) => ({
      ...s,
      openingHours: s.opening_hours,
    }))
  );

  return c.json(success(result), 201);
});

export { stores };
