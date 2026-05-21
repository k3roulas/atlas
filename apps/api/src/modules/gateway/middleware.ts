import { eq } from 'drizzle-orm';
import type { Context, Next } from 'hono';

import { db } from '@atlas/db/client';
import { apiKey } from '@atlas/db/schema';
import { ApiError } from '../../utils/error.ts';

export async function extractApiKey(c: Context, next: Next) {
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
    })
    .from(apiKey)
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

  await next();
}

export function requireScope(scope: string) {
  return async (c: Context, next: Next) => {
    const scopes = c.get('scopes') as string[] | undefined;
    if (!scopes || (!scopes.includes('*') && !scopes.includes(scope))) {
      throw new ApiError(403, 'INSUFFICIENT_SCOPE', `Missing required scope: ${scope}`);
    }
    await next();
  };
}
