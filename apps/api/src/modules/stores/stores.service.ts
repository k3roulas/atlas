import { and, eq, type SQL, sql } from 'drizzle-orm';

import { db } from '@atlas/db/client';
import { store } from '@atlas/db/schema';
import {
  DEFAULT_STORE_SEARCH_LIMIT,
  MAX_BULK_IMPORT_COUNT,
  MAX_SEARCH_RADIUS_METERS,
  MAX_STORE_SEARCH_LIMIT,
} from '@atlas/shared';
import { ApiError } from '../../utils/error.ts';

export async function createStore(
  tenantId: string,
  data: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    metadata?: Record<string, unknown>;
    tags?: string[];
    openingHours?: Record<string, unknown>;
  }
) {
  const [created] = await db
    .insert(store)
    .values({
      tenantId,
      name: data.name,
      address: data.address,
      geom: sql`ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)`,
      searchVector: sql`to_tsvector('english', ${data.name} || ' ' || ${data.address})`,
      metadata: data.metadata,
      tags: data.tags,
      openingHours: data.openingHours,
    })
    .returning();

  return toStoreResponse(created);
}

export async function getStoreById(id: string, tenantId: string) {
  const results = await db
    .select()
    .from(store)
    .where(and(eq(store.id, id), eq(store.tenantId, tenantId)))
    .limit(1);

  if (results.length === 0) return null;
  return toStoreResponse(results[0]);
}

export async function updateStore(
  id: string,
  tenantId: string,
  data: {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
    metadata?: Record<string, unknown>;
    tags?: string[];
    openingHours?: Record<string, unknown>;
  }
) {
  const existing = await db
    .select()
    .from(store)
    .where(and(eq(store.id, id), eq(store.tenantId, tenantId)))
    .limit(1);

  if (existing.length === 0) return null;

  const newName = data.name ?? existing[0].name;
  const newAddress = data.address ?? existing[0].address;

  const setValues: Record<
    string,
    string | number | boolean | Record<string, unknown> | string[] | null | SQL
  > = {};
  if (data.name !== undefined) setValues.name = data.name;
  if (data.address !== undefined) setValues.address = data.address;
  if (data.metadata !== undefined) setValues.metadata = data.metadata;
  if (data.tags !== undefined) setValues.tags = data.tags;
  if (data.openingHours !== undefined) setValues.openingHours = data.openingHours;
  if (data.lat !== undefined && data.lng !== undefined) {
    setValues.geom = sql`ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)`;
  }
  setValues.searchVector = sql`to_tsvector('english', ${newName} || ' ' || ${newAddress})`;

  await db.update(store).set(setValues).where(eq(store.id, id));

  const refreshed = await db.select().from(store).where(eq(store.id, id)).limit(1);
  if (refreshed.length === 0) return null;
  const updated = refreshed[0];

  return toStoreResponse(updated);
}

export async function deleteStore(id: string, tenantId: string): Promise<boolean> {
  const result = await db
    .delete(store)
    .where(and(eq(store.id, id), eq(store.tenantId, tenantId)))
    .returning({ id: store.id });

  return result.length > 0;
}

