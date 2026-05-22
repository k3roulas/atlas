import { Hono } from 'hono';
import { z } from 'zod';

import { GEOLOCATION_CACHE_TTL_SECONDS } from '@atlas/shared';
import type { HonoEnv } from '../../types.ts';
import { success } from '../../utils/response.ts';
import { valkey } from '../../utils/valkey.ts';
import { extractApiKey, rateLimit, trackUsage } from '../gateway/middleware.ts';
import { extractClientIp, lookupIp, lookupTimezone } from './geolocation.service.ts';

const geolocation = new Hono<HonoEnv>();

geolocation.use('/v1/geolocation/*', extractApiKey, rateLimit, trackUsage);

geolocation.get('/v1/geolocation/ip', async (c) => {
  const ip = extractClientIp(c);
  const cacheKey = `geo:ip:${ip}`;

  const cached = await valkey.get(cacheKey);
  if (cached) {
    c.set('cacheHit', true);
    return c.json(success(JSON.parse(cached), true));
  }

  const result = await lookupIp(ip);
  await valkey.set(cacheKey, JSON.stringify(result), 'EX', GEOLOCATION_CACHE_TTL_SECONDS);

  return c.json(success(result));
});

const timezoneSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

geolocation.get('/v1/geolocation/timezone', async (c) => {
  const parsed = timezoneSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, 400);
  }

  const { lat, lng } = parsed.data;
  const cacheKey = `geo:tz:${lat.toFixed(4)}:${lng.toFixed(4)}`;

  const cached = await valkey.get(cacheKey);
  if (cached) {
    c.set('cacheHit', true);
    return c.json(success(JSON.parse(cached), true));
  }

  const result = await lookupTimezone(lat, lng);
  await valkey.set(cacheKey, JSON.stringify(result), 'EX', GEOLOCATION_CACHE_TTL_SECONDS);

  return c.json(success(result));
});

export { geolocation };
