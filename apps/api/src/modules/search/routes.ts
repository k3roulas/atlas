import { Hono } from 'hono';
import { z } from 'zod';

import { DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT } from '@atlas/shared';
import type { HonoEnv } from '../../types.ts';
import { success } from '../../utils/response.ts';
import { valkey } from '../../utils/valkey.ts';
import { extractApiKey, rateLimit, trackUsage } from '../gateway/middleware.ts';
import * as searchService from './search.service.ts';

const search = new Hono<HonoEnv>();

search.use('/v1/localities/*', extractApiKey, rateLimit, trackUsage);

const autocompleteSchema = z.object({
  query: z.string().min(2),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_SEARCH_LIMIT).default(DEFAULT_SEARCH_LIMIT),
  lang: z.string().length(2).default('en'),
});

search.get('/v1/localities/autocomplete', async (c) => {
  const parsed = autocompleteSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, 400);
  }

  const params = parsed.data;
  const cacheKey = `autocomplete:${params.query}:${params.lat ?? ''}:${params.lng ?? ''}:${params.limit}`;

  const cached = await valkey.get(cacheKey);
  if (cached) {
    c.set('cacheHit', true);
    return c.json(success(JSON.parse(cached), true));
  }

  const results = await searchService.autocomplete(params);
  await valkey.set(cacheKey, JSON.stringify(results), 'EX', 3600);

  return c.json(success(results));
});

const geocodeSchema = z.object({
  address: z.string().min(2),
  limit: z.coerce.number().int().min(1).max(MAX_SEARCH_LIMIT).default(1),
  lang: z.string().length(2).default('en'),
});

search.get('/v1/localities/geocode', async (c) => {
  const parsed = geocodeSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, 400);
  }

  const params = parsed.data;
  const results = await searchService.geocode(params);
  return c.json(success(results));
});

const reverseSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  limit: z.coerce.number().int().min(1).max(MAX_SEARCH_LIMIT).default(1),
  lang: z.string().length(2).default('en'),
});

search.get('/v1/localities/reverse', async (c) => {
  const parsed = reverseSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, 400);
  }

  const params = parsed.data;
  const results = await searchService.reverseGeocode(params);
  return c.json(success(results));
});

export { search };
