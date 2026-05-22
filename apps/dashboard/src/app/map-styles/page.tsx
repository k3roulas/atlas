'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

interface MapStyle {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export default function MapStylesPage() {
  const [styles, setStyles] = useState<MapStyle[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStyles = useCallback(async () => {
    try {
      const data = await apiFetch<{ data: MapStyle[] }>('/v1/map/styles');
      setStyles(data.data ?? []);
    } catch {
      // not authenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStyles();
  }, [loadStyles]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Map Styles</h1>
      <p className="mt-1 text-gray-500">Manage your custom map styles.</p>

      {loading ? (
        <p className="mt-4 text-gray-500">Loading...</p>
      ) : styles.length === 0 ? (
        <p className="mt-4 text-gray-500">No styles found.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {styles.map((style) => (
            <div key={style.id} className="rounded border p-4">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{style.name}</h3>
                {style.isDefault && (
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    Default
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Created: {new Date(style.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
