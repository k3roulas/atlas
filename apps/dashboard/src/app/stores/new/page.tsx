'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AddressAutocomplete } from '@/lib/address-autocomplete';
import { apiFetch } from '@/lib/api-client';

export default function NewStorePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      await apiFetch('/v1/stores', {
        method: 'POST',
        body: JSON.stringify({
          name,
          address,
          lat: Number.parseFloat(lat),
          lng: Number.parseFloat(lng),
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      router.push('/stores');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create store');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Add Store</h1>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-4 max-w-lg space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="address" className="block text-sm font-medium">
            Address
          </label>
          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            onSelect={(result) => {
              setAddress(result.name || result.address);
              setLat(String(result.location.lat));
              setLng(String(result.location.lng));
            }}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="lat" className="block text-sm font-medium">
              Latitude
            </label>
            <input
              id="lat"
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="lng" className="block text-sm font-medium">
              Longitude
            </label>
            <input
              id="lng"
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label htmlFor="tags" className="block text-sm font-medium">
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="cafe, restaurant"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Create Store
          </button>
          <button
            type="button"
            onClick={() => router.push('/stores')}
            className="rounded border px-4 py-2 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
