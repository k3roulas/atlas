type HonoEnv = {
  Variables: {
    apiKeyId: string;
    tenantId: string;
    scopes: string[];
    plan: string;
    cacheHit: boolean;
  };
};

export type { HonoEnv };
