'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

interface UsageEntry {
  endpoint: string;
  date: string;
  request_count: number;
  cache_hits: number;
}

interface UsageData {
  total_requests: number;
  total_cache_hits: number;
  cache_hit_rate: number;
  by_endpoint: Record<string, { requests: number; cache_hits: number }>;
  daily: UsageEntry[];
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUsage = useCallback(async () => {
    try {
      const data = await apiFetch<{ data: UsageData }>('/v1/usage?period=30d');
      setUsage(data.data);
    } catch {
      // not authenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const totalRequests = usage?.total_requests ?? 0;
  const totalCacheHits = usage?.total_cache_hits ?? 0;
  const cacheHitRate = usage?.cache_hit_rate ?? 0;
  const daily = usage?.daily ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Usage</h1>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Total Requests (30d)</p>
          <p className="text-2xl font-bold">{totalRequests.toLocaleString()}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Cache Hits</p>
          <p className="text-2xl font-bold">{totalCacheHits.toLocaleString()}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Cache Hit Rate</p>
          <p className="text-2xl font-bold">
            {totalRequests > 0 ? (cacheHitRate * 100).toFixed(1) : '0'}%
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-gray-500">Loading...</p>
      ) : !usage || daily.length === 0 ? (
        <p className="mt-4 text-gray-500">No usage data yet.</p>
      ) : (
        <table className="mt-4 w-full">
          <thead>
            <tr className="border-b text-left text-sm text-gray-500">
              <th className="pb-2">Endpoint</th>
              <th className="pb-2">Date</th>
              <th className="pb-2">Requests</th>
              <th className="pb-2">Cache Hits</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((entry) => (
              <tr key={`${entry.endpoint}-${entry.date}`} className="border-b">
                <td className="py-2 font-mono text-sm">{entry.endpoint}</td>
                <td className="py-2 text-sm">{entry.date}</td>
                <td className="py-2 text-sm">{entry.request_count}</td>
                <td className="py-2 text-sm">{entry.cache_hits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
