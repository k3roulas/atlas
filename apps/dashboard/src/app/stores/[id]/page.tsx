'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

interface Store {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const loadStore = useCallback(async () => {
    try {
      const data = await apiFetch<{ data: Store }>(`/v1/stores/${params.id}`);
      setStore(data.data);
      setName(data.data.name);
      setAddress(data.data.address);
    } catch {
      // store not found
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch(`/v1/stores/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, address }),
      });
      setEditing(false);
      loadStore();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!store) return <p>Store not found.</p>;

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push('/stores')}
        className="text-sm text-blue-600 hover:underline"
      >
        &larr; Back to stores
      </button>

      {editing ? (
        <form onSubmit={handleUpdate} className="mt-4 max-w-lg space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label htmlFor="store-name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="store-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="store-address" className="block text-sm font-medium">
              Address
            </label>
            <input
              id="store-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{store.name}</h1>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Edit
            </button>
          </div>
          <dl className="mt-4 space-y-2">
            <div>
              <dt className="text-sm text-gray-500">Address</dt>
              <dd>{store.address}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Location</dt>
              <dd>
                {store.location.lat}, {store.location.lng}
              </dd>
            </div>
            {store.tags && store.tags.length > 0 && (
              <div>
                <dt className="text-sm text-gray-500">Tags</dt>
                <dd>
                  {store.tags.map((tag) => (
                    <span
                      key={tag}
                      className="mr-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500">Created</dt>
              <dd>{new Date(store.created_at).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
