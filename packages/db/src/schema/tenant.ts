import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const tenant = pgTable('tenant', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  plan: text('plan').notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
