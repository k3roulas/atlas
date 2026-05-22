import { sql } from 'drizzle-orm';

import { db } from './client.ts';
import * as schema from './schema/index.ts';

let schemaPushed = false;

export { db as getTestDb };

export type TestDatabase = typeof db;

export async function pushTestSchema() {
  if (schemaPushed) return;
  schemaPushed = true;

  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tenant (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS api_key (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
      key_hash TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      scopes TEXT[] NOT NULL DEFAULT '{}',
      rate_limits JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      revoked_at TIMESTAMPTZ
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS store (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      geom geometry(Point, 4326) NOT NULL,
      metadata JSONB,
      tags TEXT[] DEFAULT '{}',
      opening_hours JSONB,
      search_vector TSVECTOR,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS store_geom_idx ON store USING gist (geom)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS store_search_vector_idx ON store USING gin (search_vector)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS store_tags_idx ON store USING gin (tags)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS dataset (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      geometry_type TEXT NOT NULL,
      feature_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS dataset_feature (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dataset_id UUID NOT NULL REFERENCES dataset(id) ON DELETE CASCADE,
      properties JSONB NOT NULL DEFAULT '{}',
      geom geometry(Geometry, 4326) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS dataset_feature_geom_idx ON dataset_feature USING gist (geom)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS map_style (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenant(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      style_json JSONB NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS usage_daily (
      tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      date DATE NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 0,
      cache_hits INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS usage_daily_unique_idx ON usage_daily (tenant_id, date, endpoint)
  `);
}

export async function truncateAll() {
  await db.execute(
    sql`TRUNCATE TABLE usage_daily, dataset_feature, dataset, map_style, store, api_key, tenant CASCADE`
  );
}

export async function seedTenant(overrides: { id?: string; name?: string; plan?: string } = {}) {
  const [row] = await db
    .insert(schema.tenant)
    .values({
      ...(overrides.id ? { id: overrides.id } : {}),
      name: overrides.name ?? 'Test Tenant',
      plan: overrides.plan ?? 'free',
    })
    .returning();
  return row;
}

export async function seedApiKey(
  tenantId: string,
  overrides: { keyHash?: string; name?: string; scopes?: string[] } = {}
) {
  const [row] = await db
    .insert(schema.apiKey)
    .values({
      tenantId,
      keyHash: overrides.keyHash ?? 'test-key-hash',
      name: overrides.name ?? 'Test Key',
      scopes: overrides.scopes ?? ['*'],
    })
    .returning();
  return row;
}
