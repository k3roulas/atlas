import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiKey, db, pushTestSchema, seedApiKey, seedTenant, truncateAll } from '@atlas/db';
import type { HonoEnv } from '../../types.ts';
import { extractApiKey, requireScope } from './middleware.ts';

vi.mock('../../utils/valkey.ts', () => ({
  valkey: {
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

describe('gateway middleware integration', () => {
  beforeAll(async () => {
    await pushTestSchema();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  describe('extractApiKey', () => {
    it('rejects requests without X-API-Key header', async () => {
      const app = new Hono<HonoEnv>();
      app.use('/test', extractApiKey);
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test');
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('MISSING_API_KEY');
    });

    it('rejects invalid API key', async () => {
      const app = new Hono<HonoEnv>();
      app.use('/test', extractApiKey);
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { 'X-API-Key': 'invalid-key' },
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('INVALID_API_KEY');
    });

    it('accepts valid API key and sets context', async () => {
      const tenant = await seedTenant({ name: 'Key Test' });
      const rawKey = 'ak_test_validkey123';
      const hash = await hashKey(rawKey);
      const key = await seedApiKey(tenant.id, {
        keyHash: hash,
        name: 'Test Key',
        scopes: ['stores:read', 'stores:write'],
      });

      const app = new Hono<HonoEnv>();
      app.use('/test', extractApiKey);
      app.get('/test', (c) =>
        c.json({
          apiKeyId: c.get('apiKeyId'),
          tenantId: c.get('tenantId'),
          scopes: c.get('scopes'),
          plan: c.get('plan'),
        })
      );

      const res = await app.request('/test', {
        headers: { 'X-API-Key': rawKey },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.apiKeyId).toBe(key.id);
      expect(body.tenantId).toBe(tenant.id);
      expect(body.scopes).toEqual(['stores:read', 'stores:write']);
      expect(body.plan).toBe('free');
    });

    it('rejects revoked API key', async () => {
      const tenant = await seedTenant({ name: 'Revoked Test' });
      const rawKey = 'ak_test_revoked';
      const hash = await hashKey(rawKey);
      await seedApiKey(tenant.id, {
        keyHash: hash,
        name: 'Revoked Key',
        scopes: ['*'],
      });

      await db.update(apiKey).set({ revokedAt: new Date() }).where(eq(apiKey.keyHash, hash));

      const app = new Hono<HonoEnv>();
      app.use('/test', extractApiKey);
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { 'X-API-Key': rawKey },
      });
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('API_KEY_REVOKED');
    });
  });

  describe('requireScope', () => {
    it('allows request with wildcard scope', async () => {
      const tenant = await seedTenant({ name: 'Wildcard' });
      const rawKey = 'ak_test_wildcard';
      const hash = await hashKey(rawKey);
      await seedApiKey(tenant.id, { keyHash: hash, scopes: ['*'] });

      const app = new Hono<HonoEnv>();
      app.use('/test', extractApiKey, requireScope('stores:read'));
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { 'X-API-Key': rawKey },
      });
      expect(res.status).toBe(200);
    });

    it('allows request with matching scope', async () => {
      const tenant = await seedTenant({ name: 'Scoped' });
      const rawKey = 'ak_test_scoped';
      const hash = await hashKey(rawKey);
      await seedApiKey(tenant.id, { keyHash: hash, scopes: ['stores:read'] });

      const app = new Hono<HonoEnv>();
      app.use('/test', extractApiKey, requireScope('stores:read'));
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { 'X-API-Key': rawKey },
      });
      expect(res.status).toBe(200);
    });

    it('rejects request without required scope', async () => {
      const tenant = await seedTenant({ name: 'No Scope' });
      const rawKey = 'ak_test_noscope';
      const hash = await hashKey(rawKey);
      await seedApiKey(tenant.id, { keyHash: hash, scopes: ['stores:read'] });

      const app = new Hono<HonoEnv>();
      app.use('/test', extractApiKey, requireScope('stores:write'));
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { 'X-API-Key': rawKey },
      });
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('INSUFFICIENT_SCOPE');
    });
  });
});
