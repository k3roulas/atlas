import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { tenant } from './tenant.ts';

const geometry = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geometry(Geometry, 4326)';
  },
});

export const dataset = pgTable('dataset', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  geometryType: text('geometry_type').notNull(),
  featureCount: integer('feature_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const datasetFeature = pgTable(
  'dataset_feature',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    datasetId: uuid('dataset_id')
      .notNull()
      .references(() => dataset.id, { onDelete: 'cascade' }),
    properties: jsonb('properties').notNull().default({}),
    geom: geometry('geom').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('dataset_feature_geom_idx').using('gist', table.geom)]
);
