import { type NextRequest, NextResponse } from 'next/server';

const PHOTON_URL = process.env.PHOTON_URL ?? 'http://localhost:2322';

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
  osm_value?: string;
  type?: string;
}

interface PhotonFeature {
  type: string;
  geometry: { type: string; coordinates: [number, number] };
  properties: PhotonProperties;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q')?.trim().slice(0, 200);
  if (!query || query.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const limit = searchParams.get('limit') ?? '5';
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  const url = new URL(`${PHOTON_URL}/api/`);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', limit);
  if (lat && lng) {
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lng);
    url.searchParams.set('location_bias_scale', '0.2');
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return NextResponse.json({ data: [] });

    const body = (await res.json()) as { features: PhotonFeature[] };
    const data = body.features.map((f) => {
      const p = f.properties;
      const [lng, lat] = f.geometry.coordinates;
      return {
        name: p.name ?? '',
        address: [p.street, p.city, p.country].filter(Boolean).join(', '),
        location: { lat, lng },
      };
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
