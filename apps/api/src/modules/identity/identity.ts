import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { db } from '@atlas/db/client';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://api.localhost',
  trustedOrigins: ['http://dashboard.localhost', 'http://localhost:3002'],
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
  },
});
