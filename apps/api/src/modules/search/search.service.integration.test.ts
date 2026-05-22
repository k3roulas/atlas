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

describe('search routes integration', () => {
  let _tenantId: string;
  let rawKey: string;

  beforeAll(async () => {
    await pushTestSchema();
  });

  beforeEach(async () => {
    await truncateAll();
    const tenant = await seedTenant({ name: 'Search Test' });
    _tenantId = tenant.id;

    rawKey = 'ak_test_searchkey';
    const hash = await hashKey(rawKey);
    await seedApiKey(tenant.id, { keyHash: hash, scopes: ['*'] });
  });

  function authHeaders(): Record<string, string> {
    return { 'X-API-Key': rawKey };
  }

  describe('GET /v1/localities/autocomplete', () => {
    it('rejects without API key', async () => {
      const { search } = await import('./routes.ts');
      const res = await search.request('/v1/localities/autocomplete?query=test');
      expect(res.status).toBe(401);
    });

    it('validates query is required', async () => {
      const { search } = await import('./routes.ts');
      const res = await search.request('/v1/localities/autocomplete', {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('validates query min length', async () => {
      const { search } = await import('./routes.ts');
      const res = await search.request('/v1/localities/autocomplete?query=a', {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/localities/geocode', () => {
    it('validates address is required', async () => {
      const { search } = await import('./routes.ts');
      const res = await search.request('/v1/localities/geocode', {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /v1/localities/reverse', () => {
    it('validates lat and lng are required', async () => {
      const { search } = await import('./routes.ts');
      const res = await search.request('/v1/localities/reverse', {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);
    });

    it('validates lat range with valid auth', async () => {
      const { search } = await import('./routes.ts');
      const res = await search.request('/v1/localities/reverse?lat=91&lng=0', {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);
    });
  });
});
