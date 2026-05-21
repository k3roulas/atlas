export type Plan = 'free' | 'pro' | 'enterprise';

export interface ApiKeyScopes {
  localities?: boolean;
  stores?: boolean;
  map?: boolean;
  geolocation?: boolean;
}

export interface ApiKey {
  id: string;
  tenant_id: string;
  name: string;
  scopes: ApiKeyScopes;
  rate_limits?: RateLimits;
  created_at: string;
  revoked_at: string | null;
}

export interface RateLimits {
  requests_per_month: number;
  requests_per_second: number;
}

export interface Tenant {
  id: string;
  name: string;
  plan: Plan;
  created_at: string;
}
