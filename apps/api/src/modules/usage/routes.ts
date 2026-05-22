import { Hono } from 'hono';
import { z } from 'zod';

import type { HonoEnv } from '../../types.ts';
import { success } from '../../utils/response.ts';
import { extractApiKey } from '../gateway/middleware.ts';
import * as usageService from './usage.service.ts';

const usage = new Hono<HonoEnv>();

usage.use('/v1/usage/*', extractApiKey);

const usageQuerySchema = z.object({
  period: z
    .string()
    .regex(/^\d+d$/)
    .default('30d'),
  endpoint: z.string().optional(),
});

usage.get('/v1/usage', async (c) => {
  const parsed = usageQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, 400);
  }

  const tenantId = c.get('tenantId');
  const data = await usageService.getUsage(tenantId, parsed.data.period, parsed.data.endpoint);

  return c.json(success(data));
});

export { usage };
