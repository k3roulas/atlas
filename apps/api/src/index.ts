import 'dotenv/config';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { geolocation } from './modules/geolocation/routes.ts';
import { identity } from './modules/identity/routes.ts';
import { map } from './modules/map/routes.ts';
import { search } from './modules/search/routes.ts';
import { stores } from './modules/stores/routes.ts';
import { usage } from './modules/usage/routes.ts';
import { errorHandler } from './utils/error.ts';

const app = new Hono();

app.use(
  '*',
  cors({
    origin: (origin) => origin ?? '*',
    credentials: true,
  })
);

app.onError(errorHandler);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/', identity);
app.route('/', search);
app.route('/', geolocation);
app.route('/', stores);
app.route('/', map);
app.route('/', usage);

const port = Number(process.env.PORT) || 3001;

console.log(`Atlas API starting on port ${port}`);

serve({ fetch: app.fetch, port });
