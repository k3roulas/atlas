import { resolve } from 'node:path';

import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: resolve(__dirname, '../../.env') });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  tablesFilter: ['!spatial_ref_sys', '!geography_columns', '!geometry_columns'],
  schemaFilters: ['public'],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
