'use client';

import { useCallback, useEffect, useState } from 'react';
import { StoresMap } from '@/components/stores-map';
import { apiFetch } from '@/lib/api-client';

interface Store {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  tags: string[] | null;
  created_at: string;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '50' };
      if (query) params.query = query;
      const data = await apiFetch<{ data: Store[] }>('/v1/stores/search', { params });
      setStores(data.data ?? []);
    } catch {
      // not authenticated or endpoint error
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this store?')) return;
    try {
      await apiFetch(`/v1/stores/${id}`, { method: 'DELETE' });
      setStores((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // handle error
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stores</h1>
        <a
          href="/stores/new"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Add Store
        </a>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="Search stores..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadStores()}
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button
          type="button"
          onClick={loadStores}
          className="rounded border px-4 py-2 hover:bg-gray-50"
        >
          Search
        </button>
      </div>

      <div className="mt-4 flex gap-1">
        <button
          type="button"
          onClick={() => setViewMode('table')}
          className={`rounded px-3 py-1.5 text-sm ${viewMode === 'table' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'}`}
        >
          Table
        </button>
        <button
          type="button"
          onClick={() => setViewMode('map')}
          className={`rounded px-3 py-1.5 text-sm ${viewMode === 'map' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'}`}
        >
          Map
        </button>
      </div>

      {viewMode === 'map' ? (
        <StoresMap stores={stores} />
      ) : loading ? (
        <p className="mt-4 text-gray-500">Loading...</p>
      ) : stores.length === 0 ? (
        <p className="mt-4 text-gray-500">No stores found. Add your first store to get started.</p>
      ) : (
        <table className="mt-4 w-full">
          <thead>
            <tr className="border-b text-left text-sm text-gray-500">
              <th className="pb-2">Name</th>
              <th className="pb-2">Address</th>
              <th className="pb-2">Tags</th>
              <th className="pb-2">Created</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store.id} className="border-b">
                <td className="py-3">
                  <a href={`/stores/${store.id}`} className="text-blue-600 hover:underline">
                    {store.name}
                  </a>
                </td>
                <td className="py-3 text-sm text-gray-600">{store.address}</td>
                <td className="py-3">
                  {(store.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="mr-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </td>
                <td className="py-3 text-sm text-gray-500">
                  {new Date(store.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(store.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
