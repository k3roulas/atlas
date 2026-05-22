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

vi.mock('./geolocation.service.ts', () => ({
  extractClientIp: vi.fn().mockReturnValue('81.2.69.144'),
  lookupIp: vi.fn().mockResolvedValue({
    ip: '81.2.69.144',
    city: 'Paris',
    country: 'France',
    country_code: 'FR',
    location: { lat: 48.8566, lng: 2.3522 },
    timezone: 'Europe/Paris',
  }),
  lookupTimezone: vi.fn().mockResolvedValue({
    timezone: 'Europe/Paris',
    offset_minutes: 60,
    location: { lat: 48.8566, lng: 2.3522 },
  }),
}));

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('geolocation routes integration', () => {
  let _tenantId: string;
  let rawKey: string;

  beforeAll(async () => {
    await pushTestSchema();
  });

  beforeEach(async () => {
    await truncateAll();
    const tenant = await seedTenant({ name: 'Geolocation Test' });
    _tenantId = tenant.id;

    rawKey = 'ak_test_geokey';
    const hash = await hashKey(rawKey);
    await seedApiKey(tenant.id, { keyHash: hash, scopes: ['*'] });
  });

  function authHeaders(): Record<string, string> {
    return { 'X-API-Key': rawKey };
  }

  describe('GET /v1/geolocation/ip', () => {
    it('rejects without API key', async () => {
      const { geolocation } = await import('./routes.ts');
      const res = await geolocation.request('/v1/geolocation/ip');
      expect(res.status).toBe(401);
    });

    it('returns geolocation result with valid API key', async () => {
      const { geolocation } = await import('./routes.ts');
      const res = await geolocation.request('/v1/geolocation/ip', {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { ip: string } };
      expect(body.data.ip).toBe('81.2.69.144');
    });
  });

  describe('GET /v1/geolocation/timezone', () => {
    it('rejects without API key', async () => {
      const { geolocation } = await import('./routes.ts');
      const res = await geolocation.request('/v1/geolocation/timezone?lat=48.8566&lng=2.3522');
      expect(res.status).toBe(401);
    });

    it('validates lat and lng are required', async () => {
      const { geolocation } = await import('./routes.ts');
      const res = await geolocation.request('/v1/geolocation/timezone', {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('validates lat range', async () => {
      const { geolocation } = await import('./routes.ts');
      const res = await geolocation.request('/v1/geolocation/timezone?lat=91&lng=0', {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);
    });

    it('validates lng range', async () => {
      const { geolocation } = await import('./routes.ts');
      const res = await geolocation.request('/v1/geolocation/timezone?lat=0&lng=181', {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);
    });

    it('returns timezone result with valid params', async () => {
      const { geolocation } = await import('./routes.ts');
      const res = await geolocation.request('/v1/geolocation/timezone?lat=48.8566&lng=2.3522', {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { timezone: string } };
      expect(body.data.timezone).toBe('Europe/Paris');
    });
  });
});
