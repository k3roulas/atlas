'use client';

import { useState } from 'react';
import { RouteMap } from '@/components/route-map';
import { apiFetch } from '@/lib/api-client';

type Tab = 'route' | 'isochrone';

export default function RoutingPage() {
  const [tab, setTab] = useState<Tab>('route');

  // Route state
  const [originInput, setOriginInput] = useState('48.8566,2.3522');
  const [destInput, setDestInput] = useState('45.7640,4.8357');
  const [routeMode, setRouteMode] = useState('car');
  const [routeResult, setRouteResult] = useState<{
    data: {
      distance: number;
      duration: number;
      legs: Array<{
        distance: number;
        duration: number;
        steps: Array<{ instruction: string; distance: number; duration: number; name: string }>;
      }>;
    };
    geometry: string | null;
    origin: { lat: number; lng: number } | null;
    destination: { lat: number; lng: number } | null;
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Isochrone state
  const [isoOrigin, setIsoOrigin] = useState('48.8566,2.3522');
  const [isoMode, setIsoMode] = useState('car');
  const [isoRange, setIsoRange] = useState('15,30');
  const [isoResult, setIsoResult] = useState<{
    contours: Array<{ time: number; geometry: string }>;
    origin: { lat: number; lng: number } | null;
  } | null>(null);
  const [isoLoading, setIsoLoading] = useState(false);

  function parseCoord(s: string): { lat: number; lng: number } | null {
    const parts = s.split(',').map((p) => Number(p.trim()));
    if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
    return null;
  }

  async function handleRoute() {
    const origin = parseCoord(originInput);
    const dest = parseCoord(destInput);
    if (!origin || !dest) return;

    setRouteLoading(true);
    try {
      const data = await apiFetch<{
        data: {
          distance: number;
          duration: number;
          legs: Array<{
            distance: number;
            duration: number;
            steps: Array<{ instruction: string; distance: number; duration: number; name: string }>;
            geometry: string;
          }>;
        };
      }>('/v1/distance/route', {
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${dest.lat},${dest.lng}`,
          mode: routeMode,
        },
      });

      const geometry = data.data.legs[0]?.geometry ?? null;
      setRouteResult({
        data: data.data,
        geometry,
        origin,
        destination: dest,
      });
    } catch {
      // handle error
    } finally {
      setRouteLoading(false);
    }
  }

  async function handleIsochrone() {
    const origin = parseCoord(isoOrigin);
    if (!origin) return;

    setIsoLoading(true);
    try {
      const data = await apiFetch<{
        data: {
          contours: Array<{ time: number; geometry: string }>;
        };
      }>('/v1/distance/isochrone', {
        params: {
          origin: `${origin.lat},${origin.lng}`,
          mode: isoMode,
          range: isoRange,
        },
      });

      setIsoResult({
        contours: data.data.contours,
        origin,
      });
    } catch {
      // handle error
    } finally {
      setIsoLoading(false);
    }
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

  return (
    <div>
      <h1 className="text-2xl font-bold">Routing</h1>

      <div className="mt-4 flex gap-1">
        <button
          type="button"
          onClick={() => setTab('route')}
          className={`rounded px-3 py-1.5 text-sm ${tab === 'route' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'}`}
        >
          Route
        </button>
        <button
          type="button"
          onClick={() => setTab('isochrone')}
          className={`rounded px-3 py-1.5 text-sm ${tab === 'isochrone' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'}`}
        >
          Isochrone
        </button>
      </div>

      {tab === 'route' ? (
        <div className="mt-4 grid grid-cols-2 gap-6">
          <div>
            <div className="space-y-3">
              <div>
                <label htmlFor="route-origin" className="block text-sm font-medium text-gray-700">
                  Origin (lat,lng)
                </label>
                <input
                  id="route-origin"
                  type="text"
                  value={originInput}
                  onChange={(e) => setOriginInput(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="48.8566,2.3522"
                />
              </div>
              <div>
                <label htmlFor="route-dest" className="block text-sm font-medium text-gray-700">
                  Destination (lat,lng)
                </label>
                <input
                  id="route-dest"
                  type="text"
                  value={destInput}
                  onChange={(e) => setDestInput(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="45.7640,4.8357"
                />
              </div>
              <div>
                <label htmlFor="route-mode" className="block text-sm font-medium text-gray-700">
                  Mode
                </label>
                <select
                  id="route-mode"
                  value={routeMode}
                  onChange={(e) => setRouteMode(e.target.value)}
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
                disabled={routeLoading}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {routeLoading ? 'Calculating...' : 'Get Route'}
              </button>
            </div>

            {routeResult && (
              <div className="mt-4">
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Distance:</span>{' '}
                    <strong>{formatDistance(routeResult.data.distance)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>{' '}
                    <strong>{formatDuration(routeResult.data.duration)}</strong>
                  </div>
                </div>

                {routeResult.data.legs.some((leg) => leg.steps.length > 0) && (
                  <div className="mt-3">
                    <h3 className="text-sm font-medium text-gray-700">Directions</h3>
                    <ol className="mt-1 space-y-1">
                      {routeResult.data.legs.map((leg) =>
                        leg.steps.map((step) => (
                          <li key={step.instruction} className="text-sm text-gray-600">
                            <span className="text-gray-400">.</span> {step.instruction}
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

          <div>
            <RouteMap
              routeGeometry={routeResult?.geometry}
              origin={routeResult?.origin}
              destination={routeResult?.destination}
            />
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label htmlFor="iso-origin" className="block text-sm font-medium text-gray-700">
                Origin (lat,lng)
              </label>
              <input
                id="iso-origin"
                type="text"
                value={isoOrigin}
                onChange={(e) => setIsoOrigin(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="48.8566,2.3522"
              />
            </div>
            <div>
              <label htmlFor="iso-mode" className="block text-sm font-medium text-gray-700">
                Mode
              </label>
              <select
                id="iso-mode"
                value={isoMode}
                onChange={(e) => setIsoMode(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="foot">Foot</option>
              </select>
            </div>
            <div>
              <label htmlFor="iso-range" className="block text-sm font-medium text-gray-700">
                Range (minutes, comma-separated)
              </label>
              <input
                id="iso-range"
                type="text"
                value={isoRange}
                onChange={(e) => setIsoRange(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="15,30"
              />
            </div>
            <button
              type="button"
              onClick={handleIsochrone}
              disabled={isoLoading}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isoLoading ? 'Generating...' : 'Generate Isochrone'}
            </button>

            {isoResult && (
              <div className="mt-2 text-sm text-gray-600">
                {isoResult.contours.length} contour(s) generated:{' '}
                {isoResult.contours.map((c) => `${c.time} min`).join(', ')}
              </div>
            )}
          </div>

          <div>
            <RouteMap isochroneContours={isoResult?.contours} origin={isoResult?.origin} />
          </div>
        </div>
      )}
    </div>
  );
}
