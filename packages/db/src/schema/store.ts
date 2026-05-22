import { customType, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { tenant } from './tenant.ts';

const geometry = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geometry(Point,4326)';
  },
});

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const store = pgTable(
  'store',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    address: text('address').notNull(),
    geom: geometry('geom').notNull(),
    metadata: jsonb('metadata'),
    tags: text('tags').array().default([]),
    openingHours: jsonb('opening_hours'),
    searchVector: tsvector('search_vector'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('store_geom_idx').using('gist', table.geom),
    index('store_search_vector_idx').using('gin', table.searchVector),
    index('store_tags_idx').using('gin', table.tags),
  ]
);
