import { Hono } from 'hono';
import { z } from 'zod';

import {
  MAX_ISOCHRONE_RANGE_MINUTES,
  MAX_ISOCHRONE_RANGES,
  MAX_MATRIX_SIZE,
  ROUTE_CACHE_TTL_SECONDS,
} from '@atlas/shared';
import type { HonoEnv } from '../../types.ts';
import { ApiError } from '../../utils/error.ts';
import { success } from '../../utils/response.ts';
import { valkey } from '../../utils/valkey.ts';
import { extractApiKey, rateLimit, trackUsage } from '../gateway/middleware.ts';
import * as distanceService from './distance.service.ts';

const distance = new Hono<HonoEnv>();

distance.use('/v1/distance/*', extractApiKey, rateLimit, trackUsage);

const coordSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
  .transform((v) => {
    const [lat, lng] = v.split(',').map(Number);
    return { lat, lng };
  })
  .refine((v) => v.lat >= -90 && v.lat <= 90, { message: 'lat must be between -90 and 90' })
  .refine((v) => v.lng >= -180 && v.lng <= 180, { message: 'lng must be between -180 and 180' });

const travelModeSchema = z.enum(['car', 'bike', 'foot', 'truck', 'motorcycle']).default('car');

// GET /v1/distance/route
distance.get('/v1/distance/route', async (c) => {
  const schema = z.object({
    origin: coordSchema,
    destination: coordSchema,
    mode: travelModeSchema,
  });

  const parsed = schema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', parsed.error.message);
  }

  const { origin, destination, mode } = parsed.data;

  const cacheKey = `route:${origin.lat},${origin.lng}:${destination.lat},${destination.lng}:${mode}`;
  const cached = await valkey.get(cacheKey);
  if (cached) {
    return c.json(success(JSON.parse(cached), true));
  }

  const result = await distanceService.getRoute(origin, destination, mode);

  await valkey.set(cacheKey, JSON.stringify(result), 'EX', ROUTE_CACHE_TTL_SECONDS);

  return c.json(success(result));
});

// POST /v1/distance/matrix
distance.post('/v1/distance/matrix', async (c) => {
  const pointSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  });

  const schema = z.object({
    origins: z.array(pointSchema).min(1).max(MAX_MATRIX_SIZE),
    destinations: z.array(pointSchema).min(1).max(MAX_MATRIX_SIZE),
    mode: travelModeSchema,
  });

  const body = await c.req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', parsed.error.message);
  }

  const result = await distanceService.getMatrix(
    parsed.data.origins,
    parsed.data.destinations,
    parsed.data.mode
  );

  return c.json(success(result));
});

// GET /v1/distance/isochrone
distance.get('/v1/distance/isochrone', async (c) => {
  const schema = z.object({
    origin: coordSchema,
    mode: z.enum(['car', 'bike', 'foot']).default('car'),
    range: z
      .string()
      .transform((v) =>
        v
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n))
      )
      .refine((v) => v.length >= 1 && v.length <= MAX_ISOCHRONE_RANGES, {
        message: `Must provide 1-${MAX_ISOCHRONE_RANGES} range values`,
      })
      .refine((v) => v.every((n) => n > 0 && n <= MAX_ISOCHRONE_RANGE_MINUTES), {
        message: `Each range must be between 1 and ${MAX_ISOCHRONE_RANGE_MINUTES} minutes`,
      }),
  });

  const parsed = schema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', parsed.error.message);
  }

  const { origin, mode, range } = parsed.data;

  const result = await distanceService.getIsochrone(origin, mode, range);

  return c.json(success(result));
});

export { distance };
