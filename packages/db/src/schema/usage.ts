import { date, index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { tenant } from './tenant.ts';

export const usageDaily = pgTable(
  'usage_daily',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    date: date('date').notNull(),
    requestCount: integer('request_count').notNull().default(0),
    cacheHits: integer('cache_hits').notNull().default(0),
  },
  (table) => [index('usage_daily_unique_idx').on(table.tenantId, table.date, table.endpoint)]
);
