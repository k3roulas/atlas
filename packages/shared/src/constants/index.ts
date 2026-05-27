import type { Plan, RateLimits } from '../types/auth.ts';

export const PLANS: Record<Plan, { name: string; rateLimits: RateLimits }> = {
  free: {
    name: 'Free',
    rateLimits: {
      requests_per_month: 10_000,
      requests_per_second: 10,
    },
  },
  pro: {
    name: 'Pro',
    rateLimits: {
      requests_per_month: 1_000_000,
      requests_per_second: 50,
    },
  },
  enterprise: {
    name: 'Enterprise',
    rateLimits: {
      requests_per_month: Infinity,
      requests_per_second: 200,
    },
  },
};

export const DEFAULT_SEARCH_LIMIT = 5;
export const MAX_SEARCH_LIMIT = 20;

export const DEFAULT_STORE_SEARCH_LIMIT = 20;
export const MAX_STORE_SEARCH_LIMIT = 100;
export const DEFAULT_SEARCH_RADIUS_METERS = 10_000;
export const MAX_SEARCH_RADIUS_METERS = 100_000;
export const MAX_BULK_IMPORT_COUNT = 1000;

export const GEOLOCATION_CACHE_TTL_SECONDS = 3600;

export const MAX_MATRIX_SIZE = 25;
export const MAX_ISOCHRONE_RANGES = 4;
export const MAX_ISOCHRONE_RANGE_MINUTES = 120;
export const ROUTE_CACHE_TTL_SECONDS = 3600;

export const ATTRIBUTION = '© OpenStreetMap contributors';
