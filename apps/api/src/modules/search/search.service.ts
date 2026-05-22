import type { LocalityResult, ReverseGeocodeResult } from '@atlas/shared';
import { ApiError } from '../../utils/error.ts';

const PHOTON_TIMEOUT_MS = 2000;
const PHOTON_BASE_URL = process.env.PHOTON_URL ?? 'http://localhost:2322';

interface PhotonProperties {
  osm_id?: number;
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  street?: string;
  housenumber?: string;
  osm_type?: string;
  osm_key?: string;
  osm_value?: string;
  type?: string;
  distance?: number;
}

interface PhotonFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: PhotonProperties;
}

interface PhotonResponse {
  features: PhotonFeature[];
}

function normalizePhotonFeature(feature: PhotonFeature): LocalityResult {
  const props = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;

  return {
    id: `${props.osm_type ?? ''}${props.osm_id ?? ''}`,
    name: props.name ?? '',
    address: {
      city: props.city,
      state: props.state,
      country: props.country,
      postcode: props.postcode,
      street: props.street,
      house_number: props.housenumber,
    },
    type: props.osm_value ?? props.type ?? '',
    location: { lat, lng },
  };
}

function normalizeReverseFeature(feature: PhotonFeature): ReverseGeocodeResult {
  const props = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;

  return {
    id: `${props.osm_type ?? ''}${props.osm_id ?? ''}`,
    name: props.name ?? '',
    address: {
      city: props.city,
      state: props.state,
      country: props.country,
      postcode: props.postcode,
      street: props.street,
      house_number: props.housenumber,
    },
    type: props.osm_value ?? props.type ?? '',
    location: { lat, lng },
    distance: props.distance ?? 0,
  };
}

function sanitizeQuery(query: string): string {
  return query
    .replace(/[<>{}[\]\\^~`!@#$%*()+=|/]/g, '')
    .slice(0, 200)
    .trim();
}

async function photonFetch(url: string): Promise<PhotonResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PHOTON_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new ApiError(503, 'PHOTON_ERROR', `Photon returned status ${response.status}`);
    }
    return (await response.json()) as PhotonResponse;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === 'AbortError') {
      return { features: [] };
    }
    throw new ApiError(503, 'PHOTON_UNAVAILABLE', 'Geocoding service is temporarily unavailable');
  } finally {
    clearTimeout(timeout);
  }
}

export async function autocomplete(params: {
  query: string;
  lat?: number;
  lng?: number;
  limit?: number;
  lang?: string;
}): Promise<LocalityResult[]> {
  const q = sanitizeQuery(params.query);
  if (q.length < 2) return [];

  const url = new URL(`${PHOTON_BASE_URL}/api/`);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(params.limit ?? 5));
  if (params.lat != null && params.lng != null) {
    url.searchParams.set('lat', String(params.lat));
    url.searchParams.set('lon', String(params.lng));
    url.searchParams.set('location_bias_scale', '0.2');
  }
  if (params.lang) {
    url.searchParams.set('lang', params.lang);
  }

  const data = await photonFetch(url.toString());
  return data.features.map(normalizePhotonFeature);
}

export async function geocode(params: {
  address: string;
  limit?: number;
  lang?: string;
}): Promise<LocalityResult[]> {
  const q = sanitizeQuery(params.address);
  if (q.length < 2) return [];

  const url = new URL(`${PHOTON_BASE_URL}/api/`);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(params.limit ?? 1));
  if (params.lang) {
    url.searchParams.set('lang', params.lang);
  }

  const data = await photonFetch(url.toString());
  return data.features.map(normalizePhotonFeature);
}

export async function reverseGeocode(params: {
  lat: number;
  lng: number;
  limit?: number;
  lang?: string;
}): Promise<ReverseGeocodeResult[]> {
  const url = new URL(`${PHOTON_BASE_URL}/reverse/`);
  url.searchParams.set('lat', String(params.lat));
  url.searchParams.set('lon', String(params.lng));
  url.searchParams.set('limit', String(params.limit ?? 1));
  if (params.lang) {
    url.searchParams.set('lang', params.lang);
  }

  const data = await photonFetch(url.toString());
  return data.features.map(normalizeReverseFeature);
}
