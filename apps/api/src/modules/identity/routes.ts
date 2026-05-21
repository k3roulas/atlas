import { Hono } from 'hono';

import { auth } from './identity.ts';

const identity = new Hono();

// Mount better-auth routes under /v1/auth
identity.on(['POST', 'GET'], '/v1/auth/**', (c) => auth.handler(c.req.raw));

export { identity };
