import { eq, sql } from 'drizzle-orm';
import type { Context, Next } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { db } from '@atlas/db/client';
import { apiKey, tenant } from '@atlas/db/schema';
import { PLANS } from '@atlas/shared';
import type { HonoEnv } from '../../types.ts';
import { ApiError } from '../../utils/error.ts';
import { valkey } from '../../utils/valkey.ts';

export async function extractApiKey(c: Context<HonoEnv>, next: Next) {
  const key = c.req.header('X-API-Key');
  if (!key) {
    throw new ApiError(401, 'MISSING_API_KEY', 'X-API-Key header is required');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const result = await db
    .select({
      id: apiKey.id,
      tenantId: apiKey.tenantId,
      scopes: apiKey.scopes,
      revokedAt: apiKey.revokedAt,
      plan: tenant.plan,
    })
    .from(apiKey)
    .innerJoin(tenant, eq(apiKey.tenantId, tenant.id))
    .where(eq(apiKey.keyHash, keyHash))
    .limit(1);

  if (result.length === 0) {
    throw new ApiError(401, 'INVALID_API_KEY', 'Invalid API key');
  }

  const found = result[0];
  if (found.revokedAt) {
    throw new ApiError(403, 'API_KEY_REVOKED', 'This API key has been revoked');
  }

  c.set('apiKeyId', found.id);
  c.set('tenantId', found.tenantId);
  c.set('scopes', found.scopes);
  c.set('plan', found.plan);

  await next();
}

export function requireScope(scope: string) {
  return async (c: Context<HonoEnv>, next: Next) => {
    const scopes = c.get('scopes');
    if (!scopes || (!scopes.includes('*') && !scopes.includes(scope))) {
      throw new ApiError(403, 'INSUFFICIENT_SCOPE', `Missing required scope: ${scope}`);
    }
    await next();
  };
}

export async function rateLimit(c: Context<HonoEnv>, next: Next) {
  const tenantId = c.get('tenantId');
  const plan = c.get('plan');

  const planConfig = PLANS[plan as keyof typeof PLANS] ?? PLANS.free;
  const limit = planConfig.rateLimits.requests_per_month;

  if (limit === Infinity) {
    await next();
    return;
  }

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const key = `ratelimit:${tenantId}:${monthKey}`;

  const current = await valkey.incr(key);
  if (current === 1) {
    await valkey.expire(key, 86400 * 31);
  }

  if (current > limit) {
    const retryAfter = Math.ceil((86400 * 31) / limit);
    c.header('Retry-After', String(retryAfter));
    throw new ApiError(
      429 as ContentfulStatusCode,
      'RATE_LIMIT_EXCEEDED',
      'Monthly request limit exceeded'
    );
  }

  c.header('X-RateLimit-Limit', String(limit));
  c.header('X-RateLimit-Remaining', String(Math.max(0, limit - current)));

  await next();
}

export async function trackUsage(c: Context<HonoEnv>, next: Next) {
  await next();

  const tenantId = c.get('tenantId');

  const path = new URL(c.req.url).pathname;
  const endpoint = path.split('/').slice(0, 4).join('/');
  const today = new Date().toISOString().split('T')[0];
  const cacheHit = c.get('cacheHit') ?? false;

  db.execute(
    sql`INSERT INTO usage_daily (tenant_id, endpoint, date, request_count, cache_hits)
        VALUES (${tenantId}, ${endpoint}, ${today}, 1, ${cacheHit ? 1 : 0})
        ON CONFLICT (tenant_id, endpoint, date)
        DO UPDATE SET request_count = usage_daily.request_count + 1,
                      cache_hits = usage_daily.cache_hits + ${cacheHit ? 1 : 0}`
  ).catch(() => {});
}
