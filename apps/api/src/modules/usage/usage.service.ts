import { and, eq, gte } from 'drizzle-orm';

import { db } from '@atlas/db/client';
import { usageDaily } from '@atlas/db/schema';

export interface UsageEntry {
  endpoint: string;
  date: string;
  request_count: number;
  cache_hits: number;
}

export interface UsageSummary {
  total_requests: number;
  total_cache_hits: number;
  cache_hit_rate: number;
  by_endpoint: Record<string, { requests: number; cache_hits: number }>;
  daily: UsageEntry[];
}

function periodToDate(period: string): Date {
  const match = /^(\d+)d$/.exec(period);
  if (!match) {
    throw new Error('Invalid period format. Use: 7d, 30d, 90d');
  }
  const days = Number.parseInt(match[1], 10);
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getUsage(
  tenantId: string,
  period: string,
  endpointFilter?: string
): Promise<UsageSummary> {
  const since = periodToDate(period);
  const sinceStr = since.toISOString().split('T')[0];

  const conditions = [gte(usageDaily.date, sinceStr), eq(usageDaily.tenantId, tenantId)];
  if (endpointFilter) {
    conditions.push(eq(usageDaily.endpoint, endpointFilter));
  }

  const rows = await db
    .select({
      endpoint: usageDaily.endpoint,
      date: usageDaily.date,
      requestCount: usageDaily.requestCount,
      cacheHits: usageDaily.cacheHits,
    })
    .from(usageDaily)
    .where(and(...conditions))
    .orderBy(usageDaily.date);

  const daily: UsageEntry[] = rows.map((r) => ({
    endpoint: r.endpoint,
    date: r.date,
    request_count: r.requestCount,
    cache_hits: r.cacheHits,
  }));

  let totalRequests = 0;
  let totalCacheHits = 0;
  const byEndpoint: Record<string, { requests: number; cache_hits: number }> = {};

  for (const entry of daily) {
    totalRequests += entry.request_count;
    totalCacheHits += entry.cache_hits;

    if (!byEndpoint[entry.endpoint]) {
      byEndpoint[entry.endpoint] = { requests: 0, cache_hits: 0 };
    }
    byEndpoint[entry.endpoint].requests += entry.request_count;
    byEndpoint[entry.endpoint].cache_hits += entry.cache_hits;
  }

  return {
    total_requests: totalRequests,
    total_cache_hits: totalCacheHits,
    cache_hit_rate: totalRequests > 0 ? totalCacheHits / totalRequests : 0,
    by_endpoint: byEndpoint,
    daily,
  };
}