export async function searchStores(
  tenantId: string,
  params: {
    query?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    tags?: string[];
    limit?: number;
    offset?: number;
  }
) {
  const limit = Math.min(params.limit ?? DEFAULT_STORE_SEARCH_LIMIT, MAX_STORE_SEARCH_LIMIT);
  const offset = params.offset ?? 0;
  const radius = Math.min(params.radius ?? MAX_SEARCH_RADIUS_METERS, MAX_SEARCH_RADIUS_METERS);

  const conditions = [eq(store.tenantId, tenantId)];

  if (params.lat != null && params.lng != null) {
    conditions.push(
      sql`ST_DWithin(${store.geom}, ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326), ${radius})`
    );
  }

  if (params.tags && params.tags.length > 0) {
    conditions.push(
      sql`${store.tags} && ${sql`ARRAY[${sql.join(
        params.tags.map((t) => sql`${t}`),
        sql`, `
      )}]::text[]`}`
    );
  }

  if (params.query) {
    conditions.push(
      sql`(${store.searchVector} @@ plainto_tsquery('english', ${params.query}) OR ${store.name} ILIKE ${`%${params.query}%`})`
    );
  }

  const whereClause = and(...conditions);

  const distanceSelect =
    params.lat != null && params.lng != null
      ? sql`ST_Distance(${store.geom}, ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)) as distance`
      : sql`NULL as distance`;

  const results = await db
    .select({
      id: store.id,
      tenantId: store.tenantId,
      name: store.name,
      address: store.address,
      geom: store.geom,
      metadata: store.metadata,
      tags: store.tags,
      openingHours: store.openingHours,
      createdAt: store.createdAt,
      distance: distanceSelect,
    })
    .from(store)
    .where(whereClause)
    .orderBy(
      params.lat != null && params.lng != null
        ? sql`ST_Distance(${store.geom}, ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326))`
        : store.createdAt
    )
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(store)
    .where(whereClause);

  const total = Number(countResult[0].count);

  return {
    data: results.map(toStoreSearchResult),
    total,
    limit,
    offset,
  };
}

export async function autocompleteStores(tenantId: string, query: string, limit = 5) {
  const results = await db
    .select({
      id: store.id,
      name: store.name,
      address: store.address,
      geom: store.geom,
    })
    .from(store)
    .where(and(eq(store.tenantId, tenantId), sql`${store.name} ILIKE ${`${query}%`}`))
    .limit(limit);

  return results.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    location: geomToLocation(r.geom as string),
  }));
}

export async function bulkImport(
  tenantId: string,
  stores: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    metadata?: Record<string, unknown>;
    tags?: string[];
    openingHours?: Record<string, unknown>;
  }[]
) {
  if (stores.length > MAX_BULK_IMPORT_COUNT) {
    throw new ApiError(
      400,
      'BULK_LIMIT_EXCEEDED',
      `Maximum ${MAX_BULK_IMPORT_COUNT} stores per request`
    );
  }

  const values = stores.map((s) => ({
    tenantId,
    name: s.name,
    address: s.address,
    geom: sql`ST_SetSRID(ST_MakePoint(${s.lng}, ${s.lat}), 4326)`,
    searchVector: sql`to_tsvector('english', ${s.name} || ' ' || ${s.address})`,
    metadata: s.metadata,
    tags: s.tags,
    openingHours: s.openingHours,
  }));

  const inserted = await db.insert(store).values(values).returning({ id: store.id });

  return {
    created: inserted.length,
    errors: [] as { index: number; message: string }[],
  };
}

function geomToLocation(geom: string): { lat: number; lng: number } {
  if (/^[0-9a-fA-F]+$/.test(geom) && geom.length >= 50) {
    const buf = Buffer.from(geom, 'hex');
    const littleEndian = buf.readUInt8(0) === 1;
    let offset = 1;
    const type = littleEndian ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
    offset += 4;
    if (type & 0x20000000) offset += 4; // SRID flag
    if (buf.length >= offset + 16) {
      const readDouble = littleEndian
        ? (o: number) => buf.readDoubleLE(o)
        : (o: number) => buf.readDoubleBE(o);
      const lng = readDouble(offset);
      const lat = readDouble(offset + 8);
      return { lat, lng };
    }
    return { lat: 0, lng: 0 };
  }
  const match = geom.match(/POINT\(([^ ]+) ([^)]+)\)/i);
  if (!match) return { lat: 0, lng: 0 };
  return { lng: Number.parseFloat(match[1]), lat: Number.parseFloat(match[2]) };
}

function toStoreResponse(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    tenant_id: row.tenantId as string,
    name: row.name as string,
    address: row.address as string,
    location: geomToLocation(row.geom as string),
    metadata: row.metadata as Record<string, unknown> | null,
    tags: row.tags as string[] | null,
    opening_hours: row.openingHours as Record<string, unknown> | null,
    created_at: row.createdAt as string,
  };
}

function toStoreSearchResult(row: Record<string, unknown>) {
  return {
    ...toStoreResponse(row),
    distance: row.distance != null ? Number(row.distance) : undefined,
  };
}
