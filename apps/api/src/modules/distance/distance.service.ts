import type { TravelMode } from '@atlas/shared';
import { ApiError } from '../../utils/error.ts';

const VALHALLA_TIMEOUT_MS = 3000;
const VALHALLA_BASE_URL = process.env.VALHALLA_URL ?? 'http://localhost:8002';

const MODE_MAP: Record<TravelMode, string> = {
  car: 'auto',
  bike: 'bicycle',
  foot: 'pedestrian',
  truck: 'truck',
  motorcycle: 'motorcycle',
};

interface ValhallaManeuver {
  instruction: string;
  length: number;
  time: number;
  begin_street_names?: string[];
  street_names?: string[];
}

interface ValhallaLeg {
  shape: string;
  summary: { length: number; time: number };
  maneuvers: ValhallaManeuver[];
}

interface ValhallaRouteResponse {
  trip: {
    legs: ValhallaLeg[];
    summary: { length: number; time: number };
    locations: { lat: number; lon: number }[];
  };
}

interface ValhallaMatrixResponse {
  sources_to_targets: Array<Array<{ distance: number; time: number } | null>>;
}

interface ValhallaIsochroneResponse {
  features: Array<{
    type: string;
    properties: { time: number; contour: number };
    geometry: {
      type: string;
      coordinates: Array<[number, number]>;
    };
  }>;
}

async function valhallaFetch<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VALHALLA_TIMEOUT_MS);

  try {
    const response = await fetch(`${VALHALLA_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ApiError(503, 'VALHALLA_ERROR', `Valhalla returned status ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new ApiError(504, 'VALHALLA_TIMEOUT', 'Routing service request timed out');
    }
    throw new ApiError(503, 'VALHALLA_UNAVAILABLE', 'Routing service is temporarily unavailable');
  } finally {
    clearTimeout(timeout);
  }
}

export async function getRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: TravelMode
) {
  const body = {
    locations: [
      { lat: origin.lat, lon: origin.lng },
      { lat: destination.lat, lon: destination.lng },
    ],
    costing: MODE_MAP[mode],
    directions_options: { units: 'kilometers' },
  };

  const data = await valhallaFetch<ValhallaRouteResponse>('/route', body);

  const legs = data.trip.legs.map((leg) => ({
    distance: Math.round(leg.summary.length * 1000),
    duration: Math.round(leg.summary.time),
    steps: leg.maneuvers.map((m) => ({
      instruction: m.instruction,
      distance: Math.round(m.length * 1000),
      duration: Math.round(m.time),
      name: m.street_names?.[0] ?? m.begin_street_names?.[0] ?? '',
    })),
    geometry: leg.shape,
  }));

  return {
    origin,
    destination,
    mode,
    distance: Math.round(data.trip.summary.length * 1000),
    duration: Math.round(data.trip.summary.time),
    legs,
  };
}

export async function getMatrix(
  origins: Array<{ lat: number; lng: number }>,
  destinations: Array<{ lat: number; lng: number }>,
  mode: TravelMode
) {
  const body = {
    sources: origins.map((o) => ({ lat: o.lat, lon: o.lng })),
    targets: destinations.map((d) => ({ lat: d.lat, lon: d.lng })),
    costing: MODE_MAP[mode],
  };

  const data = await valhallaFetch<ValhallaMatrixResponse>('/sources_to_targets', body);

  const distances: number[][] = [];
  const durations: number[][] = [];

  for (const row of data.sources_to_targets) {
    const distRow: number[] = [];
    const durRow: number[] = [];
    for (const entry of row) {
      if (entry) {
        distRow.push(Math.round(entry.distance));
        durRow.push(Math.round(entry.time));
      } else {
        distRow.push(-1);
        durRow.push(-1);
      }
    }
    distances.push(distRow);
    durations.push(durRow);
  }

  return { origins, destinations, mode, distances, durations };
}

export async function getIsochrone(
  origin: { lat: number; lng: number },
  mode: TravelMode,
  ranges: number[]
) {
  const contours = ranges.map((r) => ({ time: r }));

  const body = {
    locations: [{ lat: origin.lat, lon: origin.lng }],
    costing: MODE_MAP[mode],
    contours,
    polygons: true,
    denoise: 0.3,
    generalize: 200,
  };

  const data = await valhallaFetch<ValhallaIsochroneResponse>('/isochrone', body);

  const contourResults = data.features.map((f) => ({
    time: f.properties.time,
    geometry: JSON.stringify({
      type: f.geometry.type,
      coordinates: f.geometry.coordinates,
    }),
  }));

  contourResults.sort((a, b) => a.time - b.time);

  return {
    origin,
    mode,
    contours: contourResults,
  };
}
