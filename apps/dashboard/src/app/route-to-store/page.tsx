'use client';

import { useState } from 'react';
import { RouteMap } from '@/components/route-map';
import { apiFetch } from '@/lib/api-client';

interface Store {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  distance?: number;
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  name: string;
}

function parseCoord(s: string): { lat: number; lng: number } | null {
  const parts = s.split(',').map((p) => Number(p.trim()));
  if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
    return { lat: parts[0], lng: parts[1] };
  }
  return null;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export default function RouteToStorePage() {
  const [originInput, setOriginInput] = useState('48.8566,2.3522');
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>({
    lat: 48.8566,
    lng: 2.3522,
  });

  const [storeQuery, setStoreQuery] = useState('');
  const [storeResults, setStoreResults] = useState<Store[]>([]);
  const [storeSearching, setStoreSearching] = useState(false);

  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [mode, setMode] = useState('car');

  const [routeResult, setRouteResult] = useState<{
    distance: number;
    duration: number;
    legs: Array<{
      steps: RouteStep[];
      geometry: string;
    }>;
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleUseMyLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOrigin(coord);
        setOriginInput(`${coord.lat.toFixed(4)},${coord.lng.toFixed(4)}`);
        setError(null);
      },
      () => setError('Unable to get your location. Check browser permissions.')
    );
  }

  function handleOriginChange() {
    const coord = parseCoord(originInput);
    if (coord) {
      setOrigin(coord);
      setError(null);
    }
  }

  async function handleStoreSearch() {
    if (!storeQuery.trim()) return;
    setStoreSearching(true);
    setSelectedStore(null);
    setRouteResult(null);
    try {
      const params: Record<string, string> = { query: storeQuery, limit: '10' };
      if (origin) {
        params.lat = String(origin.lat);
        params.lng = String(origin.lng);
        params.radius = '50000';
      }
      const data = await apiFetch<{ data: Store[] }>('/v1/stores/search', { params });
      setStoreResults(data.data ?? []);
    } catch {
      setStoreResults([]);
    } finally {
      setStoreSearching(false);
    }
  }

  function handleSelectStore(store: Store) {
    setSelectedStore(store);
    setRouteResult(null);
    setError(null);
  }

  async function handleRoute() {
    if (!origin || !selectedStore) return;

    setRouteLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{
        data: {
          distance: number;
          duration: number;
          legs: Array<{
            distance: number;
            duration: number;
            steps: RouteStep[];
            geometry: string;
          }>;
        };
      }>('/v1/distance/route', {
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${selectedStore.location.lat},${selectedStore.location.lng}`,
          mode,
        },
      });

      setRouteResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Route calculation failed');
    } finally {
      setRouteLoading(false);
    }
  }

  const routeGeometry = routeResult?.legs[0]?.geometry ?? null;
  const destination = selectedStore?.location ?? null;

  return (
    <div>
      <h1 className="text-2xl font-bold">Route to Store</h1>
      <p className="mt-1 text-sm text-gray-500">Search your stores and get directions to them.</p>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          {/* Origin */}
          <div className="space-y-3">
            <div>
              <label htmlFor="origin" className="block text-sm font-medium text-gray-700">
                Your location (lat,lng)
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="origin"
                  type="text"
                  value={originInput}
                  onChange={(e) => setOriginInput(e.target.value)}
                  onBlur={handleOriginChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleOriginChange()}
                  className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="48.8566,2.3522"
                />
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  className="whitespace-nowrap rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Use my location
                </button>
              </div>
            </div>

            {/* Store search */}
            <div>
              <label htmlFor="store-search" className="block text-sm font-medium text-gray-700">
                Search stores
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="store-search"
                  type="text"
                  value={storeQuery}
                  onChange={(e) => setStoreQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStoreSearch()}
                  className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Store name or address..."
                />
                <button
                  type="button"
                  onClick={handleStoreSearch}
                  disabled={storeSearching}
                  className="whitespace-nowrap rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  {storeSearching ? '...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Store results */}
            {storeResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded border border-gray-200">
                {storeResults.map((store) => (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => handleSelectStore(store)}
                    className={`w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-0 ${
                      selectedStore?.id === store.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{store.name}</div>
                    <div className="text-gray-500">
                      {store.address}
                      {store.distance != null && (
                        <span className="ml-2 text-xs">
                          ({formatDistance(Math.round(store.distance))} away)
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected store + mode */}
            {selectedStore && (
              <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2">
                <div className="text-sm font-medium">Destination: {selectedStore.name}</div>
                <div className="text-xs text-gray-600">{selectedStore.address}</div>
              </div>
            )}

            <div>
              <label htmlFor="mode" className="block text-sm font-medium text-gray-700">
                Travel mode
              </label>
              <select
                id="mode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="foot">Foot</option>
                <option value="truck">Truck</option>
                <option value="motorcycle">Motorcycle</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleRoute}
              disabled={routeLoading || !origin || !selectedStore}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {routeLoading ? 'Calculating...' : 'Get Route'}
            </button>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Route results */}
            {routeResult && (
              <div className="space-y-3">
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Distance:</span>{' '}
                    <strong>{formatDistance(routeResult.distance)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>{' '}
                    <strong>{formatDuration(routeResult.duration)}</strong>
                  </div>
                </div>

                {routeResult.legs.some((leg) => leg.steps.length > 0) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Directions</h3>
                    <ol className="mt-1 space-y-1">
                      {routeResult.legs.map((leg) =>
                        leg.steps.map((step) => (
                          <li key={step.instruction} className="text-sm text-gray-600">
                            <span className="text-gray-400">&#x2022;</span> {step.instruction}
                            {step.name && <span className="text-gray-400"> on {step.name}</span>}
                            <span className="ml-2 text-xs text-gray-400">
                              ({formatDistance(step.distance)})
                            </span>
                          </li>
                        ))
                      )}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div>
          <RouteMap routeGeometry={routeGeometry} origin={origin} destination={destination} />
        </div>
      </div>
    </div>
  );
}
