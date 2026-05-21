import { nanoid } from 'nanoid';

import type { ApiMeta, ApiResponse } from '@atlas/shared';
import { ATTRIBUTION } from '@atlas/shared';

export function createMeta(cacheHit = false): ApiMeta {
  return {
    request_id: nanoid(),
    attribution: ATTRIBUTION,
    cache_hit: cacheHit,
  };
}

export function success<T>(data: T, cacheHit = false): ApiResponse<T> {
  return {
    data,
    meta: createMeta(cacheHit),
  };
}
