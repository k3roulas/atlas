import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { tenant } from './tenant.ts';

export const mapStyle = pgTable('map_style', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  styleJson: jsonb('style_json').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
