import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { tenant } from './tenant.ts';

export const apiKey = pgTable('api_key', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id, { onDelete: 'cascade' }),
  keyHash: text('key_hash').notNull().unique(),
  name: text('name').notNull(),
  scopes: text('scopes').array().notNull().default([]),
  rateLimits: jsonb('rate_limits'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});
