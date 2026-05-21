import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { createMeta } from './response.ts';

export class ApiError extends HTTPException {
  constructor(status: ContentfulStatusCode, code: string, message: string, details?: unknown) {
    super(status, {
      message: JSON.stringify({
        error: { code, message, details },
        meta: createMeta(),
      }),
    });
  }
}

export function errorHandler(err: Error, c: Context) {
  if (err instanceof ApiError) {
    return c.json(JSON.parse(err.message), err.status);
  }
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: { code: 'HTTP_ERROR', message: err.message },
        meta: createMeta(),
      },
      err.status
    );
  }
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      meta: createMeta(),
    },
    500
  );
}
