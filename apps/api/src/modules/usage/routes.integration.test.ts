import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { pushTestSchema, seedApiKey, seedTenant, truncateAll } from '@atlas/db';

vi.mock('../../utils/valkey.ts', () => ({
  valkey: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue('OK'),
  },
}));

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('usage routes integration', () => {
  let rawKey: string;

  beforeAll(async () => {
    await pushTestSchema();
  });

  beforeEach(async () => {
    await truncateAll();
    const tenant = await seedTenant({ name: 'Usage Test' });

    rawKey = 'ak_test_usagekey';
    const hash = await hashKey(rawKey);
    await seedApiKey(tenant.id, { keyHash: hash, scopes: ['*'] });
  });

  function authHeaders(): Record<string, string> {
    return { 'X-API-Key': rawKey };
  }

  describe('GET /v1/usage', () => {
    it('rejects without API key', async () => {
      const { usage } = await import('./routes.ts');
      const res = await usage.request('/v1/usage');
      expect(res.status).toBe(401);
    });

    it('returns empty usage with valid API key', async () => {
      const { usage } = await import('./routes.ts');
      const res = await usage.request('/v1/usage', {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { total_requests: number; daily: unknown[] };
      };
      expect(body.data.total_requests).toBe(0);
      expect(body.data.daily).toEqual([]);
    });

    it('accepts custom period param', async () => {
      const { usage } = await import('./routes.ts');
      const res = await usage.request('/v1/usage?period=7d', {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
    });

    it('rejects invalid period format', async () => {
      const { usage } = await import('./routes.ts');
      const res = await usage.request('/v1/usage?period=1w', {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('accepts endpoint filter', async () => {
      const { usage } = await import('./routes.ts');
      const res = await usage.request('/v1/usage?endpoint=/v1/localities/autocomplete', {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
    });

    it('includes cache_hit_rate in response', async () => {
      const { usage } = await import('./routes.ts');
      const res = await usage.request('/v1/usage', {
        headers: authHeaders(),
      });
      const body = (await res.json()) as { data: { cache_hit_rate: number } };
      expect(typeof body.data.cache_hit_rate).toBe('number');
    });
  });
});
