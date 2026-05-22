'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  created_at: string;
  revoked_at: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const data = await apiFetch<{ data: ApiKey[] }>('/v1/auth/keys');
      setKeys(data.data ?? []);
    } catch {
      // not authenticated or endpoint not ready
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await apiFetch<{ data: { key: string; id: string } }>('/v1/auth/keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName, scopes: ['*'] }),
      });
      setNewKeyValue(res.data.key);
      setNewKeyName('');
      setShowCreate(false);
      loadKeys();
    } catch {
      // handle error
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Are you sure you want to revoke this key?')) return;
    try {
      await apiFetch(`/v1/auth/keys/${id}`, { method: 'DELETE' });
      loadKeys();
    } catch {
      // handle error
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Create Key
        </button>
      </div>

      {newKeyValue && (
        <div className="mt-4 rounded border border-green-300 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">
            New API key created. Copy it now — it won&apos;t be shown again:
          </p>
          <code className="mt-2 block break-all rounded bg-green-100 p-2 text-sm">
            {newKeyValue}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(newKeyValue);
            }}
            className="mt-2 text-sm text-green-700 underline"
          >
            Copy to clipboard
          </button>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="mt-4 space-y-3 rounded border p-4">
          <input
            type="text"
            placeholder="Key name"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded border px-4 py-2 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="mt-4 text-gray-500">Loading...</p>
      ) : keys.length === 0 ? (
        <p className="mt-4 text-gray-500">No API keys yet. Create one to get started.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between rounded border p-4">
              <div>
                <p className="font-medium">{key.name}</p>
                <p className="text-sm text-gray-500">
                  Scopes: {key.scopes.join(', ')} | Created:{' '}
                  {new Date(key.created_at).toLocaleDateString()}
                </p>
              </div>
              {key.revoked_at ? (
                <span className="text-sm text-red-600">Revoked</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRevoke(key.id)}
                  className="rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
